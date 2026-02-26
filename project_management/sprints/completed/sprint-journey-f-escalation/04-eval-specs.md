# Sprint Journey-F: Urgent Escalation & Callback Tools — Eval Specs

Eval file: `src/evals/journey-f.eval.ts`
Seed: `src/evals/fixtures/journey-f-seeds.ts`

---

## Seed Helper: `journey-f-seeds.ts`

```typescript
export function seedJourneyFFixtures(db: Database) {
  // Users
  db.prepare(`INSERT OR IGNORE INTO users (id,email,role) VALUES
    ('u-jf-admin', 'jf-admin@test.com', 'ADMIN'),
    ('u-jf-lead',  'urgent@test.com',   'SUBSCRIBER')
  `).run();

  // Intake request
  db.prepare(`INSERT OR IGNORE INTO intake_requests (id,user_id,status,created_at) VALUES
    ('ir-jf-1','u-jf-lead','new',datetime('now','-1 day'))
  `).run();

  // Availability slot with capacity
  db.prepare(`INSERT OR IGNORE INTO availability_slots
    (id, start_at, end_at, capacity, booked_n) VALUES
    ('slot-jf-1', datetime('now','+2 days'), datetime('now','+2 days','+1 hour'), 1, 0)
  `).run();
}
```

---

## Eval JF-01: `flag-urgent-intake`

**Goal:** When an operator asks to flag an intake as urgent, the agent calls
`flag_urgent_intake`, updates `triage_tickets`, and writes a `UrgentIntakeFlagged`
feed event.

```typescript
{
  id: "journey-f-JF-01-flag-urgent",
  description: "Operator flags intake as urgent — triage updated, feed event written",
  callerId:    "u-jf-admin",
  callerRole:  "ADMIN",
  preSetup:    (db) => seedJourneyFFixtures(db),
  turns: [
    {
      role: "user",
      content: "Flag intake ir-jf-1 as urgent — this lead is ready to buy today.",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "flag_urgent_intake" },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM triage_tickets WHERE intake_id='ir-jf-1' AND priority='urgent'",
    },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM feed_events WHERE event_type='UrgentIntakeFlagged' AND payload LIKE '%ir-jf-1%'",
    },
    { type: "content-matches-regex", pattern: /urgent|flagged|priority/i },
  ],
},
```

---

## Eval JF-02: `trigger-urgent-callback-reserves-slot`

**Goal:** When the agent calls `trigger_urgent_callback`, the slot's `booked_n`
increments and a `bookings` row is created.

```typescript
{
  id: "journey-f-JF-02-trigger-callback",
  description: "Trigger urgent callback — slot booked, bookings row created",
  callerId:   "u-jf-admin",
  callerRole: "ADMIN",
  preSetup:   (db) => seedJourneyFFixtures(db),
  turns: [
    {
      role: "user",
      content: "Book slot slot-jf-1 as an urgent callback for intake ir-jf-1.",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "trigger_urgent_callback" },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM bookings WHERE intake_id='ir-jf-1' AND slot_id='slot-jf-1'",
    },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM availability_slots WHERE id='slot-jf-1' AND booked_n=1",
    },
    { type: "content-matches-regex", pattern: /booked|confirmed|scheduled|callback/i },
  ],
},
```

---

## Eval JF-03: `log-callback-outcome-recorded`

**Goal:** After a callback, the operator logs the outcome; the `bookings` row
is updated with the outcome field.

```typescript
{
  id: "journey-f-JF-03-log-outcome",
  description: "Callback outcome logged — bookings row updated",
  callerId:   "u-jf-admin",
  callerRole: "ADMIN",
  preSetup:   (db) => {
    seedJourneyFFixtures(db);
    // Pre-create the booking so we can log outcome
    db.prepare(`INSERT OR IGNORE INTO bookings
      (id, intake_id, slot_id, status, booked_at)
      VALUES ('book-jf-1','ir-jf-1','slot-jf-1','confirmed',datetime('now','-1 hour'))
    `).run();
  },
  turns: [
    {
      role: "user",
      content: "Log the outcome for intake ir-jf-1 — they converted. Notes: 'Signed up for apprentice package.'",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "log_callback_outcome" },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM bookings WHERE intake_id='ir-jf-1' AND outcome='converted'",
    },
    { type: "content-matches-regex", pattern: /converted|outcome|logged|recorded/i },
  ],
},
```
