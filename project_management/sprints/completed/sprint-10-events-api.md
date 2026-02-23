# Sprint 10 — Events API (Admin + Public Read)

## Goal
Expose event lifecycle over HTTP while preserving Sprint 04 domain invariants and state-driven HATEOAS affordances.

## Scope
- Implement endpoints:
  - `GET /api/v1/events` (filter + paging)
  - `POST /api/v1/events`
  - `GET /api/v1/events/{slug}`
  - `PATCH /api/v1/events/{slug}`
  - `POST /api/v1/events/{slug}/publish`
  - `POST /api/v1/events/{slug}/cancel`
- Preserve event lifecycle invariants from CLI domain services.
- Implement state-dependent HAL action links:
  - DRAFT => `app:publish`
  - PUBLISHED => `app:cancel`
  - CANCELLED => read-only links
- Ensure mutation paths are audited.

## TDD Process
1. Write failing contract tests for each endpoint + state link matrix.
2. Implement minimal handlers calling shared services.
3. Add idempotency tests for publish.
4. Refactor while keeping HAL/Problem contracts stable.

Required test layers:
- HAL link relation tests by event status.
- Validation tests for event updates and cancel reason.
- RBAC tests for write endpoints.

## Stories
- As an admin, I can create/update/publish/cancel events via API.
- As a client, I can discover allowed actions through `_links`.
- As operators, we retain audit trail for event mutations.

## Acceptance Criteria
- Event lifecycle semantics match Sprint 04 behavior.
- Publish remains idempotent.
- Cancel requires reason and stores audit metadata.
- List endpoint supports filters and paging metadata.
- HAL links correctly reflect event state.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- events api hateoas
npm run lint
npm run build
npm run dev
# manual/API checks:
# GET /api/v1/events?status=DRAFT
# POST /api/v1/events
# POST /api/v1/events/{slug}/publish
# POST /api/v1/events/{slug}/cancel
# GET /api/v1/events/{slug}
```

Pass condition (required to close sprint):
- 100% of Sprint 10 tests pass.
- HAL link matrix by state is correct.
- Event mutation audit coverage is complete.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Event API contract snapshots are approved.
