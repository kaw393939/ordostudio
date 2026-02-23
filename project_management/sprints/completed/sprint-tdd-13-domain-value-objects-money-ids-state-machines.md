# Sprint TDD-13 — Domain Value Objects (Money/Ids) + State Machines

## Goal
Move critical invariants into the model (value objects + state transitions) so business rules are explicit, testable, and less scattered.

## Why (Uncle Bob + Booch)
- **Bob:** business rules should be the most protected code; push policy inward.
- **Booch:** make the object model expressive; let objects own invariants and behaviors.

## Scope
- Introduce value objects:
  - `Money` (amount + currency, formatting, safe arithmetic)
  - typed IDs for key aggregates (`UserId`, `DealId`, `LedgerEntryId`, etc.)
- Introduce explicit state transition helpers/state machines for:
  - Deal lifecycle (if not already explicit)
  - Ledger entry lifecycle (`EARNED → APPROVED → PAID` and voiding rules)
  - Connect onboarding state (`NOT_STARTED/PENDING/COMPLETE`) as a model rule
- Refactor core use-cases (and then app/lib/api) to consume these value objects.

## Non-Goals
- No UI redesign.
- No new product features.

## TDD Process
1. Write failing unit tests for the value objects and transition guards.
2. Port one slice (ledger) to use the new model (tests first).
3. Expand to payments/connect as needed.

## Acceptance Criteria
- Money and key transitions are enforced in one place (not repeated across routes).
- Tests cover transition edges (invalid transitions, currency mismatch, negative amounts).
- `npm test`, `npm run lint`, `npm run build` all pass.

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
