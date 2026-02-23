# Sprint 12 — API Hardening, Security Regression, Release Readiness

## Goal
Harden API operations for production with abuse controls, defense-in-depth authorization enforcement, and release-ready operational runbooks.

## Scope
- Implement initial rate limiting for:
  - login
  - register
  - export endpoints
- Enforce security headers and no-store cache rules for auth/user endpoints.
- Ensure authorization checks are enforced in handlers (not middleware-only reliance).
- Add API-focused production runbooks and release checklist.
- Expand regression suite for auth bypass and edge-case security paths.

## TDD Process
1. Write failing security/abuse tests first.
2. Implement minimal controls to satisfy contracts.
3. Add regression tests for bypass patterns.
4. Refactor with full-suite green and no contract drift.

Required test layers:
- Rate-limit behavior tests.
- Handler-level auth enforcement tests.
- Problem Details consistency tests for blocked requests.

## Stories
- As security, I can trust handler-level access controls.
- As operations, I can mitigate abuse through rate limiting.
- As release managers, I have a clear API hardening signoff checklist.

## Acceptance Criteria
- Rate limits are enforced for targeted endpoints.
- Authorization logic is validated inside handlers.
- Security headers and cache controls are correctly applied.
- Regression tests cover known bypass classes.
- OpenAPI and docs reflect final API behavior.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test
npm run lint
npm run build
npm run dev
# manual/API checks:
# rate-limit protected endpoint behavior
# auth-protected endpoint behavior
# /api/v1/docs contract consistency
```

Pass condition (required to close sprint):
- 100% of Sprint 12 tests pass.
- Security and operational hardening checks pass.
- Release checklist is fully green.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Release signoff document is completed.
