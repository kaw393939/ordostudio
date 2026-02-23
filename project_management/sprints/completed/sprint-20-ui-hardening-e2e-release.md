# Sprint 20 — UI Hardening + E2E + Release Gate

## Goal
Finalize UI for production readiness with end-to-end coverage, accessibility pass, and escalation-surface checks.

## Scope
- Build Playwright E2E suite for critical public + admin flows.
- Add accessibility pass for keyboard navigation, labels, and focus behavior.
- Ensure consistent Problem Details UX with request_id propagation.
- Verify no CLI-only super-admin/dangerous operations are exposed in UI.

## TDD Process
1. Write failing E2E tests for end-to-end user/admin journeys.
2. Write failing accessibility and error rendering checks.
3. Implement minimal fixes to pass release criteria.
4. Refactor while preserving behavior and full green suite.

## Stories
- As a release owner, I can trust core UI flows through automated E2E coverage.
- As support, I can diagnose failures via request_id surfaced in UI.

## Acceptance Criteria
- E2E flows pass:
  - register/login/logout
  - browse events
  - register/waitlist/cancel
  - admin create→publish→registrations→check-in→export.
- Accessibility checks pass for critical routes.
- Problem Details and request_id are consistently displayed.
- No UI surface exposes CLI-only operations.

## End-of-Sprint Verification
```bash
npm run test -- e2e ui-hardening
npm run lint
npm run build
```
Manual checks:
- Spot-check critical public/admin flows in browser.
- Confirm no SUPER_ADMIN/CLI-only operation surfaces.

Pass condition:
- All Sprint 20 tests pass.
- Release checklist is fully green.

## Exit Gate
UI Phase 1 is complete only when all criteria above pass and regression suite is green.
