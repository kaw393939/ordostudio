# Sprint 43 — Route-Type Performance Budgets

## Goal
Turn “good enough” performance into enforceable budgets by user context.

## Scope
- Define budget tiers for route types:
  - Public marketing/content routes
  - Authenticated user routes
  - Admin operational routes
- Add budget assertions in Lighthouse gate.
- Calibrate thresholds with baseline + variance buffer.
- Document exception workflow for temporary waivers.

## TDD Process
1. Write failing tests for route-to-budget tier mapping.
2. Write failing tests for budget assertion pass/fail behavior.
3. Write failing tests for waiver parsing and expiration enforcement.
4. Implement/refactor with tests green.

## Stories
- As a maintainer, I can block regressions using explicit route-category budgets.
- As a lead, I can approve temporary exceptions with expiration and ownership.

## Acceptance Criteria
- Budget file exists and is used by CI gate.
- Failing routes clearly report violated budgets.
- Waiver process exists with expiration and owner.

## End-of-Sprint Verification
```bash
npm run test:lighthouse
```
Manual checks:
- Force a controlled regression and confirm clear budget failure output.
- Validate route-type mapping logic for all audited paths.

Pass condition:
- Budget-based gating is active and auditable.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
  - `npm run test:lighthouse:seeded`
- Outcomes:
  - Added route-type budget policy in `scripts/lighthouse-route-budgets.json`.
  - Added expiring waiver workflow in `scripts/lighthouse-budget-waivers.json`.
  - Enforced budget + waiver checks in `scripts/run-lighthouse.mjs`.
  - Documented waiver process in `docs/lighthouse-budget-waiver-workflow.md`.
