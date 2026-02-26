/**
 * Commerce-Agent eval scenarios (3 total)
 *
 * CA-01: list_deals           — deals returned for queued pipeline
 * CA-02: advance_deal_stage   — deal stage advanced, feed event written
 * CA-03: get_customer_timeline — user activity returned
 */

import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

const CA_DEAL_01 = "deal-ca-01";
const CA_DEAL_02 = "deal-ca-02";
const CA_INTAKE_01 = "ir-ca-01";
const CA_INTAKE_02 = "ir-ca-02";
const CA_USER_03 = "usr-ca-03";

function seedIntakeAndDeal(
  db: Database.Database,
  opts: {
    intakeId: string;
    dealId: string;
    contactName: string;
    contactEmail: string;
    dealStatus: string;
    maestroUserId: string;
  },
): void {
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR IGNORE INTO intake_requests
       (id, audience, contact_name, contact_email, goals, status, priority,
        owner_user_id, created_at, updated_at)
     VALUES (?, 'INDIVIDUAL', ?, ?, 'Looking for consulting', 'NEW', 50, ?, ?, ?)`,
  ).run(
    opts.intakeId,
    opts.contactName,
    opts.contactEmail,
    opts.maestroUserId,
    now,
    now,
  );

  db.prepare(
    `INSERT OR IGNORE INTO deals
       (id, intake_id, status, maestro_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(opts.dealId, opts.intakeId, opts.dealStatus, opts.maestroUserId, now, now);
}

// ---------------------------------------------------------------------------
// CA-01: list_deals — returns queued deals
// ---------------------------------------------------------------------------

export const caListDeals: EvalScenario = {
  id: "commerce-CA-01-list-deals",
  name: "Commerce-Agent CA-01: list open deals",
  type: "maestro",
  description: "Agent lists QUEUED deals and returns contact info.",
  preSetup: (db, adminId) =>
    seedIntakeAndDeal(db, {
      intakeId: CA_INTAKE_01,
      dealId: CA_DEAL_01,
      contactName: "River Chen",
      contactEmail: "river@example.com",
      dealStatus: "QUEUED",
      maestroUserId: adminId,
    }),
  turns: [
    {
      userMessage: "What deals are currently queued?",
      expectedBehavior:
        "Agent should call list_deals and mention River Chen's deal.",
      responseChecks: [
        {
          type: "tool_called",
          name: "list_deals",
          description: "Agent must call list_deals",
        },
        {
          type: "regex",
          pattern: "River Chen|River|deal",
          flags: "i",
          description: "Response should mention the deal or contact",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "deal record should exist with QUEUED status",
      query: `SELECT status AS result FROM deals WHERE id = '${CA_DEAL_01}'`,
      expected: { result: "QUEUED" },
    },
  ],
};

// ---------------------------------------------------------------------------
// CA-02: advance_deal_stage — moves deal from ASSIGNED to MAESTRO_APPROVED
// ---------------------------------------------------------------------------

export const caAdvanceDealStage: EvalScenario = {
  id: "commerce-CA-02-advance-deal",
  name: "Commerce-Agent CA-02: advance deal stage",
  type: "maestro",
  description:
    "Agent advances a deal from ASSIGNED to MAESTRO_APPROVED; feed event written.",
  preSetup: (db, adminId) =>
    seedIntakeAndDeal(db, {
      intakeId: CA_INTAKE_02,
      dealId: CA_DEAL_02,
      contactName: "Jordan Park",
      contactEmail: "jordan@example.com",
      dealStatus: "ASSIGNED",
      maestroUserId: adminId,
    }),
  turns: [
    {
      userMessage: `Approve deal ${CA_DEAL_02} — move it to MAESTRO_APPROVED.`,
      expectedBehavior:
        "Agent should call advance_deal_stage and confirm the stage change.",
      responseChecks: [
        {
          type: "tool_called",
          name: "advance_deal_stage",
          description: "Agent must call advance_deal_stage",
        },
        {
          type: "regex",
          pattern: "approved|maestro_approved|advanced|done",
          flags: "i",
          description: "Response should confirm the advance",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "deal status should be MAESTRO_APPROVED",
      query: `SELECT status AS result FROM deals WHERE id = '${CA_DEAL_02}'`,
      expected: { result: "MAESTRO_APPROVED" },
    },
    {
      description: "DealAdvanced feed event should be written",
      query: `SELECT COUNT(*) AS result FROM feed_events WHERE type = 'DealAdvanced' AND description LIKE '%${CA_DEAL_02}%'`,
      expected: { result: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// CA-03: get_customer_timeline — returns user activity
// ---------------------------------------------------------------------------

export const caGetCustomerTimeline: EvalScenario = {
  id: "commerce-CA-03-customer-timeline",
  name: "Commerce-Agent CA-03: get customer timeline",
  type: "maestro",
  description: "Agent retrieves activity timeline for a user.",
  preSetup: (db, adminId) => {
    const now = new Date().toISOString();

    // Create a non-admin user for timeline query
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, status, created_at, updated_at)
       VALUES (?, 'jordan-ca@example.com', 'ACTIVE', ?, ?)`,
    ).run(CA_USER_03, now, now);

    // Seed a feed event for that user — need a valid user_id FK
    db.prepare(
      `INSERT OR IGNORE INTO feed_events
         (id, user_id, type, title, description, created_at)
       VALUES ('fe-ca-03', ?, 'IntakeStatusChanged', 'Intake updated', 'Status changed to QUALIFIED', ?)`,
    ).run(CA_USER_03, now);

    void adminId; // adminId not needed here
  },
  turns: [
    {
      userMessage: `Show me the activity history for user ${CA_USER_03}.`,
      expectedBehavior:
        "Agent should call get_customer_timeline and describe the user's history.",
      responseChecks: [
        {
          type: "tool_called",
          name: "get_customer_timeline",
          description: "Agent must call get_customer_timeline",
        },
        {
          type: "regex",
          pattern: "history|activity|timeline|event|intake",
          flags: "i",
          description: "Response should describe the timeline",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "feed_events row should exist for the test user",
      query: `SELECT COUNT(*) AS result FROM feed_events WHERE user_id = '${CA_USER_03}'`,
      expected: { result: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const commerceScenarios: EvalScenario[] = [
  caListDeals,
  caAdvanceDealStage,
  caGetCustomerTimeline,
];
