# Sprint Journey-F: Urgent Escalation & Callback Tools — Spec

## Objective
Give operators the ability to flag high-intent leads as urgent, immediately
assign them a callback slot, and record the outcome — closing the Journey F
conversion gap.

## Acceptance Criteria

### AC-1  `flag_urgent_intake`
- [ ] Accepts `intakeId`, `reason: string`
- [ ] Sets `triage_tickets.priority = 'urgent'` for the intake's triage row
  (creates one if not present)
- [ ] Fires `UrgentIntakeFlagged` feed event with `payload: { intakeId, reason, flaggedBy }`
- [ ] Returns `{ intakeId, priority: 'urgent', flaggedAt }`

### AC-2  `trigger_urgent_callback`
- [ ] Accepts `intakeId`, `slotId`
- [ ] Books the availability slot in a transaction (using the same
  `booked_n < capacity` guard as the standard booking flow)
- [ ] Creates a `bookings` row linking `intake_id` to `slot_id`
- [ ] Returns `{ bookingId, slotId, intakeId, bookedAt }`

### AC-3  `log_callback_outcome`
- [ ] Accepts `intakeId`, `outcome: 'converted' | 'no_show' | 'rescheduled' | 'declined'`, `notes?: string`
- [ ] Updates `bookings` row for that intake: `outcome = outcome`, `notes = notes`
- [ ] If no booking exists for that intake → returns `{ error: 'NO_BOOKING_FOUND' }`
- [ ] Returns `{ intakeId, outcome, loggedAt }`

### AC-4  `UrgentIntakeFlagged` feed event
- [ ] Added to `feed_events` writer module
- [ ] Payload: `{ intakeId: string, reason: string, flaggedBy: string }`
- [ ] `event_type = 'UrgentIntakeFlagged'`

## New Files
```
src/lib/agent/tools/maestro-journey-f.ts
src/evals/fixtures/journey-f-seeds.ts
src/evals/journey-f.eval.ts
```

## Modified Files
```
src/lib/agent/maestro-tools.ts          ← register 3 tools (→ 46 total)
src/lib/events/feed-events-writers.ts   ← add UrgentIntakeFlagged writer
```

## Non-Goals
- No SMS/email sending
- No SLA timer or auto-escalation
- No new DB migrations (uses `triage_tickets`, `bookings`, `availability_slots`
  already present from earlier migrations; creates `triage_tickets` row if absent)
