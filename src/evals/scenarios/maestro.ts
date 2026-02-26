/**
 * Maestro eval scenarios (10 total)
 *
 * Group A (4): Queue — list, advance, filter, multi-turn detail+advance
 * Group B (3): Role Approvals — list, approve, reject
 * Group C (1): Revenue summary
 * Group D (2): Audit log, ops summary
 */

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function seedIntake(
  db: Database.Database,
  overrides: {
    id?: string;
    status?: string;
    contact_name?: string;
    contact_email?: string;
    audience?: string;
    goals?: string;
  } = {},
): string {
  const id = overrides.id ?? randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `
INSERT INTO intake_requests
  (id, offer_slug, audience, organization_name, contact_name, contact_email,
   goals, timeline, constraints, status, owner_user_id, priority, created_at, updated_at)
VALUES (?, NULL, ?, NULL, ?, ?, ?, NULL, NULL, ?, NULL, 50, ?, ?)
`,
  ).run(
    id,
    overrides.audience ?? "INDIVIDUAL",
    overrides.contact_name ?? "Test Prospect",
    overrides.contact_email ?? "prospect@example.com",
    overrides.goals ?? "Looking to improve our training programme.",
    overrides.status ?? "NEW",
    now,
    now,
  );

  // Seed initial status history row
  db.prepare(
    `
INSERT INTO intake_status_history
  (id, intake_request_id, from_status, to_status, note, changed_by, changed_at)
VALUES (?, ?, NULL, ?, 'Request submitted', NULL, ?)
`,
  ).run(randomUUID(), id, overrides.status ?? "NEW", now);

  return id;
}

function seedRoleRequest(
  db: Database.Database,
  userId: string,
  roleName: string = "AFFILIATE",
): string {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Ensure the role exists
  db.prepare(
    `INSERT OR IGNORE INTO roles (id, name, description, created_at) VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), roleName, `${roleName} role`, now);

  const role = db
    .prepare(`SELECT id FROM roles WHERE name = ?`)
    .get(roleName) as { id: string } | undefined;

  if (!role) throw new Error(`Role ${roleName} not found after seed`);

  db.prepare(
    `
INSERT INTO role_requests
  (id, user_id, requested_role_id, status, context, created_at, updated_at)
VALUES (?, ?, ?, 'PENDING', '{}', ?, ?)
`,
  ).run(id, userId, role.id, now, now);

  return id;
}

function seedLedgerEntries(db: Database.Database, dealCount: number = 2): void {
  const now = new Date().toISOString();
  for (let i = 0; i < dealCount; i++) {
    const dealId = randomUUID();
    // 4 000 cents gross per deal
    // Entries mirror the ledger schema: PLATFORM_REVENUE, REFERRER_COMMISSION, PROVIDER_PAYOUT
    const entries: Array<{ type: string; amount: number }> = [
      { type: "PLATFORM_REVENUE", amount: 1600 },
      { type: "REFERRER_COMMISSION", amount: 400 },
      { type: "PROVIDER_PAYOUT", amount: 2000 },
    ];
    for (const e of entries) {
      db.prepare(
        `
INSERT INTO ledger_entries
  (id, deal_id, entry_type, beneficiary_user_id, amount_cents, currency,
   status, earned_at, approved_at, paid_at, approved_by_user_id, metadata_json, created_at, updated_at)
VALUES (?, ?, ?, NULL, ?, 'USD', 'EARNED', ?, NULL, NULL, NULL, '{}', ?, ?)
`,
      ).run(randomUUID(), dealId, e.type, e.amount, now, now, now);
    }
  }
}

function seedAuditEntries(db: Database.Database, adminId: string): void {
  const now = new Date().toISOString();
  const reqId = randomUUID();
  db.prepare(
    `
INSERT INTO audit_log
  (id, actor_type, actor_id, action, target_type, target_id, metadata, created_at, request_id)
VALUES (?, 'USER', ?, 'intake.create', 'intake_request', NULL, '{}', ?, ?)
`,
  ).run(randomUUID(), adminId, now, reqId);
}

// ---------------------------------------------------------------------------
// Group A — Queue
// ---------------------------------------------------------------------------

const maestroQueueList: EvalScenario = {
  id: "maestro-queue-list",
  name: "Maestro: list the intake queue",
  type: "maestro",
  description:
    "Agent should call get_intake_queue and return a list of intake requests.",
  preSetup(db) {
    seedIntake(db, { contact_name: "Alice Intake", status: "NEW" });
    seedIntake(db, { contact_name: "Bob Intake", status: "TRIAGED" });
  },
  turns: [
    {
      userMessage: "Show me the current intake queue.",
      expectedBehavior:
        "Agent calls get_intake_queue and returns a list with at least 2 intakes.",
      responseChecks: [
        { type: "tool_called", name: "get_intake_queue" },
        { type: "contains", value: "Alice" },
      ],
    },
  ],
};

const maestroQueueAdvance: EvalScenario = {
  id: "maestro-queue-advance",
  name: "Maestro: advance an intake to TRIAGED",
  type: "maestro",
  description:
    "Agent should call update_intake_status to move an intake to TRIAGED.",
  preSetup(db) {
    seedIntake(db, { id: "intake-advance-001", status: "NEW" });
  },
  turns: [
    {
      userMessage: "Move intake intake-advance-001 to TRIAGED with note 'Reviewed by ops team'.",
      expectedBehavior:
        "Agent calls update_intake_status with new_status=TRIAGED.",
      responseChecks: [
        { type: "tool_called", name: "update_intake_status" },
        { type: "contains", value: "TRIAGED" },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "Intake status should be TRIAGED in DB",
      query:
        "SELECT status AS result FROM intake_requests WHERE id = 'intake-advance-001'",
      expected: { result: "TRIAGED" },
    },
    {
      description: "Status history should have a TRIAGED entry",
      query:
        "SELECT COUNT(*) AS result FROM intake_status_history WHERE intake_request_id = 'intake-advance-001' AND to_status = 'TRIAGED'",
      expected: { result: 1 },
    },
  ],
};

const maestroQueueFilterByStatus: EvalScenario = {
  id: "maestro-queue-filter-by-status",
  name: "Maestro: filter queue by QUALIFIED status",
  type: "maestro",
  description:
    "Agent should call get_intake_queue with a status filter and return only matching intakes.",
  preSetup(db) {
    seedIntake(db, { contact_name: "Qualified Lead", status: "QUALIFIED" });
    seedIntake(db, { contact_name: "New Lead", status: "NEW" });
  },
  turns: [
    {
      userMessage: "Show me only the QUALIFIED intakes.",
      expectedBehavior:
        "Agent calls get_intake_queue filtered to QUALIFIED status and mentions Qualified Lead.",
      responseChecks: [
        { type: "tool_called", name: "get_intake_queue" },
        { type: "contains", value: "qualified" },
      ],
    },
  ],
};

const maestroIntakeDetailThenAdvance: EvalScenario = {
  id: "maestro-intake-detail-then-advance",
  name: "Maestro: get detail then advance (multi-turn)",
  type: "maestro",
  description:
    "Two-turn scenario: first get intake detail, then advance to BOOKED.",
  preSetup(db) {
    seedIntake(db, { id: "intake-detail-001", status: "QUALIFIED" });
  },
  turns: [
    {
      userMessage: "Show me the full detail for intake intake-detail-001.",
      expectedBehavior:
        "Agent calls get_intake_detail and returns intake details.",
      responseChecks: [{ type: "tool_called", name: "get_intake_detail" }],
    },
    {
      userMessage: "Great. Now move it to BOOKED.",
      expectedBehavior:
        "Agent calls update_intake_status with new_status=BOOKED.",
      responseChecks: [
        { type: "tool_called", name: "update_intake_status" },
        { type: "contains", value: "BOOKED" },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "Intake should be BOOKED",
      query:
        "SELECT status AS result FROM intake_requests WHERE id = 'intake-detail-001'",
      expected: { result: "BOOKED" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Group B — Role Approvals
// ---------------------------------------------------------------------------

const maestroRoleListPending: EvalScenario = {
  id: "maestro-role-list-pending",
  name: "Maestro: list pending role requests",
  type: "maestro",
  description:
    "Agent should call list_role_requests and return pending requests.",
  preSetup(db, adminId) {
    seedRoleRequest(db, adminId, "AFFILIATE");
  },
  turns: [
    {
      userMessage: "Show me all pending role requests.",
      expectedBehavior:
        "Agent calls list_role_requests and returns at least one pending request.",
      responseChecks: [
        { type: "tool_called", name: "list_role_requests" },
        { type: "contains", value: "pending" },
      ],
    },
  ],
};

const maestroRoleApprove: EvalScenario = {
  id: "maestro-role-approve",
  name: "Maestro: approve a role request",
  type: "maestro",
  description:
    "Agent should call approve_role_request and the DB should grant the role.",
  preSetup(db, adminId) {
    seedRoleRequest(db, adminId, "AFFILIATE");
    // Store the request ID where we can find it
    const req = db
      .prepare(
        `SELECT rr.id FROM role_requests rr WHERE rr.user_id = ? AND rr.status = 'PENDING' LIMIT 1`,
      )
      .get(adminId) as { id: string } | undefined;
    if (req) {
      // Rename it to a known ID for later reference
      db.prepare(`UPDATE role_requests SET id = 'rr-approve-001' WHERE id = ?`).run(req.id);
    }
  },
  turns: [
    {
      userMessage:
        "Approve role request rr-approve-001. The user has completed their application.",
      expectedBehavior:
        "Agent calls approve_role_request with request_id=rr-approve-001.",
      responseChecks: [
        { type: "tool_called", name: "approve_role_request" },
        { type: "contains", value: "approved" },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "Role request should be APPROVED",
      query:
        "SELECT status AS result FROM role_requests WHERE id = 'rr-approve-001'",
      expected: { result: "APPROVED" },
    },
  ],
};

const maestroRoleRejectWithReason: EvalScenario = {
  id: "maestro-role-reject-with-reason",
  name: "Maestro: reject a role request with reason",
  type: "maestro",
  description:
    "Agent should call reject_role_request with a reason and the DB should mark it REJECTED.",
  preSetup(db, adminId) {
    seedRoleRequest(db, adminId, "AFFILIATE");
    const req = db
      .prepare(
        `SELECT id FROM role_requests WHERE user_id = ? AND status = 'PENDING' LIMIT 1`,
      )
      .get(adminId) as { id: string } | undefined;
    if (req) {
      db.prepare(`UPDATE role_requests SET id = 'rr-reject-001' WHERE id = ?`).run(req.id);
    }
  },
  turns: [
    {
      userMessage:
        "Reject role request rr-reject-001. Reason: application is incomplete.",
      expectedBehavior:
        "Agent calls reject_role_request with request_id=rr-reject-001 and a reason.",
      responseChecks: [
        { type: "tool_called", name: "reject_role_request" },
        { type: "contains", value: "rejected" },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "Role request should be REJECTED",
      query:
        "SELECT status AS result FROM role_requests WHERE id = 'rr-reject-001'",
      expected: { result: "REJECTED" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Group C — KPI
// ---------------------------------------------------------------------------

const maestroRevenueSummary: EvalScenario = {
  id: "maestro-revenue-summary",
  name: "Maestro: get revenue summary",
  type: "maestro",
  description:
    "Agent should call get_revenue_summary and report a non-zero revenue figure.",
  preSetup(db) {
    // Seed 5 deals × 1 600 = 8 000 cents platform revenue
    seedLedgerEntries(db, 5);
  },
  turns: [
    {
      userMessage: "What is our revenue for the last 30 days?",
      expectedBehavior:
        "Agent calls get_revenue_summary and reports a revenue figure (8000 cents across 5 deals).",
      responseChecks: [
        { type: "tool_called", name: "get_revenue_summary" },
        { type: "regex", pattern: "8[,\\s]?000|8000|\\$80" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Group D — Operations
// ---------------------------------------------------------------------------

const maestroAuditLog: EvalScenario = {
  id: "maestro-audit-log",
  name: "Maestro: retrieve audit log",
  type: "maestro",
  description:
    "Agent should call get_audit_log and return recent audit entries.",
  preSetup(db, adminId) {
    seedAuditEntries(db, adminId);
  },
  turns: [
    {
      userMessage: "Show me the last 10 audit log entries.",
      expectedBehavior: "Agent calls get_audit_log and returns entries.",
      responseChecks: [
        { type: "tool_called", name: "get_audit_log" },
        { type: "contains", value: "intake" },
      ],
    },
  ],
};

const maestroOpsSummary: EvalScenario = {
  id: "maestro-ops-summary",
  name: "Maestro: get combined ops summary",
  type: "maestro",
  description:
    "Agent should call get_ops_summary and return a combined revenue + activity breakdown.",
  preSetup(db) {
    seedLedgerEntries(db, 2);
  },
  turns: [
    {
      userMessage: "Give me the ops summary for today.",
      expectedBehavior:
        "Agent calls get_ops_summary and reports revenue and activity data.",
      responseChecks: [
        { type: "tool_called", name: "get_ops_summary" },
        { type: "contains", value: "revenue" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const maestroScenarios: EvalScenario[] = [
  // Group A
  maestroQueueList,
  maestroQueueAdvance,
  maestroQueueFilterByStatus,
  maestroIntakeDetailThenAdvance,
  // Group B
  maestroRoleListPending,
  maestroRoleApprove,
  maestroRoleRejectWithReason,
  // Group C
  maestroRevenueSummary,
  // Group D
  maestroAuditLog,
  maestroOpsSummary,
];
