# Sprint (Completed) — Krug 01: Navigation Overhaul

Start: 2026-02-23
Complete: 2026-02-23

Goal: make the navigation system “Krug obvious” for every role and viewport.

## Outcome
- Admin pages now implement explicit navigation layers:
  - Primary: `publicHeader`
  - Secondary: `adminHeaderQuick`
  - Tertiary: `adminPrimary` in a left sidebar
  - Footer: `publicFooter`
- Mobile: tertiary nav is an off-canvas drawer overlay (does not stack/push content down).
- Desktop: tertiary nav is persistent and sticky.
- Header spacing tightened to reduce overload while keeping the full public menu visible.

## Files
- `src/components/admin/admin-shell.tsx`
- `src/app/globals.css`

## Verification
- `npm run lint`
- `npm run test -- src/app/__tests__/page-smoke.test.ts`
