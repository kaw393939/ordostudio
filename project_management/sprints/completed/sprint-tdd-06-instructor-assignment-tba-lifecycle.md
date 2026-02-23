# Sprint TDD-06 — Instructor Assignment and TBA Lifecycle

## Goal
Introduce first-class instructor staffing with explicit TBA states and auditable assignment transitions.

## Scope
- Add instructor profile and availability models.
- Add assignment state machine (`TBA`, `proposed`, `assigned`, `confirmed`, `reassigned`).
- Add assignment/reassignment workflows for sessions.
- Add user-facing instructor status communication.

## TDD Process
1. Write failing domain tests for assignment state machine transitions.
2. Write failing API tests for assignment/reassignment constraints.
3. Write failing integration tests for availability/capability matching.
4. Write failing UI tests for TBA visibility and assignment updates.
5. Implement and refactor until all tests pass.

## Stories
- As operations staff, I can manage instructor assignment with clear workflow states.
- As a participant, I can clearly see whether an instructor is assigned or TBA.

## Acceptance Criteria
- TBA is a first-class visible state.
- Assignment transitions are validated and auditable.
- Reassignment triggers clear state updates and communications.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Move assignments through all lifecycle states.
- Verify unassigned sessions display `TBA` consistently.
- Confirm reassignment updates are visible and logged.

Pass condition:
- Instructor staffing lifecycle is reliable, explicit, and auditable.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test -- src/core/use-cases/__tests__/instructor-assignment.test.ts src/app/api/v1/events/__tests__/event-instructor-api.test.ts src/app/api/v1/events/__tests__/events-delivery-api.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added instructor staffing schema migration in `src/cli/db.ts`:
		- `instructors`
		- `instructor_availability`
		- `event_instructor_assignments`
		- `event_instructor_assignment_history`
	- Added assignment state-machine use case and tests:
		- `src/core/use-cases/instructor-assignment.ts`
		- `src/core/use-cases/__tests__/instructor-assignment.test.ts`
	- Extended event repository/read projections for explicit instructor state defaults (`TBA`) and instructor summary fields:
		- `src/core/ports/repositories.ts`
		- `src/core/infrastructure/sqlite/repositories.ts`
		- `src/core/infrastructure/sqlite/read-repositories.ts`
		- `src/core/use-cases/create-event.ts`
	- Added instructor/admin APIs and auditable transition workflow:
		- `src/lib/api/instructors.ts`
		- `src/app/api/v1/instructors/route.ts`
		- `src/app/api/v1/instructors/[id]/availability/route.ts`
		- `src/app/api/v1/events/[slug]/instructor/route.ts`
		- `src/app/api/v1/route.ts` (instructors root affordance)
		- `src/lib/api/events.ts` (instructor assignment affordance + fields)
	- Added focused API coverage for lifecycle transitions, TBA default visibility, and availability/capability matching:
		- `src/app/api/v1/events/__tests__/event-instructor-api.test.ts`
	- Added user-facing instructor status communication (including TBA) in:
		- `src/app/(admin)/admin/events/[slug]/page.tsx`
		- `src/app/(public)/events/[slug]/page.tsx`
		- `src/app/(public)/account/page.tsx`
		- `src/lib/api/registrations.ts`
	- Verification passed; lint reported only pre-existing warnings.
