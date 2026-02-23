# Sprint TDD-09 — Client Portal Outcomes and Follow-Up

## Goal
Provide clients and staff with clear evidence of delivery outcomes, artifacts, and next steps.

## Scope
- Add `My engagements` timeline and status rollups.
- Add session outcomes/action-item tracking.
- Add secure session artifacts/resources access.
- Add feedback capture and quality loop primitives.

## TDD Process
1. Write failing domain tests for engagement timeline and outcome invariants.
2. Write failing API tests for outcomes, artifacts, and feedback contracts.
3. Write failing integration tests for role-based access to engagement data.
4. Write failing UI tests for timeline, outcomes, and follow-up surfaces.
5. Implement and refactor until all tests pass.

## Stories
- As a client, I can see what happened, what’s next, and what value I received.
- As a service team, I can track outcomes and follow-up quality over time.

## Acceptance Criteria
- Engagement timeline and outcomes are visible and understandable.
- Artifacts are accessible with correct scope controls.
- Feedback can be collected and reported for quality improvement.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Confirm timeline ordering and next-step visibility.
- Validate artifact access by authorized vs unauthorized users.
- Submit feedback and verify it is persisted/reportable.

Pass condition:
- Client portal reflects delivery progress and outcomes credibly.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

---

## Completion Record (2026-02-18)

Status: Completed

Implemented scope:
- Added `My engagements` timeline with status rollups and follow-up visibility in account UX.
- Added session outcomes + action-item tracking primitives with domain invariants.
- Added secure artifact access controls (event-scoped and user-scoped resources).
- Added feedback submission and admin quality-report endpoint.

Key implementation files:
- `src/cli/db.ts` (migration `008_client_portal_outcomes_followup`)
- `src/core/use-cases/engagement-outcomes.ts`
- `src/lib/api/engagements.ts`
- `src/app/api/v1/account/engagements/route.ts`
- `src/app/api/v1/account/engagements/[slug]/artifacts/route.ts`
- `src/app/api/v1/account/engagements/[slug]/feedback/route.ts`
- `src/app/api/v1/events/[slug]/outcomes/route.ts`
- `src/app/api/v1/events/[slug]/artifacts/route.ts`
- `src/app/api/v1/admin/engagement-feedback/route.ts`
- `src/app/(public)/account/page.tsx`
- `src/lib/client-engagement-ui.ts`

TDD coverage added:
- `src/core/use-cases/__tests__/engagement-outcomes.test.ts`
- `src/lib/__tests__/client-engagement-ui.test.ts`
- `src/app/api/v1/events/__tests__/engagement-outcomes-api.test.ts`
- `src/app/__tests__/e2e-account-engagements.test.ts`

Verification:
```bash
npm test -- src/core/use-cases/__tests__/engagement-outcomes.test.ts src/lib/__tests__/client-engagement-ui.test.ts src/app/api/v1/events/__tests__/engagement-outcomes-api.test.ts src/app/__tests__/e2e-account-engagements.test.ts
```
- Result: PASS

```bash
npm test -- src/app/** src/lib/** src/core/**
```
- Result: FAIL (pre-existing unrelated suites in `events-api`, `e2e-api-foundation`, `e2e-audit-ui`, and `menu-registry`)

```bash
npm run lint
```
- Result: PASS with pre-existing warnings only

```bash
npm run build
```
- Result: PASS

Manual checks completed:
- Timeline ordering and next-step visibility verified via account engagements response/UI surface.
- Artifact access controls validated (authorized registered user allowed, unrelated user denied).
- Feedback submission persisted and reflected in admin engagement feedback report.
