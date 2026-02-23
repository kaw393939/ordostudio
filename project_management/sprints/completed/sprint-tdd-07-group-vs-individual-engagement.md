# Sprint TDD-07 — Group vs Individual Engagement Experience

## Goal
Differentiate individual and group service journeys across booking, delivery management, and participant experience.

## Scope
- Add engagement type model (`individual`, `group`).
- Add separate booking pathways and tailored UX copy/CTAs.
- Add group roster administration and substitution handling.
- Add role-based access constraints for organizer actions.

## TDD Process
1. Write failing domain tests for engagement-type behavior rules.
2. Write failing API tests for participant lifecycle and substitutions.
3. Write failing integration tests for organizer access boundaries.
4. Write failing UI tests for distinct journey surfaces.
5. Implement and refactor until all tests pass.

## Stories
- As an individual client, I get a focused 1:1 journey.
- As a group organizer, I can manage participants without support intervention.

## Acceptance Criteria
- Individual and group flows are clearly separated.
- Group roster operations are complete and traceable.
- Organizer-only operations are properly enforced.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Book both individual and group engagements and verify divergent UX paths.
- Add/remove/replace group participants and confirm integrity.
- Validate unauthorized participant-management attempts are blocked.

Pass condition:
- Both audience types have coherent, task-fit journeys.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test -- src/core/use-cases/__tests__/event-engagement.test.ts src/app/api/v1/events/__tests__/group-engagement-api.test.ts src/app/api/v1/events/__tests__/registrations-api.test.ts src/lib/__tests__/admin-events-view.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added engagement-type data model with migration `006_event_engagement_type` in `src/cli/db.ts`.
	- Added engagement-type parsing rules and tests:
		- `src/core/use-cases/event-engagement.ts`
		- `src/core/use-cases/__tests__/event-engagement.test.ts`
	- Extended event domain/repository/read projections with default-safe `INDIVIDUAL|GROUP` engagement handling:
		- `src/core/ports/repositories.ts`
		- `src/core/use-cases/create-event.ts`
		- `src/core/use-cases/update-event.ts`
		- `src/core/infrastructure/sqlite/repositories.ts`
		- `src/core/infrastructure/sqlite/read-repositories.ts`
	- Extended events APIs and links for engagement-aware behavior and organizer affordances:
		- `src/lib/api/events.ts`
		- `src/app/api/v1/events/route.ts`
		- `src/app/api/v1/events/[slug]/route.ts`
	- Added group roster substitution workflow with role enforcement:
		- `src/app/api/v1/events/[slug]/registrations/substitutions/route.ts`
		- Updated organizer-aware constraints in:
			- `src/app/api/v1/events/[slug]/registrations/route.ts`
			- `src/app/api/v1/events/[slug]/registrations/[userId]/route.ts`
	- Added focused API coverage for organizer boundaries and substitution lifecycle:
		- `src/app/api/v1/events/__tests__/group-engagement-api.test.ts`
	- Added differentiated UX copy/inputs for individual vs group journeys:
		- `src/app/(admin)/admin/events/page.tsx`
		- `src/app/(admin)/admin/events/[slug]/page.tsx`
		- `src/app/(public)/events/[slug]/page.tsx`
		- `src/app/(public)/account/page.tsx`
		- `src/lib/admin-events-view.ts`
		- `src/lib/__tests__/admin-events-view.test.ts`
	- Verification passed; lint reported only pre-existing warnings.
