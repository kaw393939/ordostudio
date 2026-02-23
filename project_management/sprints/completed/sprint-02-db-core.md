# Sprint 02 — Database Core (Status, Migrate, Seed, Doctor)

## Goal
Deliver reliable DB lifecycle primitives with idempotent behavior and strict health checks for SQLite production profile.

## Scope
- Implement `db status`, `db migrate`, `db seed`, `doctor`.
- Integrate Drizzle ORM + drizzle-kit migrations.
- Enforce/verify SQLite requirements (WAL, FK, busy timeout, path validity).
- Ensure seed is idempotent (roles and bootstrap data).
- Add fail-closed audit behavior for state-changing commands.

## TDD Process
For each command/edge case:
1. Write failing tests for success path and invariant violations.
2. Implement minimal behavior.
3. Add idempotency and rollback tests.
4. Refactor service interfaces with tests green.

Required test layers:
- Unit tests: pragma checks, migration status resolver.
- Integration tests: migrate/seed idempotency, doctor validation.
- Failure-path tests: audit failure causes command failure.

## Stories
- As an operator, I can confirm schema status before writes.
- As an operator, I can run migrations safely multiple times.
- As an operator, I can seed without duplicate corruption.
- As an operator, I can detect bad SQLite runtime settings.

## Acceptance Criteria
- `db migrate` is idempotent and audited.
- `db seed` is idempotent and audited.
- `doctor` fails when WAL/FK are not enabled.
- `doctor` fails on schema mismatch.
- Any audit write failure aborts mutation (fail-closed).
- Precondition failures return exit code `6`.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- db
npm run cli -- db status --env local
npm run cli -- db migrate --env local
npm run cli -- db migrate --env local
npm run cli -- db seed --env local
npm run cli -- db seed --env local
npm run cli -- doctor --env local --json
```

Pass condition (required to close sprint):
- 100% of Sprint 02 DB tests pass.
- Re-running migrate/seed yields no duplicates or corruption.
- All verification commands exit `0` for healthy setup.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Idempotency evidence is attached in sprint notes.
