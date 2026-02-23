# Sprint 27 — Feature: Email Verification + E2E

## Goal
Implement optional/common email verification lifecycle with robust E2E coverage.

## Scope
- Add verification token issue + confirm flow after registration.
- Add account state behavior for unverified/verified users.
- Add resend verification endpoint with rate limiting.
- Add E2E tests for verify success, expired link, resend, and unverified access restrictions.

## TDD Process
1. Write failing tests for verify-required registration behavior.
2. Write failing tests for verification link lifecycle and resend limits.
3. Implement feature minimally in auth/session and UI messaging.
4. Refactor and ensure compatibility with existing auth tests.

## Stories
- As a product owner, I can trust account email ownership before full access.
- As a user, I can recover from expired verification links.

## Acceptance Criteria
- Verification happy/negative paths pass E2E.
- Unverified behavior is explicit and deterministic.
- Resend flow is rate-limited and user-friendly.

## End-of-Sprint Verification
```bash
npm run test -- e2e email-verification
npm run lint
npm run build
```

Pass condition:
- All Sprint 27 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
