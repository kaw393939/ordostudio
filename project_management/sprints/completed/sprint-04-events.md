# Sprint 04 — Event Lifecycle

## Goal
Deliver robust event lifecycle commands with validation, idempotent publish behavior, and full mutation auditing.

## Scope
- Implement commands:
  - `event create`
  - `event update`
  - `event publish`
  - `event cancel`
  - `event list`
- Enforce slug uniqueness and time validation.
- Ensure publish is idempotent and audited.
- Ensure cancellation reason requirements and audit metadata.

## TDD Process
- Start each command with failing contract tests.
- Add edge-case tests for date/timezone and conflict behavior.
- Add idempotency tests for repeated publish/cancel attempts.
- Refactor service layer with unchanged command contract.

Required test layers:
- Unit tests: input validation and state transitions.
- Integration tests: create→update→publish→cancel flow.
- Audit tests: every mutation creates audit log.

## Stories
- As an admin, I can create events in `DRAFT` state.
- As an admin, I can publish an event safely once.
- As an admin, I can cancel with an explicit reason.
- As an operator, I can list by status/date filters.

## Acceptance Criteria
- Event create enforces required fields and valid ISO times.
- Update modifies only provided fields.
- Publish is idempotent and audited.
- Cancel sets `CANCELLED` and stores audit reason metadata.
- List supports status/from/to filters.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- event
npm run cli -- event create --slug spring-launch --title "Spring Launch" --start 2026-04-01T14:00:00Z --end 2026-04-01T15:00:00Z --tz UTC --env local
npm run cli -- event publish --slug spring-launch --env local
npm run cli -- event publish --slug spring-launch --env local
npm run cli -- event cancel --slug spring-launch --reason "verification" --env local
npm run cli -- event list --status CANCELLED --env local --json
```

Pass condition (required to close sprint):
- 100% of Sprint 04 tests pass.
- Repeated publish does not duplicate or corrupt state.
- All verification commands exit `0` for expected paths.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Event domain invariants are documented.
