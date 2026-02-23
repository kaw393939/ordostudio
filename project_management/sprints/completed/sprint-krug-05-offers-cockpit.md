# Sprint (Completed) — Krug 05: Offers Cockpit

Start: 2026-02-23
Complete: 2026-02-23

Goal: make service offer operations obvious and scannable.

## Outcome
- `/admin/offers` refactored into cockpit layout:
  - Queue (left): offers list with status
  - Focus (right): selected offer actions (activate/deactivate, manage packages)
  - Create offer moved behind disclosure to reduce default clutter

## Files
- `src/app/(admin)/admin/offers/page.tsx`

## Verification
- `npm run lint`
- `npm run test -- src/app/__tests__/page-smoke.test.ts`
