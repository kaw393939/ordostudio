# Sprint 32 — Feature: Compliance Basics (Terms/Privacy/Retention) + E2E

## Goal
Implement core compliance UX/API surfaces and validate them with E2E release checks.

## Scope
- Add Terms/Privacy routes and link integration in auth/account flows.
- Add registration acknowledgment checkbox flow if required.
- Implement baseline retention-aware account/data handling required by product scope.
- Add E2E tests for policy access, required acknowledgments, and retention/deletion constraints.
- Include final escalation-surface verification (no CLI-only dangerous operations exposed).

## TDD Process
1. Write failing tests for policy page availability and required acknowledgments.
2. Write failing retention/deletion and escalation-surface tests.
3. Implement minimal compliance features and UI affordances.
4. Refactor and run full release regression.

## Stories
- As a user, I can review product policies and consent where required.
- As release/compliance owner, I can validate baseline policy and retention behaviors.

## Acceptance Criteria
- Terms/Privacy and acknowledgment tests pass.
- Retention/deletion behaviors meet defined policy tests.
- Escalation-surface checks pass in final E2E gate.

## End-of-Sprint Verification
```bash
npm run test -- e2e compliance release
npm run lint
npm run build
```

Pass condition:
- All Sprint 32 tests and verification commands pass.
- UI+API E2E backlog from Letter 4 is fully planned and implementable.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
