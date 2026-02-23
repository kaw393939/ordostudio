# Sprint 40 — Performance and Accessibility Polish

## Goal
Deliver a fast, stable, and accessible experience across core user and admin journeys.

## Scope
- Expand streaming/skeleton coverage on key routes.
- Add high-confidence route prefetching and cache tuning for read-heavy paths.
- Complete keyboard/focus/aria pass for forms, tables, dialogs.
- Add UX regression checklist to PR workflow.

## TDD Process
1. Write failing tests for route-level skeleton/streaming expectations.
2. Write failing tests for keyboard completion of critical flows.
3. Write failing tests for focus management in dialogs and error handling.
4. Write failing tests for key ARIA labels/announcements.
5. Implement/refactor with tests green.

## Stories
- As a user, core pages feel responsive and stable.
- As a keyboard-only user, I can complete critical tasks end-to-end.

## Acceptance Criteria
- Core journeys show measurable responsiveness improvements.
- Keyboard-only completion succeeds for discovery, registration, and admin check-in.
- Major pages avoid disruptive layout shifts.

## End-of-Sprint Verification
```bash
npm run test -- a11y ui-regression
npm run lint
npm run build
```
Manual checks:
- Run keyboard-only pass for core public/admin workflows.
- Validate focus trap/restore behavior in all dialogs.

Pass condition:
- Sprint 40 tests pass.
- Performance and accessibility acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Expanded key-route loading/skeleton coverage:
	- `src/app/(public)/events/loading.tsx`
	- `src/app/(public)/account/loading.tsx`
	- `src/app/(admin)/admin/events/[slug]/loading.tsx`
	- `src/app/(admin)/admin/events/[slug]/registrations/loading.tsx`
	- `src/app/(admin)/admin/events/[slug]/export/loading.tsx`
- Read-heavy path responsiveness tuning:
	- Explicit prefetch on core event/admin navigation links in:
		- `src/app/(public)/events/page.tsx`
		- `src/app/(admin)/admin/events/page.tsx`
	- Cache-control policy for read-heavy events APIs:
		- `src/app/api/v1/events/route.ts`
		- `src/app/api/v1/events/[slug]/route.ts`
- Accessibility/focus polish:
	- Focus-visible ring improvements in primitives:
		- `src/components/primitives/button.tsx`
		- `src/components/primitives/input.tsx`
	- Table semantics and keyboard labels in admin registrations:
		- `src/app/(admin)/admin/events/[slug]/registrations/page.tsx`
- UX regression checklist updates:
	- `docs/frontend-pr-checklist.md`
- Sprint 40 regression tests:
	- `src/app/__tests__/e2e-a11y-ui-regression.test.ts`

Verification executed:
```bash
npm test -- src/app/__tests__/e2e-a11y-ui-regression.test.ts src/lib/__tests__/problem-recovery-ui.test.ts src/lib/__tests__/admin-operations-ui.test.ts
npm run lint
npm run build
```

Verification outcome:
- Sprint 40 a11y/ui regression tests passed.
- Lint passed with pre-existing unrelated warnings only.
- Production build passed.
