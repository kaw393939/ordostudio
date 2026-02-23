# Sprint 23 — E2E Public Events + HAL Compliance

## Goal
Validate public event browsing and strict HATEOAS behavior from UI consumers.

## Scope
- Add E2E coverage for `/events` list and `/events/[slug]` detail.
- Add negative tests for bad slug and forced API failure UX with Problem Details + `request_id`.
- Add HAL affordance tests for state-dependent publish/cancel visibility in admin event detail.
- Add strongest HATEOAS proof test: modified HAL href is the URL used by UI actions.
- Add stale UI/race behavior test (action fails gracefully and UI refreshes state).

## TDD Process
1. Write failing browse/detail + negative slug tests.
2. Write failing HAL affordance and dynamic-href action tests.
3. Implement/refine UI or helpers to honor HAL links only.
4. Refactor for deterministic race handling in tests.

## Stories
- As a user, I can browse event data safely.
- As an API architect, I can confirm UI is link-driven, not hardcoded.

## Acceptance Criteria
- Public list/detail E2E tests pass.
- Negative public error rendering tests pass with request correlation.
- HAL affordance + dynamic href usage tests pass.
- Stale-action race test passes with graceful recovery behavior.

## End-of-Sprint Verification
```bash
npm run test -- e2e events hal
npm run lint
npm run build
```

Pass condition:
- All Sprint 23 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
