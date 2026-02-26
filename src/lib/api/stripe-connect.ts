import { randomUUID } from "node:crypto";

import { resolveConfig } from "@/platform/config";
import { openCliDb, appendAuditLog } from "@/platform/runtime";
import { writeFeedEvent } from "@/lib/api/feed-events";
import {
  createConnectAccount,
  createConnectAccountLink,
  retrieveConnectAccount,
  type StripeConnectAccount,
} from "@/adapters/stripe/stripe-client";

export type StripeConnectStatus = "PENDING" | "COMPLETE";

export type StripeConnectAccountRecord = {
  user_id: string;
  provider: "STRIPE";
  stripe_account_id: string;
  status: StripeConnectStatus;
  details_submitted: 0 | 1;
  charges_enabled: 0 | 1;
  payouts_enabled: 0 | 1;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

type StripeConnectAccountDbRow = {
  user_id: string;
  provider: "STRIPE";
  stripe_account_id: string;
  status: StripeConnectStatus;
  details_submitted: number;
  charges_enabled: number;
  payouts_enabled: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

const computeStatus = (account: StripeConnectAccount): StripeConnectStatus => {
  if (account.details_submitted && account.payouts_enabled) {
    return "COMPLETE";
  }
  return "PENDING";
};

const rowToRecord = (row: StripeConnectAccountDbRow): StripeConnectAccountRecord => {
  return {
    user_id: String(row.user_id),
    provider: "STRIPE",
    stripe_account_id: String(row.stripe_account_id),
    status: row.status as StripeConnectStatus,
    details_submitted: (row.details_submitted ? 1 : 0) as 0 | 1,
    charges_enabled: (row.charges_enabled ? 1 : 0) as 0 | 1,
    payouts_enabled: (row.payouts_enabled ? 1 : 0) as 0 | 1,
    last_checked_at: row.last_checked_at ? String(row.last_checked_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
};

export const getStripeConnectAccountForUser = (userId: string): StripeConnectAccountRecord | null => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const row = db
      .prepare(
        "SELECT user_id, provider, stripe_account_id, status, details_submitted, charges_enabled, payouts_enabled, last_checked_at, created_at, updated_at FROM stripe_connect_accounts WHERE user_id = ? AND provider = 'STRIPE'",
      )
      .get(userId) as StripeConnectAccountDbRow | undefined;

    return row ? rowToRecord(row) : null;
  } finally {
    db.close();
  }
};

const ensureConnectAccountRow = async (input: {
  userId: string;
  email: string;
  requestId: string;
}): Promise<StripeConnectAccountRecord> => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const existing = db
      .prepare(
        "SELECT user_id, provider, stripe_account_id, status, details_submitted, charges_enabled, payouts_enabled, last_checked_at, created_at, updated_at FROM stripe_connect_accounts WHERE user_id = ? AND provider = 'STRIPE'",
      )
      .get(input.userId) as StripeConnectAccountDbRow | undefined;

    if (existing) {
      return rowToRecord(existing);
    }

    const now = new Date().toISOString();
    const created = await createConnectAccount({ email: input.email });

    db.prepare(
      `
INSERT INTO stripe_connect_accounts (
  user_id,
  provider,
  stripe_account_id,
  status,
  details_submitted,
  charges_enabled,
  payouts_enabled,
  last_checked_at,
  created_at,
  updated_at
) VALUES (?, 'STRIPE', ?, 'PENDING', 0, 0, 0, NULL, ?, ?)
`,
    ).run(input.userId, created.id, now, now);

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.userId,
      action: "stripe.connect.account.create",
      targetType: "stripe",
      requestId: input.requestId,
      metadata: { stripeAccountId: created.id },
    });

    const row = db
      .prepare(
        "SELECT user_id, provider, stripe_account_id, status, details_submitted, charges_enabled, payouts_enabled, last_checked_at, created_at, updated_at FROM stripe_connect_accounts WHERE user_id = ? AND provider = 'STRIPE'",
      )
      .get(input.userId) as StripeConnectAccountDbRow;

    return rowToRecord(row);
  } finally {
    db.close();
  }
};

export const refreshStripeConnectAccountForUser = async (input: {
  userId: string;
  requestId: string;
}): Promise<StripeConnectAccountRecord | null> => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const existing = db
      .prepare(
        "SELECT user_id, provider, stripe_account_id, status, details_submitted, charges_enabled, payouts_enabled, last_checked_at, created_at, updated_at FROM stripe_connect_accounts WHERE user_id = ? AND provider = 'STRIPE'",
      )
      .get(input.userId) as StripeConnectAccountDbRow | undefined;

    if (!existing) {
      return null;
    }

    const stripe = await retrieveConnectAccount({ accountId: existing.stripe_account_id });
    const status = computeStatus(stripe);
    const now = new Date().toISOString();

    db.prepare(
      `
UPDATE stripe_connect_accounts
SET status = ?,
    details_submitted = ?,
    charges_enabled = ?,
    payouts_enabled = ?,
    last_checked_at = ?,
    updated_at = ?
WHERE user_id = ? AND provider = 'STRIPE'
`,
    ).run(
      status,
      stripe.details_submitted ? 1 : 0,
      stripe.charges_enabled ? 1 : 0,
      stripe.payouts_enabled ? 1 : 0,
      now,
      now,
      input.userId,
    );

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.userId,
      action: "stripe.connect.account.refresh",
      targetType: "stripe",
      requestId: input.requestId,
      metadata: {
        stripeAccountId: stripe.id,
        status,
        details_submitted: stripe.details_submitted,
        charges_enabled: stripe.charges_enabled,
        payouts_enabled: stripe.payouts_enabled,
      },
    });

    // Write feed event when payout account becomes active for the first time
    const wasPayoutsEnabled = Boolean(existing.payouts_enabled);
    const nowPayoutsEnabled = stripe.payouts_enabled;
    if (!wasPayoutsEnabled && nowPayoutsEnabled) {
      writeFeedEvent(db, {
        userId: input.userId,
        type: "PayoutStatus",
        title: "Payout account active.",
        description: "Commissions will be sent automatically when deals close.",
      });
    }

    const row = db
      .prepare(
        "SELECT user_id, provider, stripe_account_id, status, details_submitted, charges_enabled, payouts_enabled, last_checked_at, created_at, updated_at FROM stripe_connect_accounts WHERE user_id = ? AND provider = 'STRIPE'",
      )
      .get(input.userId) as StripeConnectAccountDbRow;

    return rowToRecord(row);
  } finally {
    db.close();
  }
};

export const createStripeConnectOnboardingLinkForUser = async (input: {
  userId: string;
  email: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ url: string; account: StripeConnectAccountRecord }> => {
  const requestId = randomUUID();

  const account = await ensureConnectAccountRow({
    userId: input.userId,
    email: input.email,
    requestId,
  });

  const link = await createConnectAccountLink({
    accountId: account.stripe_account_id,
    returnUrl: input.returnUrl,
    refreshUrl: input.refreshUrl,
  });

  // Best-effort refresh, but don't fail onboarding link generation if Stripe status fetch errors.
  try {
    await refreshStripeConnectAccountForUser({ userId: input.userId, requestId });
  } catch {
    // ignore
  }

  return { url: link.url, account };
};
