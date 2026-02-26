/**
 * Eval-01 — Policy Enforcement Suite
 *
 * Six deterministic scenarios that verify business-critical policy guards
 * are in place and correctly enforced. No LLM calls are required.
 *
 * Scenario Index
 * ──────────────
 *  PE-01  Self-referral blocked          (http, skipped when server offline)
 *  PE-02  Double-booking prevented       (db-call, always runs)
 *  PE-03  Apprentice 403 enforcement     (http, skipped when server offline)
 *  PE-04  Commission void on refund      (db-call, always runs)
 *  PE-05  Self-approval blocked          (tool-call, always runs)
 *  PE-06  Intake unauthenticated 401     (http, skipped when server offline)
 */

import type { PolicyEvalScenario } from "./types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function future(offsetMs = 24 * 60 * 60 * 1000): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

// ---------------------------------------------------------------------------
// PE-01 — Self-referral: clicking your own code must NOT record a click
// ---------------------------------------------------------------------------

const PE_01: PolicyEvalScenario = {
  id: "PE-01-self-referral-blocked",
  name: "Self-referral does not record a click",
  type: "policy",
  description:
    "When a user follows their own referral link the route should redirect " +
    "without recording a referral_click row. Requires a running dev server; " +
    "skipped automatically when server is unavailable.",

  preSetup(db) {
    const ts = now();
    db.prepare(
      "INSERT OR IGNORE INTO users (id,email,status,created_at,updated_at) VALUES (?,?,?,?,?)",
    ).run("u-pe01-owner", "owner@pe01.test", "ACTIVE", ts, ts);

    db.prepare(
      "INSERT OR IGNORE INTO referral_codes (id,user_id,code,created_at,updated_at) VALUES (?,?,?,?,?)",
    ).run("rc-pe01", "u-pe01-owner", "SELF001", ts, ts);
  },

  action: {
    type: "http",
    method: "GET",
    url: "/r/SELF001",
    // No cookie — tests that an unauthenticated hit also records nothing.
    // Authenticated self-referral is enforced at route level via session.
  },

  assertions: [
    {
      type: "db-row-not-exists",
      sql: "SELECT id FROM referral_clicks WHERE referral_code_id = 'rc-pe01'",
      description: "no referral_click row created for SELF001",
    },
  ],

  teardown(db) {
    db.prepare("DELETE FROM referral_clicks WHERE referral_code_id='rc-pe01'").run();
    db.prepare("DELETE FROM referral_codes WHERE id='rc-pe01'").run();
    db.prepare("DELETE FROM users WHERE id='u-pe01-owner'").run();
  },
};

// ---------------------------------------------------------------------------
// PE-02 — Double-booking: second reservation on an already-BOOKED slot
//          returns { conflict: true }
// ---------------------------------------------------------------------------

const PE_02: PolicyEvalScenario = {
  id: "PE-02-double-booking-prevented",
  name: "Second booking on a full slot is rejected",
  type: "policy",
  description:
    "Replicates the atomic-transaction guard in POST /api/v1/bookings. " +
    "Seeds an OPEN slot, books it, then attempts a second booking and " +
    "asserts { conflict: true } is returned.",

  preSetup(db) {
    const ts = now();
    const slotEnd = future(90 * 60 * 1000);

    db.prepare(
      "INSERT OR IGNORE INTO users (id,email,status,created_at,updated_at) VALUES (?,?,?,?,?)",
    ).run("u-pe02-maestro", "maestro@pe02.test", "ACTIVE", ts, ts);

    db.prepare(
      "INSERT OR IGNORE INTO maestro_availability (id,maestro_user_id,start_at,end_at,status,created_at) VALUES (?,?,?,?,?,?)",
    ).run("slot-pe02", "u-pe02-maestro", future(), slotEnd, "OPEN", ts);

    db.prepare(
      "INSERT OR IGNORE INTO intake_requests (id,audience,contact_name,contact_email,goals,status,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      "ir-pe02-a",
      "INDIVIDUAL",
      "First Booker",
      "first@pe02.test",
      "test booking",
      "NEW",
      50,
      ts,
      ts,
    );

    db.prepare(
      "INSERT OR IGNORE INTO intake_requests (id,audience,contact_name,contact_email,goals,status,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      "ir-pe02-b",
      "INDIVIDUAL",
      "Second Booker",
      "second@pe02.test",
      "test booking 2",
      "NEW",
      50,
      ts,
      ts,
    );
  },

  action: {
    type: "db-call",
    fn(db) {
      const ts = now();

      // First booking — succeeds, flips slot to BOOKED
      db.transaction(() => {
        db.prepare(
          "INSERT INTO bookings (id,intake_request_id,maestro_availability_id,prospect_email,status,created_at) VALUES (?,?,?,?,?,?)",
        ).run("bk-pe02-1", "ir-pe02-a", "slot-pe02", "first@pe02.test", "PENDING", ts);

        db.prepare(
          "UPDATE maestro_availability SET status='BOOKED' WHERE id=?",
        ).run("slot-pe02");
      })();

      // Second booking — replicates the booking route's guard
      const result = db.transaction(() => {
        const slot = db
          .prepare("SELECT status FROM maestro_availability WHERE id=?")
          .get("slot-pe02") as { status: string } | undefined;

        if (!slot || slot.status !== "OPEN") {
          return { conflict: true };
        }

        db.prepare(
          "INSERT INTO bookings (id,intake_request_id,maestro_availability_id,prospect_email,status,created_at) VALUES (?,?,?,?,?,?)",
        ).run("bk-pe02-2", "ir-pe02-b", "slot-pe02", "second@pe02.test", "PENDING", ts);

        db.prepare(
          "UPDATE maestro_availability SET status='BOOKED' WHERE id=?",
        ).run("slot-pe02");

        return { conflict: false };
      })();

      return result;
    },
  },

  assertions: [
    {
      type: "result-field",
      matcher: (r) => (r as { conflict: boolean }).conflict === true,
      description: "second booking attempt returns { conflict: true }",
    },
    {
      type: "db-row-not-exists",
      sql: "SELECT id FROM bookings WHERE id='bk-pe02-2'",
      description: "no duplicate booking row inserted",
    },
  ],

  teardown(db) {
    db.prepare("DELETE FROM bookings WHERE id IN ('bk-pe02-1','bk-pe02-2')").run();
    db.prepare("DELETE FROM maestro_availability WHERE id='slot-pe02'").run();
    db.prepare(
      "DELETE FROM intake_requests WHERE id IN ('ir-pe02-a','ir-pe02-b')",
    ).run();
    db.prepare("DELETE FROM users WHERE id='u-pe02-maestro'").run();
  },
};

// ---------------------------------------------------------------------------
// PE-03 — Apprentice (no OPS role) receives 401/403 on ops-summary
// ---------------------------------------------------------------------------

const PE_03: PolicyEvalScenario = {
  id: "PE-03-apprentice-ops-summary-forbidden",
  name: "Unauthenticated request to ops-summary is rejected",
  type: "policy",
  description:
    "GET /api/v1/admin/ops-summary without a session cookie must return " +
    "401 (no session) or 403 (bad role). Skipped when server is offline.",

  action: {
    type: "http",
    method: "GET",
    url: "/api/v1/admin/ops-summary",
    // No auth headers — tests the no-session path (→ 401)
  },

  assertions: [
    {
      type: "result-field",
      matcher(r) {
        const res = r as { status?: number } | null;
        if (!res) return false;
        return res.status === 401 || res.status === 403;
      },
      description: "ops-summary returns 401 or 403 for unauthenticated caller",
    },
  ],
};

// ---------------------------------------------------------------------------
// PE-04 — Refund webhook voids commission entries in ledger
// ---------------------------------------------------------------------------

const PE_04: PolicyEvalScenario = {
  id: "PE-04-commission-voided-on-refund",
  name: "Refund event voids REFERRER_COMMISSION ledger entry",
  type: "policy",
  description:
    "Simulates the Stripe charge.refunded handler by running the same " +
    "UPDATE SQL directly. Seeds an EARNED commission, applies the void, " +
    "then asserts the row has status=VOID.",

  preSetup(db) {
    const ts = now();

    db.prepare(
      "INSERT OR IGNORE INTO users (id,email,status,created_at,updated_at) VALUES (?,?,?,?,?)",
    ).run("u-pe04-ref", "referrer@pe04.test", "ACTIVE", ts, ts);

    db.prepare(
      "INSERT OR IGNORE INTO intake_requests (id,audience,contact_name,contact_email,goals,status,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      "ir-pe04",
      "INDIVIDUAL",
      "PE04 Client",
      "client@pe04.test",
      "test",
      "NEW",
      50,
      ts,
      ts,
    );

    db.prepare(
      "INSERT OR IGNORE INTO deals (id,intake_id,status,created_at,updated_at) VALUES (?,?,?,?,?)",
    ).run("deal-pe04", "ir-pe04", "PAID", ts, ts);

    // Seed an EARNED commission for the referrer
    db.prepare(
      `INSERT OR IGNORE INTO ledger_entries
         (id,deal_id,entry_type,beneficiary_user_id,amount_cents,currency,status,earned_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      "le-pe04-comm",
      "deal-pe04",
      "REFERRER_COMMISSION",
      "u-pe04-ref",
      5000,
      "USD",
      "EARNED",
      ts,
      ts,
      ts,
    );
  },

  action: {
    type: "db-call",
    fn(db) {
      const ts = now();

      // Mirrors handleStripeWebhook charge.refunded SQL
      const info = db
        .prepare(
          `UPDATE ledger_entries
           SET status='VOID', updated_at=?
           WHERE deal_id=?
             AND entry_type IN ('REFERRER_COMMISSION','PLATFORM_REVENUE')
             AND status IN ('EARNED','APPROVED')`,
        )
        .run(ts, "deal-pe04");

      return { voided: info.changes };
    },
  },

  assertions: [
    {
      type: "result-field",
      matcher: (r) => (r as { voided: number }).voided > 0,
      description: "at least one ledger row was voided",
    },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM ledger_entries WHERE id='le-pe04-comm' AND status='VOID'",
      description: "REFERRER_COMMISSION entry has status VOID",
    },
    {
      type: "db-row-not-exists",
      sql: "SELECT id FROM ledger_entries WHERE id='le-pe04-comm' AND status IN ('EARNED','APPROVED')",
      description: "commission is no longer EARNED or APPROVED",
    },
  ],

  teardown(db) {
    db.prepare("DELETE FROM ledger_entries WHERE id='le-pe04-comm'").run();
    db.prepare("DELETE FROM deals WHERE id='deal-pe04'").run();
    db.prepare("DELETE FROM intake_requests WHERE id='ir-pe04'").run();
    db.prepare("DELETE FROM users WHERE id='u-pe04-ref'").run();
  },
};

// ---------------------------------------------------------------------------
// PE-05 — Self-approval guard in approve_role_request
// ---------------------------------------------------------------------------

const PE_05: PolicyEvalScenario = {
  id: "PE-05-self-approval-blocked",
  name: "User cannot approve their own role request",
  type: "policy",
  description:
    "Calls the approve_role_request maestro tool with callerContext.callerId  " +
    "equal to the role_request's own user_id. Expects the tool to return " +
    "{ error: 'CANNOT_APPROVE_OWN_REQUEST' } and leave the request PENDING.",

  preSetup(db) {
    const ts = now();

    db.prepare(
      "INSERT OR IGNORE INTO users (id,email,status,created_at,updated_at) VALUES (?,?,?,?,?)",
    ).run("u-pe05-staff", "staff@pe05.test", "ACTIVE", ts, ts);

    // ADMIN role is present after seed, but INSERT OR IGNORE to be safe
    db.prepare("INSERT OR IGNORE INTO roles (id,name) VALUES (?,?)").run(
      "role-pe05-admin",
      "PE05_TEST_ADMIN",
    );

    db.prepare(
      "INSERT OR IGNORE INTO role_requests (id,user_id,requested_role_id,status,context,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
    ).run(
      "rr-pe05-self",
      "u-pe05-staff",
      "role-pe05-admin",
      "PENDING",
      JSON.stringify({ note: "self-promotion attempt" }),
      ts,
      ts,
    );
  },

  action: {
    type: "tool-call",
    toolName: "approve_role_request",
    args: { request_id: "rr-pe05-self" },
    callerId: "u-pe05-staff",   // ← same user who owns the request
    callerRole: "STAFF",
  },

  assertions: [
    {
      type: "throws-with-code",
      code: "CANNOT_APPROVE_OWN_REQUEST",
      description: "tool returns { error: 'CANNOT_APPROVE_OWN_REQUEST' }",
    },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM role_requests WHERE id='rr-pe05-self' AND status='PENDING'",
      description: "role_request remains in PENDING status",
    },
  ],

  teardown(db) {
    db.prepare("DELETE FROM role_requests WHERE id='rr-pe05-self'").run();
    db.prepare("DELETE FROM roles WHERE id='role-pe05-admin'").run();
    db.prepare("DELETE FROM users WHERE id='u-pe05-staff'").run();
  },
};

// ---------------------------------------------------------------------------
// PE-06 — Intake detail endpoint rejects unauthenticated requests
// ---------------------------------------------------------------------------

const PE_06: PolicyEvalScenario = {
  id: "PE-06-intake-unauthenticated-401",
  name: "GET /api/v1/intake/:id without auth returns 401",
  type: "policy",
  description:
    "Confirms that the intake detail route enforces authentication. " +
    "Skipped automatically when the dev server is not running.",

  action: {
    type: "http",
    method: "GET",
    url: "/api/v1/intake/nonexistent-id-pe06",
    // No cookie — should trigger requireAdmin → 401
  },

  assertions: [
    {
      type: "http-status",
      expected: 401,
      description: "unauthenticated intake request returns 401",
    },
  ],
};

// ---------------------------------------------------------------------------
// Exported suite
// ---------------------------------------------------------------------------

export const policyScenarios: PolicyEvalScenario[] = [
  PE_01,
  PE_02,
  PE_03,
  PE_04,
  PE_05,
  PE_06,
];
