# Sprint 17 — Admin Events Console

## Goal
Implement admin event management UI for list/create/edit and state-driven publish/cancel actions.

## Scope
- Implement `/admin/events` list + create flow.
- Implement `/admin/events/[slug]` detail/edit flow.
- Render publish/cancel controls only when corresponding HAL links exist.
- Support create/update validation feedback and problem rendering.

## TDD Process
1. Write failing tests for admin list/create/edit UI.
2. Write failing tests for HAL-driven publish/cancel action visibility.
3. Write failing integration tests for lifecycle transitions in UI.
4. Implement/refactor with tests green.

## Stories
- As an admin, I can create and edit events.
- As an admin, I can publish/cancel only when affordances are present.

## Acceptance Criteria
- `/admin/events` supports listing and creation.
- `/admin/events/[slug]` supports editing.
- Publish/cancel buttons are conditioned by `_links`.
- Error states use Problem Details renderer with request_id.

## End-of-Sprint Verification
```bash
npm run test -- admin-events-ui
npm run lint
npm run build
```
Manual checks:
- Create event, publish it, then cancel it via available links.
- Confirm button visibility changes by state.

Pass condition:
- All Sprint 17 tests pass.
- State-driven affordance behavior is verified.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
