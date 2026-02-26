/**
 * Affiliate eval scenarios (2 total)
 *
 * P2-01: get_affiliate_link        — returns referral code for user
 * P2-02: list_pending_commissions  — returns EARNED commissions with amounts
 */

import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// Seed constants
// ---------------------------------------------------------------------------

const AFF_USER_01 = "u-aff-1";
const AFF_RC_01 = "rc-aff-1";
const AFF_INTAKE_01 = "ir-aff-1";
const AFF_DEAL_01 = "deal-aff-1";
const AFF_LEDGER_01 = "le-aff-1";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function seedAffUser(db: Database.Database): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO users
       (id, email, status, created_at, updated_at)
     VALUES (?, ?, 'ACTIVE', ?, ?)`,
  ).run(AFF_USER_01, "affiliate@test.com", now, now);
}

function seedReferralCode(db: Database.Database): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO referral_codes
       (id, user_id, code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(AFF_RC_01, AFF_USER_01, "AFF001", now, now);
}

function seedDeal(db: Database.Database, adminId: string): void {
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR IGNORE INTO intake_requests
       (id, audience, contact_name, contact_email, goals, status, priority,
        owner_user_id, created_at, updated_at)
     VALUES (?, 'INDIVIDUAL', 'Ref Client', 'refclient@test.com', 'Consulting', 'NEW', 50, ?, ?, ?)`,
  ).run(AFF_INTAKE_01, adminId, now, now);

  db.prepare(
    `INSERT OR IGNORE INTO deals
       (id, intake_id, status, referrer_user_id, created_at, updated_at)
     VALUES (?, ?, 'PAID', ?, ?, ?)`,
  ).run(AFF_DEAL_01, AFF_INTAKE_01, AFF_USER_01, now, now);
}

function seedLedgerEntry(db: Database.Database): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO ledger_entries
       (id, deal_id, entry_type, beneficiary_user_id, amount_cents, currency,
        status, earned_at, created_at, updated_at)
     VALUES (?, ?, 'REFERRER_COMMISSION', ?, 4000, 'USD', 'EARNED', ?, ?, ?)`,
  ).run(AFF_LEDGER_01, AFF_DEAL_01, AFF_USER_01, now, now, now);
}

// ---------------------------------------------------------------------------
// P2-01: get_affiliate_link
// ---------------------------------------------------------------------------

export const affGetLink: EvalScenario = {
  id: "affiliate-P2-01-get-link",
  name: "Affiliate P2-01: retrieve affiliate referral link",
  type: "maestro",
  description: "Agent retrieves the referral code and link for an affiliate user.",
  preSetup: (db, adminId) => {
    void adminId;
    seedAffUser(db);
    seedReferralCode(db);
  },
  turns: [
    {
      userMessage: `What is the affiliate referral link for user ${AFF_USER_01}?`,
      expectedBehavior:
        "Agent should call get_affiliate_link and return the code AFF001.",
      responseChecks: [
        { type: "tool_called", name: "get_affiliate_link" },
        { type: "contains", value: "AFF001" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// P2-02: list_pending_commissions
// ---------------------------------------------------------------------------

export const affListCommissions: EvalScenario = {
  id: "affiliate-P2-02-list-commissions",
  name: "Affiliate P2-02: list pending commissions for affiliate",
  type: "maestro",
  description:
    "Agent lists EARNED commissions for a user and reports the dollar amounts.",
  preSetup: (db, adminId) => {
    seedAffUser(db);
    seedDeal(db, adminId);
    seedLedgerEntry(db);
  },
  turns: [
    {
      userMessage: `List pending commissions for affiliate ${AFF_USER_01}.`,
      expectedBehavior:
        "Agent should call list_pending_commissions and mention the $40 commission.",
      responseChecks: [
        { type: "tool_called", name: "list_pending_commissions" },
        { type: "regex", value: "40(?:\\.00)?" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export all scenarios
// ---------------------------------------------------------------------------

export const affiliateScenarios: EvalScenario[] = [
  affGetLink,
  affListCommissions,
];
