# Sprint 39 — Error and Recovery Pass

## Goal
Convert technical failure surfaces into human-readable, actionable recovery paths.

## Scope
- Refine Problem Details renderer with human-first headlines and causes.
- Add next-action controls to error states.
- Add retry behavior for transient failures.
- Surface request/support IDs as secondary operational detail.

## TDD Process
1. Write failing tests for error headline/cause/next-action rendering.
2. Write failing tests for transient retry interaction behavior.
3. Write failing tests for request/support ID visibility and placement.
4. Implement/refactor with tests green.

## Stories
- As a user, I can recover from errors without guessing what to do.
- As support staff, I can gather diagnostics when escalation is needed.

## Acceptance Criteria
- Primary error states include a clear next action.
- Transient errors offer retry and recover state correctly.
- Request/support IDs are available without dominating the UI.

## End-of-Sprint Verification
```bash
npm run test -- problem-details recovery
npm run lint
npm run build
```
Manual checks:
- Simulate auth, conflict, and transient service errors.
- Validate copy clarity and actionability across error categories.

Pass condition:
- Sprint 39 tests pass.
- Recovery confidence acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Shared problem-recovery view-model and action mapping:
	- `src/lib/problem-recovery-ui.ts`
	- `src/lib/__tests__/problem-recovery-ui.test.ts`
- Problem Details renderer upgrade (human-first headline/cause, next actions, transient retry, support-id secondary details):
	- `src/components/problem-details.tsx`
- Route error boundaries switched to unified recovery renderer with retry callback:
	- `src/app/(public)/error.tsx`
	- `src/app/(admin)/error.tsx`

Verification executed:
```bash
npm test -- src/lib/__tests__/problem-recovery-ui.test.ts src/lib/__tests__/admin-operations-ui.test.ts src/app/__tests__/e2e-admin-operations-security.test.ts
npm run lint
npm run build
```

Verification outcome:
- Problem-recovery behavior tests passed.
- Lint passed with pre-existing unrelated warnings only.
- Production build passed.
