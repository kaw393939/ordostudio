# Sprint 34 — Events Discovery Upgrade

## Goal
Improve event findability with fast search/filter/sort and shareable list state.

## Scope
- Add search by title/slug to `/events` and `/admin/events`.
- Add sort controls and admin status tabs (Draft/Published/Cancelled).
- Add URL-synced list state for search/filter/sort/page.
- Improve empty states with clear recovery CTA.

## TDD Process
1. Write failing tests for list search behavior on public/admin events pages.
2. Write failing tests for sorting and status-tab filtering.
3. Write failing tests for URL state persistence and restoration.
4. Write failing tests for empty-state rendering and clear-filters action.
5. Implement/refactor with tests green.

## Stories
- As a user, I can find an event in one to two interactions.
- As an admin, I can share a filtered/sorted list URL that reproduces the same view.

## Acceptance Criteria
- Known events can be located in at most 2 interactions.
- Copy-pasting the current list URL reproduces the same list state.
- Empty state explains no matches and offers a clear reset path.

## End-of-Sprint Verification
```bash
npm run test -- events-list filters sort
npm run lint
npm run build
```
Manual checks:
- Verify filter/sort state survives refresh and direct-link open.
- Validate keyboard navigation for search and filter controls.

Pass condition:
- Sprint 34 tests pass.
- Findability and URL-state acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Public events discovery upgrade:
	- `src/app/(public)/events/page.tsx`
- Admin events discovery upgrade:
	- `src/app/(admin)/admin/events/page.tsx`
- Shared URL-state/filter/sort helpers:
	- `src/lib/events-discovery-ui.ts`
	- `src/lib/view-models/events.ts`
- Discovery helper tests:
	- `src/lib/__tests__/events-discovery-ui.test.ts`

Verification executed:
```bash
npm test -- src/lib/__tests__/events-discovery-ui.test.ts src/app/__tests__/e2e-event-discovery.test.ts
npm run lint
npm run build
```

Verification outcome:
- Discovery tests passed.
- Lint passed with pre-existing unrelated warnings only.
- Production build passed.
