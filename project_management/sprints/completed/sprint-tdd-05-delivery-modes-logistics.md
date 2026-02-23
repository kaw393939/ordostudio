# Sprint TDD-05 — Delivery Modes and Logistics

## Goal
Make online, in-person, and hybrid delivery logistics explicit, validated, and user-visible.

## Scope
- Add session delivery model with mode-specific fields.
- Add location and meeting-link logistics structures.
- Add “How to attend” surfaces in confirmations and account history.
- Add mode-aware reminder payload generation.

## TDD Process
1. Write failing domain tests for delivery-mode required field rules.
2. Write failing API tests for session delivery validation.
3. Write failing integration tests for reminder and instruction generation.
4. Write failing UI tests for mode-specific logistics display.
5. Implement and refactor until all tests pass.

## Stories
- As a participant, I always know where and how to attend.
- As an admin, I can configure session logistics without free-text hacks.

## Acceptance Criteria
- Session mode is explicit and validated.
- Online/in-person/hybrid instructions are visible in user-facing flows.
- Reminder payloads include correct logistics by mode.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Configure each delivery mode and verify required fields.
- Validate attendance instructions in notifications/history views.
- Confirm reminders include location/link data correctly.

Pass condition:
- Delivery logistics are explicit and operationally reliable across all modes.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test -- src/app/api/v1/events/__tests__/events-delivery-api.test.ts src/lib/__tests__/event-delivery.test.ts src/lib/__tests__/admin-events-view.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added delivery logistics schema migration (`event_delivery`) in `src/cli/db.ts`.
	- Added delivery-mode parsing/validation and legacy-safe update handling in:
		- `src/core/use-cases/event-delivery.ts`
		- `src/core/use-cases/create-event.ts`
		- `src/core/use-cases/update-event.ts`
	- Extended repositories/read models to persist and project logistics, with runtime fallback when `event_delivery` is missing in older databases:
		- `src/core/infrastructure/sqlite/repositories.ts`
		- `src/core/infrastructure/sqlite/read-repositories.ts`
	- Extended events/account APIs and added reminder payload endpoint:
		- `src/app/api/v1/events/route.ts`
		- `src/app/api/v1/events/[slug]/route.ts`
		- `src/app/api/v1/events/[slug]/reminder-payload/route.ts`
		- `src/app/api/v1/account/registrations/route.ts`
		- `src/lib/api/events.ts`
		- `src/lib/api/registrations.ts`
	- Added delivery instruction/reminder helpers and tests:
		- `src/lib/event-delivery.ts`
		- `src/lib/__tests__/event-delivery.test.ts`
		- `src/app/api/v1/events/__tests__/events-delivery-api.test.ts`
	- Updated admin/public/account UI surfaces for explicit mode-specific logistics:
		- `src/app/(admin)/admin/events/page.tsx`
		- `src/app/(admin)/admin/events/[slug]/page.tsx`
		- `src/app/(public)/events/[slug]/page.tsx`
		- `src/app/(public)/account/page.tsx`
	- Verification passed; lint reported only pre-existing warnings.
