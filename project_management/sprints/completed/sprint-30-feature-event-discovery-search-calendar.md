# Sprint 30 — Feature: Event Discovery (Search/Filters/Calendar) + E2E

## Goal
Add richer event discovery quality features and verify them end-to-end.

## Scope
- Add public search/filter controls (title/location/tags as implemented scope).
- Persist filter state in URL and maintain stable pagination behavior.
- Add calendar export (ICS) download path if included in scope.
- Add E2E tests for search/filter/paging and timezone-correct calendar export.

## TDD Process
1. Write failing tests for search/filter/URL state + pagination stability.
2. Write failing tests for calendar export correctness (if implemented).
3. Implement minimal discovery enhancements in API + UI.
4. Refactor for performance and deterministic assertions.

## Stories
- As a visitor, I can find relevant events quickly.
- As a user, I can export events to calendar tools reliably.

## Acceptance Criteria
- Search/filter/pagination E2E tests pass.
- URL persistence behavior is covered and passing.
- ICS export tests pass when feature is enabled.

## End-of-Sprint Verification
```bash
npm run test -- e2e event-discovery
npm run lint
npm run build
```

Pass condition:
- All Sprint 30 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
