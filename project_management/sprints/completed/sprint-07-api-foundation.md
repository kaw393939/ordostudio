# Sprint 07 — API Foundation (HAL + Problem Details + OpenAPI Skeleton)

## Goal
Establish the HTTP transport foundation for `/api/v1` with HAL success responses, RFC 9457 Problem Details errors, request correlation, and initial OpenAPI 3.1 contract publication.

## Scope
- Create base route scaffolding for Next.js Route Handlers under `/api/v1`.
- Add shared response builders:
  - HAL (`application/hal+json`)
  - Problem Details (`application/problem+json`)
- Implement request correlation (`request_id`) in headers and error bodies.
- Implement API root discoverability endpoint: `GET /api/v1`.
- Add OpenAPI 3.1 skeleton endpoint: `GET /api/v1/docs`.
- Add transport-layer guardrails: no business logic in handlers.

## TDD Process
For every endpoint and shared builder:
1. Write failing contract tests first.
2. Implement minimal transport behavior.
3. Refactor with strict backward-compatibility on response contracts.
4. Keep green tests before merging.

Required test layers:
- Contract tests for HAL response shape and required `_links`.
- Contract tests for Problem Details fields (`type/title/status/detail/instance` + `request_id`).
- Tests for content-type correctness per endpoint.

## Stories
- As a UI client, I can discover API entry links from `/api/v1`.
- As an integrator, I receive standardized error payloads.
- As ops, I can correlate errors using `request_id`.
- As developers, we have a single response formatting foundation.

## Acceptance Criteria
- `/api/v1` returns `application/hal+json` with `_links.self` and top-level navigation links.
- Errors return `application/problem+json` and RFC 9457 canonical fields.
- Every error body includes `request_id` extension member.
- OpenAPI skeleton is accessible at `/api/v1/docs`.
- Route handlers call shared builders and avoid direct business-rule duplication.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- api foundation
npm run lint
npm run build
npm run dev
# then manually verify:
# GET /api/v1
# GET /api/v1/docs
```

Pass condition (required to close sprint):
- 100% of Sprint 07 tests pass.
- HAL and Problem Details contracts are stable and validated.
- `/api/v1` and `/api/v1/docs` return expected payload shapes.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- API contract snapshot changes are reviewed/approved.
