# Sprint 35 — Event Detail Action Clarity

## Goal
Make event detail pages immediately understandable with one clear primary action.

## Scope
- Add dedicated Action Panel on event detail pages.
- Place primary action by HAL affordances (register/waitlist/cancel/none).
- Standardize status chips (Registered/Waitlisted/Cancelled/Checked-in).
- Add immediate mutation confirmation (inline + toast).

## TDD Process
1. Write failing tests for affordance-driven primary CTA rendering.
2. Write failing tests for status chip rendering by registration/check-in state.
3. Write failing tests for mutation confirmation and inline state updates.
4. Implement/refactor with tests green.

## Stories
- As a user, I can instantly understand my event status.
- As a user, I can find and complete the next action without scanning the page.

## Acceptance Criteria
- Primary action is visible without scrolling on major mobile/desktop viewports.
- Status and next action are understandable at a glance.
- Register/cancel/waitlist feedback removes ambiguity about outcome.

## End-of-Sprint Verification
```bash
npm run test -- event-detail cta status
npm run lint
npm run build
```
Manual checks:
- Validate CTA transitions across registration states.
- Validate affordance-based action availability and disabled reasoning.

Pass condition:
- Sprint 35 tests pass.
- Action clarity and state feedback acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-18)

Status:
- Completed.

Implemented artifacts:
- Public event detail action clarity implementation:
	- `src/app/(public)/events/[slug]/page.tsx`
- Affordance-driven primary-action and status-chip helper:
	- `src/lib/event-detail-action.ts`
- Event detail affordance enhancements (`app:register` / `app:join-waitlist` / `app:my-registration`):
	- `src/app/api/v1/events/[slug]/route.ts`
- Sprint 35 helper/API tests:
	- `src/lib/__tests__/event-detail-action.test.ts`
	- `src/app/api/v1/events/__tests__/events-api.test.ts`

Verification executed:
```bash
npm test -- src/lib/__tests__/event-detail-action.test.ts src/app/api/v1/events/__tests__/events-api.test.ts
npm run lint
npm run build
```

Verification outcome:
- Sprint 35 targeted helper/API tests passed.
- Lint passed with pre-existing unrelated warnings only.
- Production build passed.
