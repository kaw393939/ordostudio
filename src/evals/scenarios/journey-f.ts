/**
 * Journey-F eval scenarios (3 total)
 *
 * JF-01: flag_urgent_intake     — triage_tickets updated, feed event written
 * JF-02: trigger_urgent_callback — slot booked, bookings row created
 * JF-03: log_callback_outcome   — bookings.outcome updated
 */

import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

const JF_INTAKE_ID = "ir-jf-1";
const JF_SLOT_ID = "slot-jf-1";
const JF_BOOKING_ID = "book-jf-1";

/**
 * Seed the base fixtures for all JF scenarios.
 * adminId is the eval DB's seeded admin user.
 */
function seedJourneyFFixtures(db: Database.Database, adminId: string): void {
  const now = new Date().toISOString();
  const twoDaysLater = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twoDaysPlusHour = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
  ).toISOString();

  // Intake with owner set to adminId so feed-event FK holds
  db.prepare(
    `INSERT OR IGNORE INTO intake_requests
       (id, audience, contact_name, contact_email, goals, status, priority,
        owner_user_id, created_at, updated_at)
     VALUES (?, 'INDIVIDUAL', 'Urgent Lead', 'urgent@test.com',
             'Ready to buy today.', 'NEW', 50, ?, ?, ?)`,
  ).run(JF_INTAKE_ID, adminId, now, now);

  // Maestro availability slot
  db.prepare(
    `INSERT OR IGNORE INTO maestro_availability
       (id, maestro_user_id, start_at, end_at, status)
     VALUES (?, ?, ?, ?, 'OPEN')`,
  ).run(JF_SLOT_ID, adminId, twoDaysLater, twoDaysPlusHour);
}

/**
 * Seed fixtures + a pre-existing booking for JF-03.
 */
function seedJourneyFWithBooking(
  db: Database.Database,
  adminId: string,
): void {
  seedJourneyFFixtures(db, adminId);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR IGNORE INTO bookings
       (id, intake_request_id, maestro_availability_id, prospect_email, status, created_at)
     VALUES (?, ?, ?, 'urgent@test.com', 'CONFIRMED', ?)`,
  ).run(JF_BOOKING_ID, JF_INTAKE_ID, JF_SLOT_ID, now);
}

// ---------------------------------------------------------------------------
// JF-01: flag_urgent_intake
// ---------------------------------------------------------------------------

export const jfFlagUrgentIntake: EvalScenario = {
  id: "journey-f-JF-01-flag-urgent",
  name: "Journey-F JF-01: flag urgent intake",
  type: "maestro",
  description:
    "Operator flags an intake as urgent — triage_tickets updated to priority='urgent', feed event written.",
  preSetup: (db, adminId) => seedJourneyFFixtures(db, adminId),
  turns: [
    {
      userMessage: `Flag intake ${JF_INTAKE_ID} as urgent — this lead is ready to buy today.`,
      expectedBehavior:
        "Agent should call flag_urgent_intake and confirm the intake is flagged.",
      responseChecks: [
        {
          type: "tool_called",
          name: "flag_urgent_intake",
          description: "Agent must call flag_urgent_intake",
        },
        {
          type: "regex",
          pattern: "urgent|flagged|priority",
          flags: "i",
          description: "Response should mention urgency/flagging",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "triage_tickets priority should be 'urgent'",
      query: `SELECT priority AS result FROM triage_tickets WHERE intake_request_id = '${JF_INTAKE_ID}'`,
      expected: { result: "urgent" },
    },
    {
      description: "UrgentIntakeFlagged feed event should be written",
      query: `SELECT COUNT(*) AS result FROM feed_events WHERE type = 'UrgentIntakeFlagged' AND description LIKE '%${JF_INTAKE_ID}%'`,
      expected: { result: 1 },
    },
  ],
};

// ---------------------------------------------------------------------------
// JF-02: trigger_urgent_callback
// ---------------------------------------------------------------------------

export const jfTriggerUrgentCallback: EvalScenario = {
  id: "journey-f-JF-02-trigger-callback",
  name: "Journey-F JF-02: trigger urgent callback",
  type: "maestro",
  description:
    "Operator books an urgent callback — slot status becomes BOOKED, bookings row created.",
  preSetup: (db, adminId) => seedJourneyFFixtures(db, adminId),
  turns: [
    {
      userMessage: `Book slot ${JF_SLOT_ID} as an urgent callback for intake ${JF_INTAKE_ID}.`,
      expectedBehavior:
        "Agent should call trigger_urgent_callback and confirm the booking.",
      responseChecks: [
        {
          type: "tool_called",
          name: "trigger_urgent_callback",
          description: "Agent must call trigger_urgent_callback",
        },
        {
          type: "regex",
          pattern: "booked|confirmed|scheduled|callback",
          flags: "i",
          description: "Response should mention booking confirmation",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "bookings row should exist for this intake and slot",
      query: `SELECT COUNT(*) AS result FROM bookings WHERE intake_request_id = '${JF_INTAKE_ID}' AND maestro_availability_id = '${JF_SLOT_ID}'`,
      expected: { result: 1 },
    },
    {
      description: "maestro_availability slot should be BOOKED",
      query: `SELECT status AS result FROM maestro_availability WHERE id = '${JF_SLOT_ID}'`,
      expected: { result: "BOOKED" },
    },
  ],
};

// ---------------------------------------------------------------------------
// JF-03: log_callback_outcome
// ---------------------------------------------------------------------------

export const jfLogCallbackOutcome: EvalScenario = {
  id: "journey-f-JF-03-log-outcome",
  name: "Journey-F JF-03: log callback outcome",
  type: "maestro",
  description:
    "After a callback, operator logs outcome 'converted' — bookings.outcome updated.",
  preSetup: (db, adminId) => seedJourneyFWithBooking(db, adminId),
  turns: [
    {
      userMessage: `Log the outcome for intake ${JF_INTAKE_ID} — they converted. Notes: 'Signed up for apprentice package.'`,
      expectedBehavior:
        "Agent should call log_callback_outcome and confirm the outcome was recorded.",
      responseChecks: [
        {
          type: "tool_called",
          name: "log_callback_outcome",
          description: "Agent must call log_callback_outcome",
        },
        {
          type: "regex",
          pattern: "converted|outcome|logged|recorded",
          flags: "i",
          description: "Response should mention the outcome",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "bookings.outcome should be 'converted'",
      query: `SELECT outcome AS result FROM bookings WHERE intake_request_id = '${JF_INTAKE_ID}'`,
      expected: { result: "converted" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const journeyFScenarios: EvalScenario[] = [
  jfFlagUrgentIntake,
  jfTriggerUrgentCallback,
  jfLogCallbackOutcome,
];
