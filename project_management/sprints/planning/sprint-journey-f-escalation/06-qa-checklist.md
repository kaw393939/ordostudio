# Sprint Journey-F: Urgent Escalation & Callback Tools — QA Checklist

## Pre-Deploy
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TypeScript errors
- [ ] 3 evals pass: JF-01, JF-02, JF-03
- [ ] Tool count = 46

## Schema Verification
```sql
PRAGMA table_info(triage_tickets);
-- Expect: priority column present

PRAGMA table_info(bookings);
-- Expect: outcome, outcome_notes, outcome_at columns present

SELECT name FROM sqlite_master WHERE type='index'
AND tbl_name='triage_tickets' AND sql LIKE '%intake_id%';
-- Expect: unique index on intake_id
```

## Tool Behaviour Spot-Checks

### `flag_urgent_intake`
- [ ] Valid call → `triage_tickets.priority = 'urgent'` for `intake_id`
- [ ] Calling twice for same intake → upsert (no duplicate rows, second call still succeeds)
- [ ] `UrgentIntakeFlagged` feed event written with correct `intakeId` in payload
- [ ] Non-ADMIN caller → FORBIDDEN, no DB change

### `trigger_urgent_callback`
- [ ] Valid call → `bookings` row created, `availability_slots.booked_n` incremented
- [ ] Second call for same fully-booked slot → `SLOT_CAPACITY_EXCEEDED` error
- [ ] `SLOT_NOT_FOUND` for invalid slot ID

### `log_callback_outcome`
- [ ] Valid outcome types: `converted`, `no_show`, `rescheduled`, `declined`
- [ ] No booking for intake → `{ error: 'NO_BOOKING_FOUND' }` (not throw)
- [ ] `notes` field stored correctly

## Eval Gate
| Eval | Expected | Pass? |
|------|----------|-------|
| JF-01 flag-urgent | triage row + feed event | |
| JF-02 trigger-callback | bookings row + booked_n++ | |
| JF-03 log-outcome | bookings.outcome='converted' | |

## System Prompt Check
- [ ] Ops agent system prompt contains Rule 7 (urgency → flag_urgent_intake)
- [ ] Rule 7 does not conflict with existing rules 1–6

## Regression Checks
- [ ] PE-02 double-booking policy eval still passes (shared slot guard)
- [ ] Maestro-01 evals (A1–E2) still pass
- [ ] Maestro-03 evals (F1–F4) still pass

## Final Sprint Summary
After this sprint, the full planned tool suite is complete:

| Module | Tools |
|---|---|
| Ops Agent (Maestro-01) | 25 |
| Intelligence (Maestro-03) | 4 |
| Membership (Persona-01) | 8 |
| Affiliate (Persona-02) | 5 |
| Vector Memory (Vec-02) | 1 |
| Journey F (this sprint) | 3 |
| **Total** | **46** |

**Evals milestones:**
- Baseline: 13
- After all sprints: ~70+

## Accept / Reject
| Check | Result |
|---|---|
| All 3 evals pass | |
| Feed event written for flag_urgent | |
| Slot booking transaction guard intact | |
| System prompt Rule 7 added | |
| Total tools = 46 | |
| Build clean | |
| No test regression | |
