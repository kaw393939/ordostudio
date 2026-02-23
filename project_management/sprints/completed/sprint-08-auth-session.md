# Sprint 08 — Auth & Session (UI-Ready)

## Goal
Implement secure browser-ready authentication and identity endpoints (`register/login/logout/me`) with session cookies, CSRF-safe mutation patterns, and role-aware HAL affordances.

## Scope
- Integrate Auth.js credentials flow for session-based auth.
- Implement password hashing (argon2id preferred, fallback bcrypt only if justified).
- Build endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/me`
- Configure secure cookie policy:
  - `HttpOnly`
  - `Secure` in prod
  - `SameSite=Lax` (or stricter where validated)
- Ensure CSRF-safe mutation behavior.
- Ensure no super-admin escalation paths via API.

## TDD Process
For each endpoint and auth guard:
1. Write failing auth/session contract tests.
2. Implement minimal pass behavior.
3. Add CSRF and cookie-flag regression tests.
4. Refactor with green tests and unchanged contracts.

Required test layers:
- Contract tests for auth endpoint responses and status codes.
- Security tests for cookie flags and session lifecycle.
- RBAC tests for `/me` affordance links.

## Stories
- As a user, I can register and login through browser-safe sessions.
- As a user, I can logout and invalidate my session.
- As a client app, I can query `/me` and discover allowed actions.
- As security reviewers, we can verify cookie and CSRF protections.

## Acceptance Criteria
- Register creates `USER` role account with expected status.
- Login sets correct secure session cookie semantics.
- Logout clears session.
- `/me` returns role-aware HAL links.
- Mutating auth routes are CSRF-safe.
- No endpoint grants SUPER_ADMIN or token issuance via HTTP API.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- auth session me
npm run lint
npm run build
npm run dev
# manual/API checks:
# POST /api/v1/auth/register
# POST /api/v1/auth/login
# GET /api/v1/me
# POST /api/v1/auth/logout
```

Pass condition (required to close sprint):
- 100% of Sprint 08 tests pass.
- Session lifecycle and cookie security checks pass.
- `/me` links correctly reflect role permissions.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Security checklist for auth/session is fully green.
