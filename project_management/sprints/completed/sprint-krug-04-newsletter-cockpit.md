# Sprint (Completed) — Krug 04: Newsletter Cockpit

Start: 2026-02-23
Complete: 2026-02-23

Goal: make newsletter operations feel like a work queue, not a table.

## Outcome
- `/admin/newsletter` refactored to cockpit layout:
  - Queue (left): issues list
  - Focus (right): selected issue summary + obvious “Open” action
  - Create issue available via progressive disclosure

## Files
- `src/app/(admin)/admin/newsletter/page.tsx`

## Verification
- `npm run lint`
- `npm run test -- src/app/__tests__/page-smoke.test.ts`
