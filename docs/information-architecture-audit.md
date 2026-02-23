# Information Architecture Audit (Menus + RBAC)

Date: 2026-02-22

## Goals
- Slim the global header navigation to reduce cognitive load.
- Use the footer as an “explore” surface instead of hiding everything behind the header.
- Ensure navigation can be gated by RBAC roles (Drupal-style permissions), not just guest/user/admin.
- Avoid dead code: menus are registered in one place and consumed consistently.

## What changed
- Navigation is now explicitly split into menu blocks:
  - `publicHeader` — slim global header
  - `publicFooter` — richer footer
  - `adminHeaderQuick` — small, task-oriented admin header menu (3–5 links)
  - `adminPrimary` — admin shell nav
- Nav context now returns `{ audience, roles }` so role gating works without hacks.

## Current menu block intent

### publicHeader (slim)
Primary, high-frequency paths only:
- Training (`/services`)
- Events (`/events`)
- Studio (`/studio`)
- Book consult (`/services/request`)
- Login/Dashboard

Role-gated (only when relevant):
- Submit report (`/studio/report`) — `APPRENTICE`

### publicFooter (explore)
Secondary paths and legal:
- Apprentices, Insights, About, Newsletter, Terms, Privacy

## RBAC rule
- Menu items may specify:
  - `audience`: guest/user/admin (coarse)
  - `roles`: required RBAC roles (fine)

If roles are unknown, role-gated items are hidden by default.

## Next steps
- Add role-specific menu blocks for:
  - Affiliate (share referral link/QR, attribution status, payout status)
  - Apprentice (field ops: referrals, submit report, apprentice profile)
  - Maestro (triage/review surfaces that are allowed)
  - Admin (already present)
- Keep header slim; put everything else into role dashboards and/or footer.
