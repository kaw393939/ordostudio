# Sprint 24 — E2E Admin Operations + Security Boundaries

## Goal
Complete E2E coverage for admin events, registrations/check-in/export, users UI, and non-escalation boundaries.

## Scope
- Add E2E tests for admin event create/edit/publish/cancel + validation/slug conflicts.
- Add E2E tests for admin registrations list/add/cancel/check-in/export + blocked include_email + rate-limit.
- Add E2E tests for admin users list/search/filter, enable/disable, ADMIN role idempotency.
- Add negative tests ensuring no SUPER_ADMIN controls in UI and API escalation attempts are denied.
- Add explicit unauthorized access tests for all admin web surfaces.

## TDD Process
1. Write failing admin events console tests.
2. Write failing registration/check-in/export governance tests.
3. Write failing admin users + non-escalation tests.
4. Implement minimal fixes and refactor shared admin E2E helpers.

## Stories
- As an admin, I can operate event lifecycle safely.
- As security, I can verify escalation controls are enforced.

## Acceptance Criteria
- Admin events/registrations/export/users E2E suites pass.
- Governance and 429 scenarios are covered and pass.
- SUPER_ADMIN and CLI-only boundaries are validated in tests.

## End-of-Sprint Verification
```bash
npm run test -- e2e admin operations security
npm run lint
npm run build
```

Pass condition:
- All Sprint 24 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
