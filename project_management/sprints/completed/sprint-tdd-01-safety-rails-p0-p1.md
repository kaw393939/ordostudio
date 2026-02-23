# Sprint TDD-01 — Safety Rails P0/P1

## Goal
Eliminate highest-risk UX safety failures in destructive and privileged workflows before broader feature expansion.

## Scope
- Add two-step account deletion confirmation with typed intent.
- Add confirmation + impact summary for admin role/status mutations.
- Add bulk operation preflight and post-action reconciliation for registrations.
- Ensure durable success/failure summaries for high-risk actions.

## TDD Process
1. Write failing domain tests for destructive-action confirmation contracts.
2. Write failing API tests for mutation confirmation payload requirements.
3. Write failing integration tests for bulk operation result structure (per-item success/failure).
4. Write failing UI tests for confirmation dialogs and danger-zone behavior.
5. Implement and refactor until all tests pass.

## Stories
- As a user, I cannot accidentally delete my account with a single click.
- As an admin, I can see exactly what a high-risk action will affect before confirming.
- As an operator, I can review durable outcomes for each bulk action.

## Acceptance Criteria
- Account deletion is blocked without explicit typed confirmation.
- Privileged user mutations always require explicit confirmation.
- Bulk cancel/check-in returns and displays per-item outcomes.
- All destructive actions show consequence summaries and audit-friendly feedback.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Attempt account deletion without confirmation and verify it is blocked.
- Run bulk cancel/check-in with mixed eligible/ineligible users and verify per-item results.
- Confirm admin role/status changes show impact summary before submit.

Pass condition:
- No single-click destructive path remains.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm test -- src/app/api/v1/users/__tests__/users-api.test.ts src/app/__tests__/e2e-compliance-release.test.ts src/app/__tests__/e2e-admin-operations-security.test.ts src/app/__tests__/e2e-release-journeys-regression.test.ts src/app/__tests__/e2e-ui-hardening.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added explicit confirmation payload guard to `POST /api/v1/account/delete` requiring `confirm_text: "DELETE"`.
	- Added explicit confirmation requirements to admin status/role mutation APIs.
	- Added two-step typed confirmation panel for account deletion in `src/app/(public)/account/page.tsx`.
	- Added explicit admin mutation confirmations in `src/app/(admin)/admin/users/page.tsx`.
	- Added preflight confirmation and durable per-item summary reporting for bulk check-in/cancel in `src/app/(admin)/admin/events/[slug]/registrations/page.tsx`.
	- Updated affected tests to reflect confirmation contracts.
	- Verification passed with no build errors and only pre-existing lint warnings.
