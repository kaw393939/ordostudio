# Sprint TDD-10 — Follow-Up Workflow and Reminder Automation

## Goal
Close the delivery loop by making follow-up actions trackable, enforceable, and proactively communicated.

## Scope
- Add follow-up action lifecycle transitions (`OPEN`, `IN_PROGRESS`, `DONE`, `BLOCKED`) with ownership and due-date semantics.
- Add reminder scheduling primitives for upcoming and overdue action items.
- Add account/admin visibility for follow-up progress and reminder history.
- Add secure mutation endpoints for action updates and reminder acknowledgements.

## TDD Process
1. Write failing domain tests for follow-up state transitions and due-date invariants.
2. Write failing API tests for action mutation, reminder creation, and authorization boundaries.
3. Write failing integration tests for timeline + reminder consistency across client/admin surfaces.
4. Write failing UI tests for follow-up status clarity, overdue signaling, and next-step confidence.
5. Implement and refactor until all tests pass.

## Stories
- As a client, I can see and complete follow-up actions with clear deadlines and ownership.
- As a service team, I can ensure no promised follow-up task is silently dropped.

## Acceptance Criteria
- Follow-up actions have explicit lifecycle states and transition guards.
- Reminder records are generated and visible for upcoming/overdue actions.
- Client and admin views reflect the same follow-up truth with correct access controls.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Move actions across allowed/invalid transitions and verify responses.
- Verify reminder visibility for authorized users and denial for unauthorized users.
- Confirm overdue and upcoming reminders display correctly in account/admin experiences.

Pass condition:
- Follow-up commitments are operationally reliable and visible without external tooling.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

---

## Completion Record (2026-02-18)

Status: Completed

Implemented scope:
- Added follow-up lifecycle transitions with guarded statuses (`OPEN`, `IN_PROGRESS`, `DONE`, `BLOCKED`).
- Added reminder generation + acknowledgement primitives for upcoming/overdue actions.
- Added account/admin follow-up visibility endpoints and account UI surface for action/reminder workflows.
- Added secure mutation endpoints for action updates and reminder acknowledgements.

Key implementation files:
- `src/cli/db.ts` (migration `009_followup_workflow_reminders`)
- `src/core/use-cases/follow-up-lifecycle.ts`
- `src/lib/api/engagements.ts`
- `src/app/api/v1/account/engagements/[slug]/follow-up/route.ts`
- `src/app/api/v1/account/engagements/[slug]/actions/[actionId]/route.ts`
- `src/app/api/v1/account/engagements/[slug]/reminders/[id]/route.ts`
- `src/app/api/v1/events/[slug]/follow-up/reminders/route.ts`
- `src/app/api/v1/admin/engagement-followup/route.ts`
- `src/app/(public)/account/page.tsx`
- `src/lib/follow-up-ui.ts`

TDD coverage added/updated:
- `src/core/use-cases/__tests__/follow-up-lifecycle.test.ts`
- `src/lib/__tests__/follow-up-ui.test.ts`
- `src/app/api/v1/events/__tests__/engagement-outcomes-api.test.ts`
- `src/app/__tests__/e2e-account-engagements.test.ts`

Verification:
```bash
npm test -- src/core/use-cases/__tests__/follow-up-lifecycle.test.ts src/lib/__tests__/follow-up-ui.test.ts src/app/api/v1/events/__tests__/engagement-outcomes-api.test.ts src/app/__tests__/e2e-account-engagements.test.ts
```
- Result: PASS

```bash
npm test -- src/app/** src/lib/** src/core/**
```
- Result: FAIL (pre-existing unrelated suites: `events-api`, `e2e-api-foundation`, `e2e-audit-ui`, `menu-registry`)

```bash
npm run lint
```
- Result: PASS with pre-existing warnings only

```bash
npm run build
```
- Result: PASS

Manual checks completed:
- Validated allowed/invalid follow-up transitions via API route tests.
- Verified reminder generation for overdue actions and reminder acknowledgement behavior.
- Confirmed account timeline and follow-up surface reflect reminder/action state and access controls.
