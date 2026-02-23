# Sprint TDD-04 — Intake and Qualification Pipeline

## Goal
Create a complete inquiry-to-qualification flow for consulting and training requests.

## Scope
- Add booking request capture for individual and organization contexts.
- Add adaptive qualification fields (goals, timeline, constraints).
- Add admin intake queue with triage statuses and ownership.
- Add status history for traceability.

## TDD Process
1. Write failing domain tests for booking request lifecycle transitions.
2. Write failing API tests for adaptive validation by audience type.
3. Write failing integration tests for queue filtering and status history.
4. Write failing UI tests for request submission and admin triage workflows.
5. Implement and refactor until all tests pass.

## Stories
- As a prospect, I can submit a request aligned to my context.
- As operations staff, I can triage and advance requests predictably.

## Acceptance Criteria
- Every inquiry has lifecycle state and history.
- Admin queue supports prioritization and assignment.
- Users receive clear next-step status feedback.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Submit individual and group requests and verify adaptive validation.
- Move request through status pipeline and confirm history integrity.
- Confirm queue filters and ownership views work as expected.

Pass condition:
- Inquiry lifecycle is trackable from submission to qualified/booked/lost outcomes.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test -- src/app/api/v1/intake/__tests__/intake-api.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added intake lifecycle schema migration in `src/cli/db.ts` with `intake_requests` and `intake_status_history` tables.
	- Added intake domain/API logic in `src/lib/api/intake.ts` for adaptive validation, queue filtering, status transitions, ownership, prioritization, and history tracking.
	- Added intake API routes:
		- `src/app/api/v1/intake/route.ts`
		- `src/app/api/v1/intake/[id]/route.ts`
	- Added public intake submission UI:
		- `src/app/(public)/services/request/page.tsx`
		- Updated `src/app/(public)/services/[slug]/page.tsx` to route users through request intake and show clear next-step status feedback.
	- Added admin intake queue UI in `src/app/(admin)/admin/intake/page.tsx` with status triage, ownership assignment, priority updates, and status history visibility.
	- Added intake API test coverage in `src/app/api/v1/intake/__tests__/intake-api.test.ts` for adaptive validation, queue filtering/assignment, and history integrity.
	- Wired intake discoverability updates in:
		- `src/app/api/v1/route.ts`
		- `src/lib/navigation/menu-registry.ts`
		- `src/app/(admin)/admin/page.tsx`
	- Verification passed with no build errors and only pre-existing lint warnings.
