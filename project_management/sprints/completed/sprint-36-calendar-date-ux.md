# Sprint 36 — Calendar and Date UX

## Goal
Upgrade event planning UX with calendar views, date clarity, and calendar export.

## Scope
- Add List/Calendar toggle for events discovery surfaces.
- Ship month + agenda views as initial calendar modes.
- Add event quick preview from calendar interactions.
- Add ICS download action on event detail.
- Improve timezone clarity (event timezone and local context where relevant).

## TDD Process
1. Write failing tests for list/calendar view toggling and persisted state.
2. Write failing tests for calendar rendering and quick-preview interactions.
3. Write failing tests for ICS generation/download and metadata correctness.
4. Write failing tests for timezone display behavior.
5. Implement/refactor with tests green.

## Stories
- As a user, I can answer “what is happening this week?” at a glance.
- As a user, I can add an event to my personal calendar reliably.

## Acceptance Criteria
- Month/agenda calendar views render accurate event coverage.
- ICS downloads import correctly into major calendar tools.
- Date/time and timezone messaging is explicit and consistent.

## End-of-Sprint Verification
```bash
npm run test -- calendar ics timezone
npm run lint
npm run build
```
Manual checks:
- Validate ICS import into Apple Calendar and Google Calendar.
- Compare list and calendar metadata consistency for representative events.

Pass condition:
- Sprint 36 tests pass.
- Calendar utility and date/time trust acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Shared calendar/date UX helper module:
	- `src/lib/calendar-date-ui.ts`
- Discovery URL-state enhancement for persisted calendar/list mode:
	- `src/lib/events-discovery-ui.ts`
	- `src/lib/__tests__/events-discovery-ui.test.ts`
- Public events discovery upgrades (list/month/agenda + quick preview + timezone context):
	- `src/app/(public)/events/page.tsx`
- Admin events discovery upgrades (list/month/agenda + quick preview + timezone context):
	- `src/app/(admin)/admin/events/page.tsx`
- Event detail timezone clarity update:
	- `src/app/(public)/events/[slug]/page.tsx`
- Calendar/date helper tests:
	- `src/lib/__tests__/calendar-date-ui.test.ts`

Verification executed:
```bash
npm test -- src/lib/__tests__/calendar-date-ui.test.ts src/lib/__tests__/events-discovery-ui.test.ts src/lib/__tests__/event-detail-action.test.ts src/app/api/v1/events/__tests__/events-api.test.ts
npm run lint
npm run build
npm test -- src/app/__tests__/e2e-event-discovery.test.ts src/lib/__tests__/calendar-date-ui.test.ts src/lib/__tests__/events-discovery-ui.test.ts
```

Verification outcome:
- Sprint 36 calendar/date and ICS/timezone-related tests passed.
- Lint passed with pre-existing unrelated warnings only.
- Production build passed.
