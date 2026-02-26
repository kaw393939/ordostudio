# Sprint Journey-F: Urgent Escalation & Callback Tools — Sprint Plan

## Prerequisites
- [ ] Maestro-01 complete: `maestro-tools.ts`, `triage_tickets`, `availability_slots`,
  `bookings`, `feed_events` tables all present
- [ ] `feed-events-writers.ts` module identified
- [ ] `bookings` table has `outcome`, `outcome_notes`, `outcome_at` columns
  (if not: add inline migration 048 in this sprint)

## Tasks

### T0 — Schema check (15 min)
- [ ] Verify `bookings` table has `outcome` column: `PRAGMA table_info(bookings)`
- [ ] Verify `triage_tickets` has `priority` and unique constraint on `intake_id`
- [ ] If columns missing: create `048_bookings_outcome_triage_priority.ts` migration

### T1 — Implement 3 tools in `maestro-journey-f.ts` (1.5 h)
- [ ] `flagUrgentIntake`: upsert triage_tickets + write feed event
- [ ] `triggerUrgentCallback`: book slot in transaction (shared guard pattern)
- [ ] `logCallbackOutcome`: update bookings.outcome, handle NO_BOOKING_FOUND

### T2 — Add `UrgentIntakeFlagged` feed event writer (20 min)
- [ ] Add `writeUrgentIntakeFlagged(db, { intakeId, reason, flaggedBy })` to
  `feed-events-writers.ts`

### T3 — Update system prompt (15 min)
- [ ] Add Rule 7 to ops agent system prompt (see [03-tool-specs.md](03-tool-specs.md))
- [ ] Ensure prompt file is updated (not hardcoded in route)

### T4 — Register in `maestro-tools.ts` (15 min)
- [ ] Import + register 3 new tools
- [ ] Assert total = 46

### T5 — Seed fixture + evals (1.5 h)
- [ ] `journey-f-seeds.ts`
- [ ] `journey-f.eval.ts` (JF-01, JF-02, JF-03)
- [ ] Run: `npm run evals -- --file journey-f`

### T6 — Full test suite + build
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TSC errors

### T7 — Commit
```bash
git add src/lib/agent/tools/maestro-journey-f.ts \
        src/lib/events/feed-events-writers.ts \
        src/lib/agent/maestro-tools.ts \
        src/evals/journey-f.eval.ts \
        src/evals/fixtures/journey-f-seeds.ts
# If migration needed:
git add src/lib/db/migrations/048_bookings_outcome_triage_priority.ts
git commit -m "feat(agent): Journey F escalation tools — flag urgent, callback, outcome (3 tools, 3 evals)"
```

## Definition of Done
- [ ] 3 tools callable via ops agent
- [ ] JF-01: `triage_tickets` row present + feed event written
- [ ] JF-02: `bookings` row created + `booked_n` incremented
- [ ] JF-03: `bookings.outcome` updated to 'converted'
- [ ] System prompt Rule 7 added
- [ ] `npm test` 1714+/1715, build clean
- [ ] Total tool count = 46
