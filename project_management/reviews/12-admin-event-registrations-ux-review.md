# UX Review — Admin Event Registrations

- Route: `/admin/events/[slug]/registrations`
- Audience: Admin operations staff (high-throughput, time-sensitive)
- Overall score: 7.5/10

## Critical findings (severity-ranked)
- P1: Bulk actions execute sequentially with minimal failure transparency.
  - Risk: Partial completion without clear per-user failure reporting creates operational ambiguity.
- P1: Action mode and selection model are easy to misread under pressure.
  - Risk: Admins may run bulk check-in/cancel on unintended subsets.
- P2: Check-in and cancel actions are visually similar and both always visible.
  - Risk: Preventable misclicks during live event operations.
- P2: Feedback toasts are transient and not tied to durable history.
  - Risk: Operators lose confidence about what actually happened.

## Observed strengths
- Good filter/search controls and useful status model.
- Table semantics are solid and include guidance column.
- Empty-state guidance is present and actionable.

## Key UX breakdowns
### 1) Safety and reversibility
- No robust pre-flight summary before bulk actions (count + exact affected users).
- No post-action reconciliation panel (success count, failures, retriable list).

### 2) High-pressure usability
- Dense command surface increases error probability during check-in waves.
- Selection state is not anchored with a persistent “N selected” control bar.

### 3) Visibility of system status
- Single generic feedback string is insufficient for operational audits.
- No durable operation log in-context.

## Recommendations
### Immediate (this sprint)
- Add destructive-action confirmation for bulk cancel and include affected-count preview.
- Add persistent “selection bar” with selected count and explicit target scope (filtered vs selected).
- Split primary/secondary action hierarchy visually (check-in primary, cancel danger).
- Add per-action result summary card with success/failure breakdown and retry affordance.

### Near-term
- Add undo window for accidental cancel where business rules permit.
- Add keyboard shortcuts for check-in mode and row actions with visible legend.
- Add sticky table header and row density modes for event-day operations.

## Acceptance criteria for UX hardening
- Operators can clearly predict who will be affected before any bulk action.
- Every batch action leaves a durable, reviewable result summary.
- Misclick rate in live check-in sessions is materially reduced.
