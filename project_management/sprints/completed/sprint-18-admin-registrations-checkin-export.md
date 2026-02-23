# Sprint 18 — Admin Registrations + Check-in + Export

## Goal
Implement admin registration operations, check-in workflows, and export UI with governance constraints.

## Scope
- Implement `/admin/events/[slug]/registrations` for list/add/cancel/check-in.
- Implement `/admin/events/[slug]/export` UI for csv/json exports.
- Enforce include-email governance behavior in UI.
- Display transitions and operation outcomes clearly.

## TDD Process
1. Write failing tests for registrations list/add/cancel/check-in.
2. Write failing tests for export format options and responses.
3. Write failing tests for include-email governance behavior.
4. Implement/refactor with tests green.

## Stories
- As an admin, I can manage registrations and check-ins.
- As an admin, I can export data while respecting governance constraints.

## Acceptance Criteria
- Registrations view supports add/cancel/check-in and status updates.
- Export supports csv/json and handles blocked include-email cases.
- UI follows API links and renders Problem Details for blocked actions.
- Request IDs are visible for operational troubleshooting.

## End-of-Sprint Verification
```bash
npm run test -- admin-registrations-ui export-ui
npm run lint
npm run build
```
Manual checks:
- Add/cancel/check-in registration.
- Export csv/json and validate include-email restrictions outside local.

Pass condition:
- All Sprint 18 tests pass.
- Governance behavior validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
