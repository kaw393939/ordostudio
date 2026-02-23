# Sprint 33 — Obviousness Pass

## Goal
Make app context and next actions instantly clear across Public and Admin experiences.

Prerequisite:
- Sprint 33A foundation is complete (tokens, shared patterns, adapter boundaries).

## Scope
- Split route groups and layouts for public/admin shells.
- Add role and environment badges in admin header.
- Add breadcrumb pattern for key detail pages.
- Add `loading.tsx` and `error.tsx` boundaries at major route segments.
- Implement features using Sprint 33A shared patterns and token contracts.

## TDD Process
1. Write failing tests for public/admin shell differentiation and badges.
2. Write failing tests for breadcrumb rendering on representative detail pages.
3. Write failing tests for route-level loading and error containment behavior.
4. Implement/refactor with tests green.

## Stories
- As a first-time user, I can quickly tell whether I am in Public or Admin.
- As a user, I see progress while pages load and recover from errors without losing shell context.

## Acceptance Criteria
- Users can answer “Am I in Admin or Public?” in under 5 seconds.
- No major route shows a blank screen while data is loading.
- Errors are contained to route segment and do not crash the app shell.

## End-of-Sprint Verification
```bash
npm run test -- ui-shell navigation
npm run lint
npm run build
```
Manual checks:
- Verify public and admin shells are visually distinct on desktop and mobile.
- Trigger representative route errors and confirm shell remains usable.

Pass condition:
- Sprint 33 tests pass.
- Shell clarity and route resilience acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Route-group split with distinct shells:
	- `src/app/(public)/layout.tsx`
	- `src/app/(admin)/layout.tsx`
- Route migration preserving URLs:
	- public routes under `src/app/(public)/*`
	- admin routes under `src/app/(admin)/admin/*`
- Segment boundaries:
	- `src/app/(public)/loading.tsx`
	- `src/app/(public)/error.tsx`
	- `src/app/(admin)/loading.tsx`
	- `src/app/(admin)/error.tsx`
- Shared breadcrumbs pattern:
	- `src/components/patterns/breadcrumbs.tsx`
	- integrated in representative detail/admin surfaces

Verification executed:
```bash
npm run lint
npm test -- src/app/__tests__/e2e-ui-hardening.test.ts
npm run build
```

Verification outcome:
- `npm run lint` passed with pre-existing unrelated warnings only.
- UI hardening test passed.
- Production build passed.
