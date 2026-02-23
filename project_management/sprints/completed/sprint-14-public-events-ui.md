# Sprint 14 — Public Events UI

## Goal
Deliver public events browsing and detail pages that consume HAL resources and state-dependent affordances.

## Scope
- Implement `/events` list page with paging/filter controls from API metadata.
- Implement `/events/[slug]` detail page.
- Render available actions strictly from HAL links.
- Display event state and user-specific affordances.

## TDD Process
1. Write failing page/component tests for list/detail render paths.
2. Write failing integration tests for HAL-link-driven actions visibility.
3. Implement minimal data-fetch and render logic.
4. Refactor for shared UI patterns with tests green.

## Stories
- As a visitor, I can browse published events.
- As a user, I can see allowed actions on event detail from API affordances.

## Acceptance Criteria
- `/events` renders from API response, including empty/error states.
- `/events/[slug]` renders detail and action controls from `_links`.
- UI does not assume `publish/cancel` endpoints; it follows affordances.
- Problem Details are shown through the global renderer.

## End-of-Sprint Verification
```bash
npm run test -- public-events-ui
npm run lint
npm run build
```
Manual checks:
- Navigate list -> detail.
- Confirm action controls change with event state/affordances.

Pass condition:
- All Sprint 14 tests pass.
- HAL-driven navigation validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
