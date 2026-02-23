import { randomUUID } from "node:crypto";
import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { fkUserId, type ApiActor } from "./actor";

export type IntakeAudience = "INDIVIDUAL" | "ORGANIZATION" | "TEAM" | "ENTERPRISE";
export type IntakeStatus = "NEW" | "TRIAGED" | "QUALIFIED" | "BOOKED" | "LOST";

export interface IntakeRequestRecord {
  id: string;
  offer_slug: string | null;
  audience: IntakeAudience;
  organization_name: string | null;
  contact_name: string;
  contact_email: string;
  goals: string;
  timeline: string | null;
  constraints: string | null;
  status: IntakeStatus;
  owner_user_id: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface IntakeStatusHistoryRecord {
  id: string;
  intake_request_id: string;
  from_status: IntakeStatus | null;
  to_status: IntakeStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface IntakeRequestWithHistory extends IntakeRequestRecord {
  history: IntakeStatusHistoryRecord[];
}

export class InvalidIntakeInputError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid intake input: ${reason}`);
    this.name = "InvalidIntakeInputError";
  }
}

export class IntakeRequestNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Intake request not found: ${id}`);
    this.name = "IntakeRequestNotFoundError";
  }
}

const ALLOWED_AUDIENCE: IntakeAudience[] = ["INDIVIDUAL", "ORGANIZATION", "TEAM", "ENTERPRISE"];
const ALLOWED_STATUS: IntakeStatus[] = ["NEW", "TRIAGED", "QUALIFIED", "BOOKED", "LOST"];

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const assertCreateInput = (input: {
  audience?: string;
  contactName?: string;
  contactEmail?: string;
  goals?: string;
  organizationName?: string;
  timeline?: string;
  constraints?: string;
}): void => {
  if (!input.audience || !ALLOWED_AUDIENCE.includes(input.audience as IntakeAudience)) {
    throw new InvalidIntakeInputError("audience_invalid");
  }

  if (!input.contactName || input.contactName.trim().length === 0) {
    throw new InvalidIntakeInputError("contact_name_required");
  }

  if (!input.contactEmail || input.contactEmail.trim().length === 0) {
    throw new InvalidIntakeInputError("contact_email_required");
  }

  if (!input.goals || input.goals.trim().length === 0) {
    throw new InvalidIntakeInputError("goals_required");
  }

  try {
    const parsed = new URL(`mailto:${normalizeEmail(input.contactEmail)}`);
    if (!parsed.href.startsWith("mailto:")) {
      throw new Error("invalid");
    }
  } catch {
    throw new InvalidIntakeInputError("contact_email_invalid");
  }

  if (input.audience === "ORGANIZATION" || input.audience === "TEAM" || input.audience === "ENTERPRISE") {
    if (!input.organizationName || input.organizationName.trim().length === 0) {
      throw new InvalidIntakeInputError("organization_name_required");
    }

    if (!input.timeline || input.timeline.trim().length === 0) {
      throw new InvalidIntakeInputError("timeline_required");
    }

    if (!input.constraints || input.constraints.trim().length === 0) {
      throw new InvalidIntakeInputError("constraints_required");
    }
  }
};

const assertStatus = (status: string): IntakeStatus => {
  if (!ALLOWED_STATUS.includes(status as IntakeStatus)) {
    throw new InvalidIntakeInputError("status_invalid");
  }
  return status as IntakeStatus;
};

const nextStepForStatus = (status: IntakeStatus): string => {
  if (status === "NEW") {
    return "Request received. Our team will triage and contact you with next steps.";
  }
  if (status === "TRIAGED") {
    return "Triage complete. We are confirming fit and proposing options.";
  }
  if (status === "QUALIFIED") {
    return "Qualified. Booking options will be shared shortly.";
  }
  if (status === "BOOKED") {
    return "Booked. Check your email for logistics and onboarding details.";
  }
  return "Closed as not moving forward. You can submit a new request anytime.";
};

export const createIntakeRequest = (input: {
  offerSlug?: string;
  audience: IntakeAudience;
  organizationName?: string;
  contactName: string;
  contactEmail: string;
  goals: string;
  timeline?: string;
  constraints?: string;
  requestId: string;
}): IntakeRequestRecord & { next_step: string } => {
  assertCreateInput(input);

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();
    const id = randomUUID();
    const status: IntakeStatus = "NEW";

    db.prepare(
      `
INSERT INTO intake_requests (
  id, offer_slug, audience, organization_name, contact_name, contact_email, goals, timeline, constraints, status, owner_user_id, priority, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
`,
    ).run(
      id,
      input.offerSlug?.trim() || null,
      input.audience,
      input.audience === "ORGANIZATION" ? input.organizationName?.trim() || null : null,
      input.contactName.trim(),
      normalizeEmail(input.contactEmail),
      input.goals.trim(),
      input.timeline?.trim() || null,
      input.constraints?.trim() || null,
      status,
      50,
      now,
      now,
    );

    db.prepare(
      `
INSERT INTO intake_status_history (
  id, intake_request_id, from_status, to_status, note, changed_by, changed_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
`,
    ).run(randomUUID(), id, null, status, "Request submitted", null, now);

    appendAuditLog(db, {
      actorType: "SERVICE",
      actorId: null,
      action: "api.intake.create",
      targetType: "intake_request",
      requestId: input.requestId,
      metadata: {
        intakeRequestId: id,
        audience: input.audience,
        offerSlug: input.offerSlug ?? null,
      },
    });

    return {
      id,
      offer_slug: input.offerSlug?.trim() || null,
      audience: input.audience,
      organization_name: input.audience === "ORGANIZATION" ? input.organizationName?.trim() || null : null,
      contact_name: input.contactName.trim(),
      contact_email: normalizeEmail(input.contactEmail),
      goals: input.goals.trim(),
      timeline: input.timeline?.trim() || null,
      constraints: input.constraints?.trim() || null,
      status,
      owner_user_id: null,
      priority: 50,
      created_at: now,
      updated_at: now,
      next_step: nextStepForStatus(status),
    };
  } finally {
    db.close();
  }
};

export const listIntakeRequests = (filters: {
  status?: string;
  audience?: string;
  ownerUserId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      where.push("status = ?");
      params.push(assertStatus(filters.status.toUpperCase()));
    }

    if (filters.audience) {
      if (!ALLOWED_AUDIENCE.includes(filters.audience.toUpperCase() as IntakeAudience)) {
        throw new InvalidIntakeInputError("audience_invalid");
      }
      where.push("audience = ?");
      params.push(filters.audience.toUpperCase());
    }

    if (filters.ownerUserId === "unassigned") {
      where.push("owner_user_id IS NULL");
    } else if (filters.ownerUserId && filters.ownerUserId.trim().length > 0) {
      where.push("owner_user_id = ?");
      params.push(filters.ownerUserId.trim());
    }

    if (filters.q && filters.q.trim().length > 0) {
      where.push("(LOWER(contact_name) LIKE ? OR LOWER(contact_email) LIKE ? OR LOWER(goals) LIKE ?)");
      const needle = `%${filters.q.trim().toLowerCase()}%`;
      params.push(needle, needle, needle);
    }

    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
SELECT id, offer_slug, audience, organization_name, contact_name, contact_email, goals, timeline, constraints, status, owner_user_id, priority, created_at, updated_at
FROM intake_requests
${whereSql}
ORDER BY priority DESC, created_at DESC
LIMIT ? OFFSET ?
`,
      )
      .all(...params, limit, offset) as IntakeRequestRecord[];

    return {
      count: rows.length,
      limit,
      offset,
      items: rows.map((item) => ({
        ...item,
        next_step: nextStepForStatus(item.status),
      })),
    };
  } finally {
    db.close();
  }
};

export const getIntakeRequestById = (id: string): IntakeRequestWithHistory & { next_step: string } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const found = db
      .prepare(
        "SELECT id, offer_slug, audience, organization_name, contact_name, contact_email, goals, timeline, constraints, status, owner_user_id, priority, created_at, updated_at FROM intake_requests WHERE id = ?",
      )
      .get(id) as IntakeRequestRecord | undefined;

    if (!found) {
      throw new IntakeRequestNotFoundError(id);
    }

    const history = db
      .prepare(
        "SELECT id, intake_request_id, from_status, to_status, note, changed_by, changed_at FROM intake_status_history WHERE intake_request_id = ? ORDER BY changed_at ASC",
      )
      .all(id) as IntakeStatusHistoryRecord[];

    const deal = db
      .prepare("SELECT id as deal_id, status as deal_status FROM deals WHERE intake_id = ?")
      .get(id) as { deal_id: string; deal_status: string } | undefined;

    return {
      ...found,
      history,
      next_step: nextStepForStatus(found.status),
      ...(deal ? deal : {}),
    };
  } finally {
    db.close();
  }
};

export const updateIntakeRequest = (
  id: string,
  input: {
    status?: string;
    ownerUserId?: string | null;
    priority?: number;
    note?: string;
    actor: ApiActor;
    requestId: string;
  },
): IntakeRequestWithHistory & { next_step: string } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const found = db
      .prepare(
        "SELECT id, offer_slug, audience, organization_name, contact_name, contact_email, goals, timeline, constraints, status, owner_user_id, priority, created_at, updated_at FROM intake_requests WHERE id = ?",
      )
      .get(id) as IntakeRequestRecord | undefined;

    if (!found) {
      throw new IntakeRequestNotFoundError(id);
    }

    const nextStatus = input.status ? assertStatus(input.status.toUpperCase()) : found.status;
    if (input.priority !== undefined && !Number.isInteger(input.priority)) {
      throw new InvalidIntakeInputError("priority_invalid");
    }

    const nextOwner = input.ownerUserId === undefined ? found.owner_user_id : input.ownerUserId;
    const nextPriority = input.priority ?? found.priority;
    const now = new Date().toISOString();

    db.prepare(
      `
UPDATE intake_requests
SET status = ?, owner_user_id = ?, priority = ?, updated_at = ?
WHERE id = ?
`,
    ).run(nextStatus, nextOwner, nextPriority, now, id);

    if (nextStatus !== found.status) {
      const changedBy = fkUserId(input.actor);
      db.prepare(
        `
INSERT INTO intake_status_history (
  id, intake_request_id, from_status, to_status, note, changed_by, changed_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
`,
      ).run(randomUUID(), id, found.status, nextStatus, input.note?.trim() || null, changedBy, now);
    }

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.intake.update",
      targetType: "intake_request",
      requestId: input.requestId,
      metadata: {
        intakeRequestId: id,
        previousStatus: found.status,
        nextStatus,
        ownerUserId: nextOwner,
        priority: nextPriority,
      },
    });

    const history = db
      .prepare(
        "SELECT id, intake_request_id, from_status, to_status, note, changed_by, changed_at FROM intake_status_history WHERE intake_request_id = ? ORDER BY changed_at ASC",
      )
      .all(id) as IntakeStatusHistoryRecord[];

    return {
      ...found,
      status: nextStatus,
      owner_user_id: nextOwner,
      priority: nextPriority,
      updated_at: now,
      history,
      next_step: nextStepForStatus(nextStatus),
    };
  } finally {
    db.close();
  }
};
