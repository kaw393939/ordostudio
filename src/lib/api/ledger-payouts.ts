import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { createTransfer } from "@/adapters/stripe/stripe-client";

export class PayoutPreconditionError extends Error {
  constructor(public readonly reason: "confirm_required") {
    super(`Payout precondition failed: ${reason}`);
    this.name = "PayoutPreconditionError";
  }
}

type StripeConnectRow = {
  stripe_account_id: string;
  status: "PENDING" | "COMPLETE";
};

type LedgerPayoutCandidate = {
  id: string;
  deal_id: string;
  entry_type: "PROVIDER_PAYOUT" | "REFERRER_COMMISSION" | "PLATFORM_REVENUE";
  beneficiary_user_id: string | null;
  amount_cents: number;
  currency: string;
  status: "EARNED" | "APPROVED" | "PAID" | "VOID";
};

const idempotencyKeyForLedgerEntry = (entryId: string): string => `ledger_payout_${entryId}`;

const upsertExecutionAttempt = (db: ReturnType<typeof openCliDb>, input: {
  ledgerEntryId: string;
  idempotencyKey: string;
  now: string;
}): void => {
  const existing = db
    .prepare(
      "SELECT attempt_count FROM stripe_payout_executions WHERE ledger_entry_id = ? AND provider = 'STRIPE'",
    )
    .get(input.ledgerEntryId) as { attempt_count: number } | undefined;

  if (!existing) {
    db.prepare(
      `
INSERT INTO stripe_payout_executions (
  ledger_entry_id,
  provider,
  idempotency_key,
  stripe_transfer_id,
  status,
  attempt_count,
  last_attempted_at,
  last_error,
  created_at,
  updated_at
) VALUES (?, 'STRIPE', ?, NULL, 'PENDING', 1, ?, NULL, ?, ?)
`,
    ).run(input.ledgerEntryId, input.idempotencyKey, input.now, input.now, input.now);
    return;
  }

  db.prepare(
    `
UPDATE stripe_payout_executions
SET status = 'PENDING',
    attempt_count = ?,
    last_attempted_at = ?,
    last_error = NULL,
    updated_at = ?
WHERE ledger_entry_id = ? AND provider = 'STRIPE'
`,
  ).run(existing.attempt_count + 1, input.now, input.now, input.ledgerEntryId);
};

const markExecutionFailed = (db: ReturnType<typeof openCliDb>, input: {
  ledgerEntryId: string;
  now: string;
  error: string;
}): void => {
  const existing = db
    .prepare(
      "SELECT ledger_entry_id FROM stripe_payout_executions WHERE ledger_entry_id = ? AND provider = 'STRIPE'",
    )
    .get(input.ledgerEntryId) as { ledger_entry_id: string } | undefined;

  if (!existing) {
    db.prepare(
      `
INSERT INTO stripe_payout_executions (
  ledger_entry_id,
  provider,
  idempotency_key,
  stripe_transfer_id,
  status,
  attempt_count,
  last_attempted_at,
  last_error,
  created_at,
  updated_at
) VALUES (?, 'STRIPE', ?, NULL, 'FAILED', 1, ?, ?, ?, ?)
`,
    ).run(input.ledgerEntryId, idempotencyKeyForLedgerEntry(input.ledgerEntryId), input.now, input.error, input.now, input.now);
    return;
  }

  db.prepare(
    `
UPDATE stripe_payout_executions
SET status = 'FAILED',
    last_error = ?,
    updated_at = ?
WHERE ledger_entry_id = ? AND provider = 'STRIPE'
`,
  ).run(input.error, input.now, input.ledgerEntryId);
};

const markExecutionSucceeded = (db: ReturnType<typeof openCliDb>, input: {
  ledgerEntryId: string;
  stripeTransferId: string;
  now: string;
}): void => {
  db.prepare(
    `
UPDATE stripe_payout_executions
SET status = 'SUCCEEDED',
    stripe_transfer_id = ?,
    last_error = NULL,
    updated_at = ?
WHERE ledger_entry_id = ? AND provider = 'STRIPE'
`,
  ).run(input.stripeTransferId, input.now, input.ledgerEntryId);
};

export const executeApprovedLedgerPayoutsAdmin = async (input: {
  entryIds: string[];
  actorId: string;
  requestId: string;
  confirm: boolean;
}): Promise<{ attempted: number; paid: number; failed: number; skipped: number }> => {
  if (!input.confirm) {
    throw new PayoutPreconditionError("confirm_required");
  }

  const ids = input.entryIds.map((id) => id.trim()).filter((id) => id.length > 0);
  if (ids.length === 0) {
    return { attempted: 0, paid: 0, failed: 0, skipped: 0 };
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();

    let attempted = 0;
    let paid = 0;
    let failed = 0;
    let skipped = 0;

    for (const id of ids) {
      const row = db
        .prepare(
          "SELECT id, deal_id, entry_type, beneficiary_user_id, amount_cents, currency, status FROM ledger_entries WHERE id = ?",
        )
        .get(id) as LedgerPayoutCandidate | undefined;

      if (!row) {
        skipped += 1;
        continue;
      }

      if (row.status === "PAID" || row.status === "VOID") {
        skipped += 1;
        continue;
      }

      if (row.status !== "APPROVED") {
        skipped += 1;
        continue;
      }

      if (row.entry_type === "PLATFORM_REVENUE") {
        skipped += 1;
        continue;
      }

      if (!row.beneficiary_user_id) {
        markExecutionFailed(db, { ledgerEntryId: row.id, now, error: "beneficiary_missing" });
        failed += 1;
        continue;
      }

      const execution = db
        .prepare(
          "SELECT status, stripe_transfer_id FROM stripe_payout_executions WHERE ledger_entry_id = ? AND provider = 'STRIPE'",
        )
        .get(row.id) as { status: "PENDING" | "SUCCEEDED" | "FAILED"; stripe_transfer_id: string | null } | undefined;

      if (execution?.status === "SUCCEEDED" && execution.stripe_transfer_id) {
        // Ensure ledger is marked paid (idempotent repair).
        db.prepare("UPDATE ledger_entries SET status = 'PAID', paid_at = COALESCE(paid_at, ?), updated_at = ? WHERE id = ? AND status = 'APPROVED'").run(
          now,
          now,
          row.id,
        );
        skipped += 1;
        continue;
      }

      const connect = db
        .prepare(
          "SELECT stripe_account_id, status FROM stripe_connect_accounts WHERE user_id = ? AND provider = 'STRIPE'",
        )
        .get(row.beneficiary_user_id) as StripeConnectRow | undefined;

      if (!connect || connect.status !== "COMPLETE") {
        markExecutionFailed(db, { ledgerEntryId: row.id, now, error: "stripe_connect_incomplete" });
        failed += 1;
        continue;
      }

      attempted += 1;

      const idempotencyKey = idempotencyKeyForLedgerEntry(row.id);
      upsertExecutionAttempt(db, { ledgerEntryId: row.id, idempotencyKey, now });

      try {
        const transfer = await createTransfer({
          amountCents: row.amount_cents,
          currency: row.currency,
          destinationAccountId: connect.stripe_account_id,
          idempotencyKey,
          transferGroup: `deal_${row.deal_id}`,
          metadata: {
            ledger_entry_id: row.id,
            deal_id: row.deal_id,
            entry_type: row.entry_type,
            beneficiary_user_id: row.beneficiary_user_id,
          },
        });

        db.transaction(() => {
          markExecutionSucceeded(db, { ledgerEntryId: row.id, stripeTransferId: transfer.id, now });
          db.prepare("UPDATE ledger_entries SET status = 'PAID', paid_at = ?, updated_at = ? WHERE id = ? AND status = 'APPROVED'").run(
            now,
            now,
            row.id,
          );

          appendAuditLog(db, {
            actorType: "USER",
            actorId: input.actorId,
            action: "ledger.payout.execute",
            targetType: "ledger",
            requestId: input.requestId,
            metadata: {
              ledgerEntryId: row.id,
              dealId: row.deal_id,
              entryType: row.entry_type,
              beneficiaryUserId: row.beneficiary_user_id,
              amountCents: row.amount_cents,
              currency: row.currency,
              stripeTransferId: transfer.id,
            },
          });
        })();

        paid += 1;
      } catch (error) {
        markExecutionFailed(db, {
          ledgerEntryId: row.id,
          now,
          error: error instanceof Error ? error.message : "unknown",
        });

        appendAuditLog(db, {
          actorType: "USER",
          actorId: input.actorId,
          action: "ledger.payout.failed",
          targetType: "ledger",
          requestId: input.requestId,
          metadata: {
            ledgerEntryId: row.id,
            dealId: row.deal_id,
            error: error instanceof Error ? error.message : "unknown",
          },
        });

        failed += 1;
      }
    }

    return { attempted, paid, failed, skipped };
  } finally {
    db.close();
  }
};
