# Sprint 21 — E2E API Foundation + Contracts

## Goal
Implement deterministic E2E coverage for API discoverability, docs, content types, and Problem Details contract consistency.

## Scope
- Add Playwright/API E2E tests for `GET /api/v1` and `GET /api/v1/docs`.
- Add negative tests for missing endpoints returning RFC 9457 Problem Details with `request_id`.
- Assert representative success/error content types (`application/hal+json` and `application/problem+json`).
- Standardize E2E fixtures for users/events/registrations baseline.

## TDD Process
1. Write failing E2E tests for root/docs/content-type and problem-shape.
2. Add deterministic seed/fixture loader for E2E suite.
3. Implement minimal fixes until all tests pass.
4. Refactor tests for readability and stability.

## Stories
- As a UI client, I can rely on stable API contracts.
- As support, I always receive `request_id` for failed requests.

## Acceptance Criteria
- Root/docs discovery tests pass.
- Missing endpoint test validates full Problem Details contract + `request_id`.
- Content-type tests pass across representative endpoints.
- Shared E2E fixture setup is committed and reusable.

## End-of-Sprint Verification
```bash
npm run test -- e2e api-foundation
npm run lint
npm run build
```

Pass condition:
- All Sprint 21 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
