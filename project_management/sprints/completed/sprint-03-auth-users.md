# Sprint 03 — Auth Tokens & User Management

## Goal
Implement super-admin token operations and user/role commands with permission rails aligned to environment policy.

## Scope
- Implement token commands:
  - `auth token create`
  - `auth token revoke`
- Implement user commands:
  - `user create`, `user list`, `user show`
  - `user disable`, `user enable`
  - `user role add`, `user role remove`
- Enforce role and token checks for write operations in staging/prod.
- Ensure token hashing at rest and one-time token display.
- Audit all state mutations.

## TDD Process
- Write failing tests for each command and permission branch first.
- Add tests for token hashing and revocation behavior.
- Add tests for role assignment uniqueness and conflict handling.
- Refactor services only with green test suite.

Required test layers:
- Unit tests: permission guard, role resolver, token verifier.
- Integration tests: command-to-service wiring, audit writes.
- Security tests: no plaintext token persistence.

## Stories
- As a super-admin, I can issue and revoke service tokens.
- As an admin, I can create and manage user status.
- As a super-admin, I can assign/revoke roles safely.
- As operator, I can trust mutation auditability.

## Acceptance Criteria
- Token is shown once on create; only hash stored.
- Revoked token cannot authorize writes.
- User create enforces unique email.
- Role add/remove are idempotent and audited.
- Staging/prod write commands fail with exit code `3` when unauthorized.
- Not-found and conflict paths return specified exit codes.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- auth user
npm run cli -- auth token create --name sprint3 --env local --json
npm run cli -- user create --email admin@example.com --status ACTIVE --env local
npm run cli -- user role add --id <USER_ID> --role ADMIN --env local
npm run cli -- user disable --id <USER_ID> --reason "verification" --env local
npm run cli -- auth token revoke --id <TOKEN_ID> --env local
```

Pass condition (required to close sprint):
- 100% of Sprint 03 tests pass.
- Authorization and revocation checks behave as expected.
- All verification commands exit `0` for expected paths.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Security review checklist items are complete.
