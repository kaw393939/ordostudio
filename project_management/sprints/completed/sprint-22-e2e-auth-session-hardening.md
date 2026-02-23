# Sprint 22 — E2E Auth + Session Hardening

## Goal
Deliver complete positive/negative E2E coverage for register/login/logout/account/session expiry/CSRF/rate-limit behavior.

## Scope
- Add UI E2E tests for register → login → account and logout gating.
- Add negative tests for invalid credentials and friendly Problem Details rendering with `request_id`.
- Add E2E coverage for rate-limited login/register flows.
- Add E2E coverage for expired session and CSRF-safe mutation blocking behavior.

## TDD Process
1. Write failing tests for happy path auth journey.
2. Write failing tests for invalid credentials, 429, CSRF, and session expiry.
3. Implement minimal app/test harness updates for deterministic pass.
4. Refactor selectors, fixture helpers, and retries.

## Stories
- As a user, I can authenticate reliably.
- As a security reviewer, I can validate hardening behavior from the UI.

## Acceptance Criteria
- Register/login/logout/account E2E flow passes.
- Invalid auth + rate-limit + CSRF + expiry behaviors are covered and pass.
- Every surfaced auth error includes request correlation in UI.

## End-of-Sprint Verification
```bash
npm run test -- e2e auth session
npm run lint
npm run build
```

Pass condition:
- All Sprint 22 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
