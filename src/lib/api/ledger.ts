import { randomUUID } from "node:crypto";

import { openCliDb, appendAuditLog } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { Money } from "@/core/domain/money";
import { AFFILIATE_COMMISSION_RATE, PROVIDER_PAYOUT_RATE } from "@/lib/constants/commissions";;
import {
  transitionLedgerStatus,
  type LedgerEntryStatus,
} from "@/core/domain/ledger-lifecycle";

export type LedgerEntryType = "PROVIDER_PAYOUT" | "REFERRER_COMMISSION" | "PLATFORM_REVENUE";
export type { LedgerEntryStatus } from "@/core/domain/ledger-lifecycle";

export type LedgerEntryRecord = {
  id: string;
  deal_id: string;
  entry_type: LedgerEntryType;
  beneficiary_user_id: string | null;
  amount_cents: number;
  currency: string;
  status: LedgerEntryStatus;
  earned_at: string;
  approved_at: string | null;
  paid_at: string | null;
  approved_by_user_id: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

export class LedgerPreconditionError extends Error {
  constructor(public readonly reason: "confirm_required") {
    super(`Ledger precondition failed: ${reason}`);
    this.name = "LedgerPreconditionError";
  }
}

const REFERRER_COMMISSION_RATE = AFFILIATE_COMMISSION_RATE;

export const ensureLedgerEarnedForDeliveredDeal = (db: ReturnType<typeof openCliDb>, input: {
  dealId: string;
  actorRequestId: string;
}): void => {
  const deal = db
    .prepare(
      `
SELECT d.id as deal_id,
       d.offer_slug as offer_slug,
       d.provider_user_id as provider_user_id,
       d.referrer_user_id as referrer_user_id,
       o.price_cents as price_cents,
       o.currency as currency
FROM deals d
JOIN offers o ON o.slug = d.offer_slug
WHERE d.id = ?
`,
    )
    .get(input.dealId) as
    | {
        deal_id: string;
        offer_slug: string;
        provider_user_id: string | null;
        referrer_user_id: string | null;
        price_cents: number | null;
        currency: string;
      }
    | undefined;

  if (!deal) {
    return;
  }

  if (!deal.price_cents || deal.price_cents <= 0) {
    return;
  }

  const gross = Money.cents(deal.price_cents, deal.currency);
  const referrerCommission = deal.referrer_user_id ? gross.multiplyRate(REFERRER_COMMISSION_RATE) : Money.zero(deal.currency);
  const providerPayout = deal.provider_user_id ? gross.multiplyRate(PROVIDER_PAYOUT_RATE) : Money.zero(deal.currency);
  const platformRevenue = gross.subtract(referrerCommission).subtract(providerPayout);

  const now = new Date().toISOString();

  const insert = (args: {
    entryType: LedgerEntryType;
    beneficiaryUserId: string | null;
    amount: Money;
    metadata: Record<string, unknown>;
  }) => {
    if (!args.amount.isPositive()) {
      return;
    }

    db.prepare(
      `
INSERT INTO ledger_entries (
  id,
  deal_id,
  entry_type,
  beneficiary_user_id,
  amount_cents,
  currency,
  status,
  earned_at,
  approved_at,
  paid_at,
  approved_by_user_id,
  metadata_json,
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, 'EARNED', ?, NULL, NULL, NULL, ?, ?, ?)
`,
    ).run(
      randomUUID(),
      input.dealId,
      args.entryType,
      args.beneficiaryUserId,
      args.amount.amountCents,
      args.amount.currency,
      now,
      JSON.stringify(args.metadata),
      now,
      now,
    );
  };

  try {
    db.transaction(() => {
      insert({
        entryType: "PROVIDER_PAYOUT",
        beneficiaryUserId: deal.provider_user_id,
        amount: providerPayout,
        metadata: { basis: "gross", rate: PROVIDER_PAYOUT_RATE },
      });

      insert({
        entryType: "REFERRER_COMMISSION",
        beneficiaryUserId: deal.referrer_user_id,
        amount: referrerCommission,
        metadata: { basis: "gross", rate: REFERRER_COMMISSION_RATE },
      });

      insert({
        entryType: "PLATFORM_REVENUE",
        beneficiaryUserId: null,
        amount: platformRevenue,
        metadata: { basis: "gross", remainder: true },
      });

      appendAuditLog(db, {
        actorType: "SERVICE",
        actorId: null,
        action: "ledger.entries.earned",
        targetType: "ledger",
        requestId: input.actorRequestId,
        metadata: {
          dealId: input.dealId,
          gross: gross.amountCents,
          providerPayout: providerPayout.amountCents,
          referrerCommission: referrerCommission.amountCents,
          platformRevenue: platformRevenue.amountCents,
        },
      });
    })();
  } catch (err: unknown) {
    // UNIQUE constraint on (deal_id, entry_type) — already created by a concurrent request; idempotent.
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return;
    }
    throw err;
  }
};

export const voidLedgerForRefundedDeal = (db: ReturnType<typeof openCliDb>, input: {
  dealId: string;
  actorRequestId: string;
}): void => {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      "UPDATE ledger_entries SET status = 'VOID', updated_at = ? WHERE deal_id = ? AND status IN ('EARNED','APPROVED')",
    )
    .run(now, input.dealId);

  if (result.changes > 0) {
    appendAuditLog(db, {
      actorType: "SERVICE",
      actorId: null,
      action: "ledger.entries.void_for_refund",
      targetType: "ledger",
      requestId: input.actorRequestId,
      metadata: { dealId: input.dealId, voided: result.changes },
    });
  }
};

export const listLedgerEntriesAdmin = (filters?: {
  status?: LedgerEntryStatus;
  limit?: number;
  offset?: number;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      where.push("status = ?");
      params.push(filters.status);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const rows = db
      .prepare(
        `
SELECT id, deal_id, entry_type, beneficiary_user_id, amount_cents, currency, status, earned_at, approved_at, paid_at, approved_by_user_id, metadata_json, created_at, updated_at
FROM ledger_entries
${whereSql}
ORDER BY earned_at DESC
LIMIT ? OFFSET ?
`,
      )
      .all(...params, limit, offset) as LedgerEntryRecord[];

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

export const approveLedgerEntriesAdmin = (input: {
  entryIds: string[];
  actorId: string;
  requestId: string;
  confirm: boolean;
}): { updated: number } => {
  if (!input.confirm) {
    throw new LedgerPreconditionError("confirm_required");
  }

  const ids = input.entryIds.map((id) => id.trim()).filter((id) => id.length > 0);
  if (ids.length === 0) {
    return { updated: 0 };
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();

    const run = db.transaction(() => {
      let updated = 0;
      for (const id of ids) {
        // Domain guard: only EARNED → APPROVED is valid.
        // The SQL WHERE clause mirrors this (status = 'EARNED').
        const row = db.prepare("SELECT status FROM ledger_entries WHERE id = ?").get(id) as { status: LedgerEntryStatus } | undefined;
        if (row) {
          transitionLedgerStatus(row.status, "APPROVED");
        }

        const result = db
          .prepare(
            "UPDATE ledger_entries SET status = 'APPROVED', approved_at = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ? AND status = 'EARNED'",
          )
          .run(now, input.actorId, now, id);
        updated += result.changes;
      }

      appendAuditLog(db, {
        actorType: "USER",
        actorId: input.actorId,
        action: "ledger.entries.approve",
        targetType: "ledger",
        requestId: input.requestId,
        metadata: { updated, entryIds: ids },
      });

      return updated;
    });

    return { updated: run() };
  } finally {
    db.close();
  }
};

const escapeCsv = (value: string): string => {
  const needsQuotes = /[\n",]/.test(value);
  const cleaned = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const escaped = cleaned.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

export const exportLedgerCsvAdmin = (filters?: { status?: LedgerEntryStatus }) => {
  const data = listLedgerEntriesAdmin({ status: filters?.status, limit: 200, offset: 0 });

  const headers = [
    "id",
    "deal_id",
    "entry_type",
    "beneficiary_user_id",
    "amount_cents",
    "currency",
    "status",
    "earned_at",
    "approved_at",
    "paid_at",
  ];

  const lines = [headers.join(",")];
  for (const row of data.items) {
    lines.push(
      [
        escapeCsv(row.id),
        escapeCsv(row.deal_id),
        escapeCsv(row.entry_type),
        escapeCsv(row.beneficiary_user_id ?? ""),
        escapeCsv(String(row.amount_cents)),
        escapeCsv(row.currency),
        escapeCsv(row.status),
        escapeCsv(row.earned_at),
        escapeCsv(row.approved_at ?? ""),
        escapeCsv(row.paid_at ?? ""),
      ].join(","),
    );
  }

  return lines.join("\n");
};
