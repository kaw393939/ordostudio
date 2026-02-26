# Sprint Journey-F: Urgent Escalation & Callback Tools — Overview

## Status
**NOT STARTED** | Priority: 🟠 P1 | Depends on: Maestro-01 + Maestro-02 complete (ships immediately after)

## One-Liner
Close the Journey F gap identified in the reconciliation report: high-intent leads
that are not converting because there is no mechanism to flag urgency, reserve a
callback slot, and record the outcome — resulting in lost revenue.

## Why This Sprint Exists
From the reconciliation report:
> "Journey F — Urgent Escalation: higher-risk gap. High-intent leads who try to
> express urgency get the same response as low-intent leads. No escalation path
> means these leads drop off or go to a competitor."

This sprint implements three tools that together constitute the urgency escalation
path:
1. `flag_urgent_intake` — marks an intake as high-priority; fires a feed event
2. `trigger_urgent_callback` — reserves an availability slot for the lead
3. `log_callback_outcome` — records what happened (converted, no-show, etc.)

## Scope Boundaries
| In scope | Out of scope |
|---|---|
| 3 escalation tools | SMS/email notification sending |
| `UrgentIntakeFlagged` feed event | Real-time push notification to admin |
| `triage_tickets.priority` enforcement | SLA timer / auto-escalation cron |
| 3 evals (JF-01 through JF-03) | CRM integration |

## Inputs Required
- Maestro-01 complete: `maestro-tools.ts` exists, `triage_tickets` and
  `availability_slots` tables present
- `feed_events` table + writer pattern from Maestro-01

## Outputs Produced
- 3 new tools in `src/lib/agent/tools/maestro-journey-f.ts`
- `UrgentIntakeFlagged` feed event type
- 3 evals: JF-01, JF-02, JF-03
- Total tools in ops agent: 10 → 13

## Estimated Effort
| Role | Hours |
|---|---|
| Backend | 3 h |
| Feed event | 30 min |
| Evals | 1.5 h |
| Total | 5 h |

## Risk
**Medium.** `trigger_urgent_callback` modifies `availability_slots.booked_n` and
creates a booking row in a transaction. Must share the same slot-booking transaction
guard as the double-booking PE-02 eval to avoid a race condition.
