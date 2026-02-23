# Sprint 15 — Auth Pages + Account

## Goal
Implement UI auth entry points and account surfaces using session-based API flows and robust Problem Details handling.

## Scope
- Implement `/login` and `/register` using React Hook Form + Zod.
- Implement `/account` page for current user profile and basic registration summary.
- Handle auth/session transitions cleanly (logged in/out states).
- Surface rate-limit and auth errors with friendly messages and request IDs.

## TDD Process
1. Write failing form validation tests for login/register.
2. Write failing integration tests for success/error auth flows.
3. Write failing tests for `/account` authenticated gating.
4. Implement and refactor with green tests.

## Stories
- As a new user, I can register and sign in.
- As an existing user, I can log in and access my account.
- As a user, I receive clear errors for invalid credentials and throttling.

## Acceptance Criteria
- Login/register submit to API and handle Problem Details consistently.
- `/account` requires session and renders user data from `/api/v1/me`.
- Rate-limit (`429`) feedback is user-friendly.
- Request IDs are visible on surfaced errors.

## End-of-Sprint Verification
```bash
npm run test -- auth-ui account-ui
npm run lint
npm run build
```
Manual checks:
- Register -> login -> account.
- Verify invalid credentials and rate-limit UX.

Pass condition:
- All Sprint 15 tests pass.
- Auth/session UX contract validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
