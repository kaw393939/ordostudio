# Sprint 05 — Registrations, Check-in, Export

## Goal
Implement registration workflows with capacity/waitlist behavior, check-in flow, and governed export outputs with PII controls.

## Scope
- Implement commands:
  - `reg add`, `reg remove`, `reg list`
  - `checkin`
  - `event export`
- Enforce capacity rule: full event => `WAITLISTED`.
- Enforce no hard delete on remove (`CANCELLED` state transition).
- Implement export to CSV/JSON with security redaction rules.
- Require token for `--include-email` outside local.

## TDD Process
- Begin with failing tests for capacity and state transitions.
- Add regression tests for duplicate registration attempts.
- Add authorization/redaction tests for PII export paths.
- Refactor internals with no contract breakage.

Required test layers:
- Unit tests: status transitions and export formatter.
- Integration tests: event capacity scenarios and check-in behavior.
- Security tests: PII redaction without proper token context.

## Stories
- As an admin, I can register users and respect capacity limits.
- As an admin, I can cancel registrations without deleting history.
- As staff, I can check users in at event time.
- As operator, I can export registration data safely.

## Acceptance Criteria
- Full events place new registrations in `WAITLISTED`.
- `reg remove` transitions status to `CANCELLED`.
- `checkin` transitions to `CHECKED_IN` from allowed states.
- Export supports CSV/JSON and writes file correctly.
- PII behavior follows token + environment rules.
- All mutations are audited.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- registration export
npm run cli -- reg add --event spring-launch --user admin@example.com --env local
npm run cli -- reg list --event spring-launch --env local --json
npm run cli -- checkin --event spring-launch --user admin@example.com --env local
npm run cli -- event export --slug spring-launch --format csv --out ./tmp/spring-launch.csv --env local
npm run cli -- event export --slug spring-launch --format json --out ./tmp/spring-launch.json --env local
```

Pass condition (required to close sprint):
- 100% of Sprint 05 tests pass.
- Capacity/waitlist and check-in rules behave correctly.
- All verification commands exit `0` and output files are generated.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Export governance checks are documented and approved.
