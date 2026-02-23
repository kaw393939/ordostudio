# Sprint 13 — UI Foundation + Design System

## Goal
Establish the Next.js App Router UI foundation with a reusable HAL client, Problem Details renderer, and protected route scaffolding for admin surfaces.

## Scope
- Create App Router shell and shared layouts/navigation.
- Add UI component baseline (forms, tables, dialogs, toasts) using existing Tailwind/UI primitives.
- Build `lib/halClient` with:
  - root discovery (`/api/v1`)
  - link following by relation
  - standardized fetch wrapper for HAL and Problem Details.
- Implement global Problem Details error UI with `request_id` display/copy.
- Add admin route protection driven by `/api/v1/me` and role-aware affordances.

## TDD Process
1. Write failing unit tests for HAL client parsing and link-follow behavior.
2. Write failing component tests for Problem Details rendering and request_id visibility.
3. Write failing integration tests for admin-route gating.
4. Implement minimally, then refactor with tests green.

## Stories
- As a user, I get consistent UI shell and feedback patterns.
- As a developer, I can consume API links without hardcoding transport paths.
- As support, I can capture request correlation IDs from UI errors.

## Acceptance Criteria
- HAL client consumes `_links` and supports relation-driven actions.
- Problem Details renderer handles non-2xx with clear messaging and `request_id`.
- Admin routes are denied when `/api/v1/me` does not grant required affordances.
- No UI hardcoding of event action routes (publish/cancel/export/registrations).

## End-of-Sprint Verification
```bash
npm run test -- ui-foundation hal-client
npm run lint
npm run build
```
Manual checks:
- Open protected admin route when logged out (must gate).
- Trigger a problem response and verify `request_id` appears.

Pass condition:
- All Sprint 13 tests pass.
- HAL + error contract behavior is verified.

## Exit Gate
Move sprint only when all acceptance criteria and verification checks pass.
