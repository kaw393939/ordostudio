# Sprint (Completed) — Krug 03: Admin Cockpit Pass

Start: 2026-02-23
Complete: 2026-02-23

Goal: reduce cognitive load on remaining operator-heavy admin pages.

## Outcome
- `/admin/referrals` refactored into a cockpit (queue → detail) with totals surfaced up front.
- `/admin/field-reports` refactored into a cockpit (queue → detail) with a single obvious “Open” action.
- `/admin/users` improved:
  - auto-load on filter changes
  - selection preserved when possible
- `/admin/audit` improved for triage:
  - sticky “Active filters” summary
  - request_id column + one-click copy

## Files
- `src/app/(admin)/admin/referrals/page.tsx`
- `src/app/(admin)/admin/field-reports/page.tsx`
- `src/app/(admin)/admin/users/page.tsx`
- `src/app/(admin)/admin/audit/page.tsx`

## Verification
- `npm run lint`
- `npm run test -- src/app/__tests__/page-smoke.test.ts`
