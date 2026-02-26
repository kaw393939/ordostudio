/**
 * Event-Management eval scenarios (4 total)
 *
 * EM-01: create_event             — new event created in DB
 * EM-02: update_event             — event capacity updated
 * EM-03: get_event_attendance     — returns registration count
 * EM-04: list_registered_attendees — returns attendee email
 */

import type Database from "better-sqlite3";
import type { EvalScenario } from "../types";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

interface SeedEventOptions {
  id?: string;
  title?: string;
  capacity?: number;
  start_at?: string;
}

function seedEvent(
  db: Database.Database,
  overrides: SeedEventOptions = {},
): string {
  const id = overrides.id ?? "event-seed-em-01";
  const title = overrides.title ?? "AI Workshop";
  const capacity = overrides.capacity ?? 20;
  const start_at = overrides.start_at ?? "2026-04-01T09:00:00Z";
  const slug = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${id.slice(-6)}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR REPLACE INTO events
       (id, slug, title, start_at, end_at, timezone, status, capacity, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'UTC', 'published', ?, ?, ?)`,
  ).run(id, slug, title, start_at, start_at, capacity, now, now);

  return id;
}

// ---------------------------------------------------------------------------
// EM-01: create_event — new event written to DB
// ---------------------------------------------------------------------------

export const emCreateEvent: EvalScenario = {
  id: "events-EM-01-create",
  name: "Event-Management EM-01: create a new event",
  type: "maestro",
  description: "Agent creates a new workshop via create_event.",
  turns: [
    {
      userMessage:
        "Create a new workshop called 'Intro to AI' for April 15th 2026 at 10am, capacity 25",
      expectedBehavior:
        "Agent should call create_event and confirm the event was created with capacity 25.",
      responseChecks: [
        {
          type: "tool_called",
          name: "create_event",
          description: "Agent must call create_event",
        },
        {
          type: "regex",
          pattern: "intro to ai|created|workshop",
          flags: "i",
          description: "Response should confirm creation",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "Intro to AI event should exist",
      query: "SELECT COUNT(*) AS result FROM events WHERE title = 'Intro to AI'",
      expected: { result: 1 },
    },
    {
      description: "Event capacity should be 25",
      query: "SELECT capacity AS result FROM events WHERE title = 'Intro to AI'",
      expected: { result: 25 },
    },
  ],
};

// ---------------------------------------------------------------------------
// EM-02: update_event — capacity bumped
// ---------------------------------------------------------------------------

export const emUpdateEvent: EvalScenario = {
  id: "events-EM-02-update",
  name: "Event-Management EM-02: update event capacity",
  type: "maestro",
  description: "Agent updates an event's capacity via update_event.",
  preSetup: (db) => {
    seedEvent(db, { id: "event-em-02", title: "Spring Cohort", capacity: 10 });
  },
  turns: [
    {
      userMessage:
        "Update the Spring Cohort event (ID: event-em-02) to increase capacity to 30",
      expectedBehavior:
        "Agent should call update_event with eventId='event-em-02' and capacity=30.",
      responseChecks: [
        {
          type: "tool_called",
          name: "update_event",
          description: "Agent must call update_event",
        },
        {
          type: "regex",
          pattern: "updated|capacity|30",
          flags: "i",
          description: "Response should confirm the capacity change",
        },
      ],
    },
  ],
  dbAssertions: [
    {
      description: "Event capacity should be updated to 30",
      query: "SELECT capacity AS result FROM events WHERE id = 'event-em-02'",
      expected: { result: 30 },
    },
  ],
};

// ---------------------------------------------------------------------------
// EM-03: get_event_attendance — returns registration count
// ---------------------------------------------------------------------------

export const emGetEventAttendance: EvalScenario = {
  id: "events-EM-03-attendance",
  name: "Event-Management EM-03: get event attendance",
  type: "maestro",
  description: "Agent reports attendance count for an event.",
  preSetup: (db, adminId) => {
    const eid = seedEvent(db, { id: "event-em-03", capacity: 20 });
    const now = new Date().toISOString();

    // Seed 5 users (FK required by event_registrations)
    for (let i = 0; i < 5; i++) {
      db.prepare(
        `INSERT OR IGNORE INTO users (id, email, status, created_at, updated_at)
         VALUES (?, ?, 'ACTIVE', ?, ?)`,
      ).run(`user-em-03-${i}`, `em03-user-${i}@example.com`, now, now);
    }

    // Seed 5 registrations
    for (let i = 0; i < 5; i++) {
      db.prepare(
        `INSERT OR IGNORE INTO event_registrations (id, event_id, user_id, status)
         VALUES (?, ?, ?, 'registered')`,
      ).run(`er-em-03-${i}`, eid, `user-em-03-${i}`);
    }

    void adminId;
  },
  turns: [
    {
      userMessage: "How many people are registered for the AI Workshop (event-em-03)?",
      expectedBehavior:
        "Agent should call get_event_attendance and mention 5 registrations.",
      responseChecks: [
        {
          type: "tool_called",
          name: "get_event_attendance",
          description: "Agent must call get_event_attendance",
        },
        {
          type: "contains",
          value: "5",
          description: "Response should mention 5 registered attendees",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// EM-04: list_registered_attendees — returns attendee emails
// ---------------------------------------------------------------------------

export const emListAttendees: EvalScenario = {
  id: "events-EM-04-attendees",
  name: "Event-Management EM-04: list registered attendees",
  type: "maestro",
  description: "Agent lists attendees of an event by email.",
  preSetup: (db, adminId) => {
    const eid = seedEvent(db, { id: "event-em-04", capacity: 20 });
    const now = new Date().toISOString();

    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, status, created_at, updated_at)
       VALUES ('usr-em-04', 'attendee@example.com', 'ACTIVE', ?, ?)`,
    ).run(now, now);

    db.prepare(
      `INSERT OR IGNORE INTO event_registrations (id, event_id, user_id, status)
       VALUES ('er-em-04', ?, 'usr-em-04', 'registered')`,
    ).run(eid);

    void adminId;
  },
  turns: [
    {
      userMessage: "Who is registered for the AI Workshop (event-em-04)?",
      expectedBehavior:
        "Agent should call list_registered_attendees and return attendee@example.com.",
      responseChecks: [
        {
          type: "tool_called",
          name: "list_registered_attendees",
          description: "Agent must call list_registered_attendees",
        },
        {
          type: "contains",
          value: "attendee@example.com",
          description: "Response should mention the registered attendee's email",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const eventScenarios: EvalScenario[] = [
  emCreateEvent,
  emUpdateEvent,
  emGetEventAttendance,
  emListAttendees,
];
