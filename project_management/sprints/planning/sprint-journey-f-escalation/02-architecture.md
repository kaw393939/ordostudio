# Sprint Journey-F: Urgent Escalation & Callback Tools — Architecture

## Journey F State Machine

```
[Intake arrives]
      │
      ▼
  flag_urgent_intake(intakeId, reason)
      │  Sets priority='urgent' on triage_tickets
      │  Fires UrgentIntakeFlagged feed event
      ▼
[Admin sees flag in ops dashboard]
      │
      ▼
  trigger_urgent_callback(intakeId, slotId)
      │  Books slot in transaction (booked_n++)
      │  Creates bookings row
      ▼
[Callback takes place]
      │
      ▼
  log_callback_outcome(intakeId, outcome, notes?)
      │  Updates bookings.outcome
      ▼
[Outcome recorded — funnel data complete]
```

## `flag_urgent_intake` DB Pattern

```sql
-- Upsert triage_tickets
INSERT INTO triage_tickets (id, intake_id, priority, created_at)
VALUES (?, ?, 'urgent', datetime('now'))
ON CONFLICT (intake_id)
DO UPDATE SET priority = 'urgent', updated_at = datetime('now');

-- Then write feed event
INSERT INTO feed_events (id, event_type, payload, created_at)
VALUES (?, 'UrgentIntakeFlagged', json(?), datetime('now'));
-- payload: { intakeId, reason, flaggedBy }
```

> Assumes `triage_tickets` has a unique constraint on `intake_id`.

## `trigger_urgent_callback` Transaction

```typescript
db.transaction(() => {
  const slot = db.prepare(`
    SELECT id, capacity, booked_n FROM availability_slots
    WHERE id = ?
  `).get(slotId);

  if (!slot) throw new Error("SLOT_NOT_FOUND");
  if (slot.booked_n >= slot.capacity) throw new Error("SLOT_CAPACITY_EXCEEDED");

  db.prepare(`
    UPDATE availability_slots SET booked_n = booked_n + 1 WHERE id = ?
  `).run(slotId);

  const bookingId = generateId();
  db.prepare(`
    INSERT INTO bookings (id, intake_id, slot_id, status, booked_at)
    VALUES (?, ?, ?, 'confirmed', datetime('now'))
  `).run(bookingId, intakeId, slotId);

  return { bookingId, slotId, intakeId };
})();
```

Note: This is the same transaction pattern as `add_availability_slot` in
Maestro-01 and the PE-02 policy eval. The guard is shared — no duplication.

## `log_callback_outcome` Pattern

```sql
UPDATE bookings
SET outcome = :outcome,
    outcome_notes = :notes,
    outcome_at = datetime('now')
WHERE intake_id = :intakeId
  AND status = 'confirmed';
-- affected_rows == 0 → { error: 'NO_BOOKING_FOUND' }
```

## `UrgentIntakeFlagged` Feed Event

```typescript
// In src/lib/events/feed-events-writers.ts

export function writeUrgentIntakeFlagged(
  db: Database,
  { intakeId, reason, flaggedBy }: { intakeId: string; reason: string; flaggedBy: string }
) {
  db.prepare(`
    INSERT INTO feed_events (id, event_type, payload, created_at)
    VALUES (?, 'UrgentIntakeFlagged', json(?), datetime('now'))
  `).run(generateId(), JSON.stringify({ intakeId, reason, flaggedBy }));
}
```

## File Map

```
src/lib/agent/tools/
  maestro-journey-f.ts             ← NEW (3 tools)
src/lib/events/
  feed-events-writers.ts           ← MODIFIED (+1 event type)
src/lib/agent/
  maestro-tools.ts                 ← MODIFIED (+3 tools → 46 total)
src/evals/
  journey-f.eval.ts                ← NEW (3 evals)
src/evals/fixtures/
  journey-f-seeds.ts               ← NEW
```
