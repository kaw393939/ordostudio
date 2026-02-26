# Sprint Event-Management — Eval Specs

Eval file: `src/evals/scenarios/events.ts`
Eval type: `events`

**New evals:** 4
Register type in `src/evals/run.ts`. Add script:
```json
"evals:events": "tsx src/evals/run.ts --type events"
```

---

## Seed Helper

```typescript
export function seedEvent(db: Database, overrides: Partial<Event> = {}) {
  const id = overrides.id ?? 'event-seed-em-01';
  db.prepare(`
    INSERT OR REPLACE INTO events (id, title, description, start_at, capacity, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'published', datetime('now'))
  `).run(id, overrides.title ?? 'AI Workshop', overrides.description ?? 'Test event', overrides.start_at ?? '2026-04-01T09:00:00Z', overrides.capacity ?? 20);
  return id;
}
```

---

## Eval EM-01: `create-event`

```typescript
{
  id: "events-EM-01-create",
  type: "events",
  description: "Agent creates a new event via create_event",
  turns: [
    {
      role: "user",
      content: "Create a new workshop called 'Intro to AI' for April 15th 2026 at 10am, capacity 25",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "create_event" },
    { type: "db-assert", query: "SELECT COUNT(*) as n FROM events WHERE title = 'Intro to AI'", expect: { n: 1 } },
    { type: "db-assert", query: "SELECT capacity FROM events WHERE title = 'Intro to AI'", expect: { capacity: 25 } },
  ],
},
```

---

## Eval EM-02: `update-event`

```typescript
{
  id: "events-EM-02-update",
  type: "events",
  description: "Agent updates an event's capacity",
  preSetup: (db) => seedEvent(db, { id: 'event-em-02', title: 'Spring Cohort', capacity: 10 }),
  turns: [
    {
      role: "user",
      content: "Update the Spring Cohort event to increase capacity to 30",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "update_event" },
    { type: "db-assert", query: "SELECT capacity FROM events WHERE id = 'event-em-02'", expect: { capacity: 30 } },
  ],
},
```

---

## Eval EM-03: `get-event-attendance`

```typescript
{
  id: "events-EM-03-attendance",
  type: "events",
  description: "Agent reports event attendance count",
  preSetup: (db) => {
    const eid = seedEvent(db, { id: 'event-em-03', capacity: 20 });
    // Seed 5 registrations
    for (let i = 0; i < 5; i++) {
      db.prepare("INSERT INTO event_registrations (id, event_id, user_id, status) VALUES (?, ?, 'user-seed-' || ?, 'registered')").run(`er-em-03-${i}`, eid, i);
    }
  },
  turns: [
    { role: "user", content: "How many people are registered for the AI Workshop?" },
  ],
  assertions: [
    { type: "tool-called", toolName: "get_event_attendance" },
    { type: "content-contains", substring: "5", description: "Should mention 5 registered" },
  ],
},
```

---

## Eval EM-04: `list-attendees`

```typescript
{
  id: "events-EM-04-attendees",
  type: "events",
  description: "Agent lists registered attendees",
  preSetup: (db) => {
    const eid = seedEvent(db, { id: 'event-em-04', capacity: 20 });
    db.prepare("INSERT OR IGNORE INTO users (id, email, role) VALUES ('usr-em-04', 'attendee@example.com', 'USER')").run();
    db.prepare("INSERT INTO event_registrations (id, event_id, user_id, status) VALUES ('er-em-04', ?, 'usr-em-04', 'registered')").run(eid);
  },
  turns: [
    { role: "user", content: "Who is registered for the AI Workshop?" },
  ],
  assertions: [
    { type: "tool-called", toolName: "list_registered_attendees" },
    { type: "content-contains", substring: "attendee@example.com" },
  ],
},
```
