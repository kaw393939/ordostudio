# QA Checklist — Krug Usability + Navigation (All Roles)

Date: 2026-02-23

Purpose: verify the app is **obvious**, role-appropriate, and responsive.

---

## Test accounts / roles

Run these checks at minimum for:
- Guest (not logged in)
- USER only
- AFFILIATE only
- APPRENTICE
- MAESTRO
- ADMIN

---

## Viewports

Test at:
- Mobile width (~390px)
- Tablet width (~768px)
- Desktop width (~1280px)

---

## Global navigation checks

### Public pages
- Header shows `publicHeader` and active item highlights correctly.
- Footer shows `publicFooter`.
- No admin nav appears for guest/user (unless explicitly intended).

### Admin pages
- Primary header remains visible while scrolling.
- Secondary admin quick nav is visible below primary.
- Tertiary nav (admin sidebar):
  - Desktop: persistent left column.
  - Mobile: drawer overlay (must not push content down).
- Cmd+K opens palette.

---

## Role landing page checks

### `/account` (Dashboard)
- AFFILIATE-only: sees referral-focused cockpit; no irrelevant operator panels.
- APPRENTICE: sees field ops quick actions.
- MAESTRO/ADMIN: sees operator cockpit.

### `/admin`
- Admin dashboard shows 3–5 obvious next tasks (tiles).

---

## Critical workflow checks (manual)

### Intake → Deal → Delivery → Ledger
1) Submit intake: `/services/request`
2) Triage: `/admin/intake` (assign owner; create deal)
3) Operate deal: `/admin/deals` (status progression)
4) Ledger: `/admin/ledger` (approve → pay)

Pass condition: operator can complete without reading a manual.

---

## Commands / automated sanity

- `npm run lint`
- `npm run test -- src/app/__tests__/page-smoke.test.ts`
- `npm run build`
