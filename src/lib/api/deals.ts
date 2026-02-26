import { randomUUID } from "node:crypto";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import {
  transitionDealStatus as assertDealTransition,
  type DealStatus,
} from "@/core/domain/deal-lifecycle";
import { ensureLedgerEarnedForDeliveredDeal, voidLedgerForRefundedDeal } from "./ledger";
import { fkUserId, type ApiActor } from "./actor";

export type { DealStatus } from "@/core/domain/deal-lifecycle";

export type DealRecord = {
  id: string;
  intake_id: string;
  offer_slug: string | null;
  status: DealStatus;
  referrer_user_id: string | null;
  requested_provider_user_id: string | null;
  provider_user_id: string | null;
  maestro_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DealStatusHistoryRecord = {
  id: string;
  deal_id: string;
  from_status: DealStatus | null;
  to_status: DealStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type DealDetail = DealRecord & {
  history: DealStatusHistoryRecord[];
};

export class DealNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Deal not found: ${id}`);
    this.name = "DealNotFoundError";
  }
}

export class DealIntakeNotFoundError extends Error {
  constructor(public readonly intakeId: string) {
    super(`Intake not found for deal creation: ${intakeId}`);
    this.name = "DealIntakeNotFoundError";
  }
}

export class DealConflictError extends Error {
  constructor(public readonly reason: "already_exists") {
    super(`Deal conflict: ${reason}`);
    this.name = "DealConflictError";
  }
}

export class DealPreconditionError extends Error {
  constructor(
    public readonly reason:
      | "requires_payment"
      | "requires_approval"
      | "requires_assignment"
      | "offer_slug_required"
      | "offer_not_found"
      | "offer_inactive",
  ) {
    super(`Deal precondition failed: ${reason}`);
    this.name = "DealPreconditionError";
  }
}

const normalizeNote = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const ensureDeal = (db: ReturnType<typeof openCliDb>, id: string): DealRecord => {
  const row = db
    .prepare(
      "SELECT id, intake_id, offer_slug, status, referrer_user_id, requested_provider_user_id, provider_user_id, maestro_user_id, created_at, updated_at FROM deals WHERE id = ?",
    )
    .get(id) as DealRecord | undefined;

  if (!row) {
    throw new DealNotFoundError(id);
  }

  return row;
};

const loadHistory = (db: ReturnType<typeof openCliDb>, dealId: string): DealStatusHistoryRecord[] => {
  return db
    .prepare(
      "SELECT id, deal_id, from_status, to_status, note, changed_by, changed_at FROM deal_status_history WHERE deal_id = ? ORDER BY changed_at ASC",
    )
    .all(dealId) as DealStatusHistoryRecord[];
};

const pushHistory = (db: ReturnType<typeof openCliDb>, input: {
  dealId: string;
  fromStatus: DealStatus | null;
  toStatus: DealStatus;
  note?: string | null;
  changedBy?: string | null;
  changedAtIso: string;
}) => {
  db.prepare(
    "INSERT INTO deal_status_history (id, deal_id, from_status, to_status, note, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    randomUUID(),
    input.dealId,
    input.fromStatus,
    input.toStatus,
    normalizeNote(input.note),
    input.changedBy ?? null,
    input.changedAtIso,
  );
};

const referrerForIntake = (db: ReturnType<typeof openCliDb>, intakeId: string): string | null => {
  const row = db
    .prepare(
      `
SELECT rc.user_id as user_id
FROM referral_conversions conv
JOIN referral_codes rc ON rc.id = conv.referral_code_id
WHERE conv.intake_request_id = ? AND conv.conversion_type = 'INTAKE_REQUEST'
ORDER BY conv.created_at DESC
LIMIT 1
`,
    )
    .get(intakeId) as { user_id: string } | undefined;

  return row?.user_id ?? null;
};

export const createDealFromIntake = (input: {
  intakeId: string;
  requestedProviderUserId?: string | null;
  actorId: string;
  requestId: string;
}): DealDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const intake = db
      .prepare("SELECT id, offer_slug FROM intake_requests WHERE id = ?")
      .get(input.intakeId) as { id: string; offer_slug: string | null } | undefined;

    if (!intake) {
      throw new DealIntakeNotFoundError(input.intakeId);
    }

    if (!intake.offer_slug || intake.offer_slug.trim().length === 0) {
      throw new DealPreconditionError("offer_slug_required");
    }

    const offer = db
      .prepare("SELECT slug, status FROM offers WHERE slug = ?")
      .get(intake.offer_slug) as { slug: string; status: "ACTIVE" | "INACTIVE" } | undefined;

    if (!offer) {
      throw new DealPreconditionError("offer_not_found");
    }

    if (offer.status !== "ACTIVE") {
      throw new DealPreconditionError("offer_inactive");
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const status: DealStatus = "QUEUED";

    const referrerUserId = referrerForIntake(db, input.intakeId);

    // Use INSERT and catch the UNIQUE constraint violation rather than a
    // racy SELECT-then-INSERT. The DB enforces `intake_id UNIQUE`.
    try {
      db.prepare(
        `
INSERT INTO deals (
  id, intake_id, offer_slug, status, referrer_user_id, requested_provider_user_id, provider_user_id, maestro_user_id, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
`,
      ).run(
        id,
        input.intakeId,
        intake.offer_slug,
        status,
        referrerUserId,
        input.requestedProviderUserId ?? null,
        now,
        now,
      );
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("UNIQUE constraint failed: deals.intake_id")
      ) {
        throw new DealConflictError("already_exists");
      }
      throw err;
    }

    pushHistory(db, {
      dealId: id,
      fromStatus: null,
      toStatus: status,
      note: "Deal created from intake",
      changedBy: input.actorId,
      changedAtIso: now,
    });

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "api.deal.create",
      targetType: "deal",
      requestId: input.requestId,
      metadata: { dealId: id, intakeId: input.intakeId, referrerUserId },
    });

    const created = ensureDeal(db, id);
    return { ...created, history: loadHistory(db, id) };
  } finally {
    db.close();
  }
};

export const listDealsAdmin = (filters?: {
  status?: DealStatus;
  intakeId?: string;
  limit?: number;
  offset?: number;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      // Type narrowed via DealStatus; no runtime list needed.
      where.push("status = ?");
      params.push(filters.status);
    }

    if (filters?.intakeId) {
      where.push("intake_id = ?");
      params.push(filters.intakeId);
    }

    const limit = Math.min(Math.max(filters?.limit ?? 25, 1), 100);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
SELECT id, intake_id, offer_slug, status, referrer_user_id, requested_provider_user_id, provider_user_id, maestro_user_id, created_at, updated_at
FROM deals
${whereSql}
ORDER BY created_at DESC
LIMIT ? OFFSET ?
`,
      )
      .all(...params, limit, offset) as DealRecord[];

    return {
      count: rows.length,
      limit,
      offset,
      items: rows,
    };
  } finally {
    db.close();
  }
};

export const getDealById = (id: string): DealDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const deal = ensureDeal(db, id);
    return { ...deal, history: loadHistory(db, id) };
  } finally {
    db.close();
  }
};

export const transitionDealStatus = (db: ReturnType<typeof openCliDb>, input: {
  dealId: string;
  toStatus: DealStatus;
  note?: string | null;
  actor: ApiActor;
  requestId: string;
  enforceGate?: boolean;
}): DealDetail => {
  const deal = ensureDeal(db, input.dealId);

  // Domain state-machine guard — validates the transition is structurally legal.
  assertDealTransition(deal.status, input.toStatus);

  if (input.enforceGate) {
    if (input.toStatus === "IN_PROGRESS") {
      if (deal.status !== "PAID") {
        throw new DealPreconditionError("requires_payment");
      }
      if (!deal.provider_user_id || !deal.maestro_user_id) {
        throw new DealPreconditionError("requires_approval");
      }

      const approved = db
        .prepare("SELECT COUNT(1) as count FROM deal_status_history WHERE deal_id = ? AND to_status = 'MAESTRO_APPROVED'")
        .get(input.dealId) as { count: number };

      if (approved.count === 0) {
        throw new DealPreconditionError("requires_approval");
      }
    }
  }

  const now = new Date().toISOString();

  db.prepare("UPDATE deals SET status = ?, updated_at = ? WHERE id = ?").run(input.toStatus, now, input.dealId);

  pushHistory(db, {
    dealId: input.dealId,
    fromStatus: deal.status,
    toStatus: input.toStatus,
    note: input.note,
    changedBy: fkUserId(input.actor),
    changedAtIso: now,
  });

  appendAuditLog(db, {
    actorType: input.actor.type,
    actorId: input.actor.id,
    action: "api.deal.status",
    targetType: "deal",
    requestId: input.requestId,
    metadata: { dealId: input.dealId, from: deal.status, to: input.toStatus },
  });

  if (input.toStatus === "DELIVERED") {
    ensureLedgerEarnedForDeliveredDeal(db, { dealId: input.dealId, actorRequestId: input.requestId });
  }

  if (input.toStatus === "REFUNDED") {
    voidLedgerForRefundedDeal(db, { dealId: input.dealId, actorRequestId: input.requestId });
  }

  return getDealById(input.dealId);
};

export const assignDealAdmin = (input: {
  dealId: string;
  providerUserId: string;
  maestroUserId: string;
  actor: ApiActor;
  requestId: string;
  note?: string | null;
}): DealDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const deal = ensureDeal(db, input.dealId);

    // Enforce state machine invariant. QUEUED → ASSIGNED is the only valid
    // first-time assignment; re-assigning from ASSIGNED is a self-transition (no-op check).
    assertDealTransition(deal.status, "ASSIGNED");

    const now = new Date().toISOString();
    db.prepare(
      "UPDATE deals SET provider_user_id = ?, maestro_user_id = ?, status = 'ASSIGNED', updated_at = ? WHERE id = ?",
    ).run(input.providerUserId, input.maestroUserId, now, input.dealId);

    pushHistory(db, {
      dealId: input.dealId,
      fromStatus: deal.status,
      toStatus: "ASSIGNED",
      note: input.note ?? "Assigned",
      changedBy: fkUserId(input.actor),
      changedAtIso: now,
    });

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.deal.assign",
      targetType: "deal",
      requestId: input.requestId,
      metadata: { dealId: input.dealId, providerUserId: input.providerUserId, maestroUserId: input.maestroUserId },
    });

    return getDealById(input.dealId);
  } finally {
    db.close();
  }
};

export const approveDealAdmin = (input: {
  dealId: string;
  actor: ApiActor;
  requestId: string;
  note?: string | null;
}): DealDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const deal = ensureDeal(db, input.dealId);
    if (!deal.provider_user_id || !deal.maestro_user_id) {
      throw new DealPreconditionError("requires_assignment");
    }

    return transitionDealStatus(db, {
      dealId: input.dealId,
      toStatus: "MAESTRO_APPROVED",
      note: input.note ?? "Maestro approved",
      actor: input.actor,
      requestId: input.requestId,
      enforceGate: false,
    });
  } finally {
    db.close();
  }
};

export const updateDealStatus = (input: {
  dealId: string;
  toStatus: DealStatus;
  actor: ApiActor;
  requestId: string;
  note?: string | null;
}): DealDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    return transitionDealStatus(db, {
      dealId: input.dealId,
      toStatus: input.toStatus,
      note: input.note,
      actor: input.actor,
      requestId: input.requestId,
      enforceGate: true,
    });
  } finally {
    db.close();
  }
};

export const getDealSummaryForIntake = (intakeId: string): { deal_id: string; deal_status: DealStatus } | null => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const row = db
      .prepare("SELECT id as deal_id, status as deal_status FROM deals WHERE intake_id = ?")
      .get(intakeId) as { deal_id: string; deal_status: DealStatus } | undefined;

    return row ?? null;
  } finally {
    db.close();
  }
};
