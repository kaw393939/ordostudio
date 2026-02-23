# Sprint (Completed) — Krug 02: Role Home Screens

Start: 2026-02-23
Complete: 2026-02-23

Goal: each role has a single cockpit that answers “what next / what urgent / what’s my status”.

## Outcome
- `/account` behaves as a role-shaped cockpit:
  - AFFILIATE-only: referral-focused dashboard
  - APPRENTICE: field-ops quick actions
  - MAESTRO/ADMIN: operator cockpit (triage + money ops + publishing)
- `/admin` dashboard is a simple task hub (tiles driven from `adminHeaderQuick`).

## Files
- `src/app/(public)/account/page.tsx`
- `src/app/(admin)/admin/page.tsx`

## Verification
- `npm run lint`
- `npm run test -- src/app/__tests__/page-smoke.test.ts`
