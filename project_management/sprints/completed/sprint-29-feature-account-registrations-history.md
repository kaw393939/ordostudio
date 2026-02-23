# Sprint 29 — Feature: Account Registrations History + E2E

## Goal
Upgrade `/account` into a complete “My registrations” experience with privacy-safe E2E coverage.

## Scope
- Add account registrations list/history across events with current status.
- Ensure status updates reflect cancel/check-in lifecycle changes.
- Add clear empty/loading/error states using Problem Details patterns.
- Add privacy tests proving users cannot access other users’ registration data.

## TDD Process
1. Write failing tests for account history rendering and state updates.
2. Write failing privacy/authorization negative tests.
3. Implement account history UI + API integration.
4. Refactor selectors/helpers and stabilize data setup.

## Stories
- As a user, I can view my complete registration history.
- As a privacy reviewer, I can verify strict per-user data isolation.

## Acceptance Criteria
- Account history E2E tests pass for normal and empty datasets.
- Lifecycle state updates are visible without data leakage.
- Privacy negative tests pass.

## End-of-Sprint Verification
```bash
npm run test -- e2e account-registrations
npm run lint
npm run build
```

Pass condition:
- All Sprint 29 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
