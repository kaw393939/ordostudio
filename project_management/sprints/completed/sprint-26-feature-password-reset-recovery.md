# Sprint 26 — Feature: Password Reset + Recovery E2E

## Goal
Implement password reset/account recovery feature and its complete positive/negative E2E suite.

## Scope
- Add reset request flow (UI + API) and reset confirmation flow.
- Add secure reset token generation, expiry, one-time use, and invalidation.
- Add deterministic test token capture strategy for E2E (test inbox/mock channel).
- Add E2E tests for valid reset, expired token, reused token, unknown email, and rate limits.

## TDD Process
1. Write failing E2E tests for reset request/confirm happy path.
2. Write failing negative token/rate-limit scenarios.
3. Implement minimal backend/UI flow and token lifecycle.
4. Refactor for security and deterministic tests.

## Stories
- As a user, I can recover access when I forget my password.
- As security, I can trust token and abuse controls.

## Acceptance Criteria
- Password reset happy path passes E2E.
- Negative token misuse and abuse-limit tests pass.
- No sensitive token leakage occurs in UI/logs.

## End-of-Sprint Verification
```bash
npm run test -- e2e password-reset
npm run lint
npm run build
```

Pass condition:
- All Sprint 26 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
