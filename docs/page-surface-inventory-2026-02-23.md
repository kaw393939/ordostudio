# Page Surface Inventory (Routes, Roles, Primary Tasks)

Date: 2026-02-23

Purpose: a complete checklist of UI surfaces so we can audit and refactor systematically.

Legend:
- Audience: `guest`, `user`, `admin`
- Roles: `AFFILIATE`, `APPRENTICE`, `MAESTRO`, `ADMIN`, `SUPER_ADMIN`

---

## Public

- `/` — guest/user — orient, browse offers/events, trust
- `/services` — guest/user — discover offers
- `/services/request` — guest/user — submit intake
- `/events` — guest/user — discover events
- `/events/[slug]` — guest/user — understand event, register/cancel
- `/studio` — guest/user — brand/story, operator trust
- `/studio/report` — user/admin (APPRENTICE) — submit field report
- `/apprentices` — guest/user — browse apprentice directory
- `/apprentices/[handle]` — guest/user — view apprentice profile
- `/newsletter` — guest/user — subscribe
- `/newsletter/unsubscribe` — guest/user — unsubscribe
- `/resources/*` — guest/user — content library
- `/frameworks/*` — guest/user — frameworks content
- `/login`, `/register` — guest — auth
- `/privacy`, `/terms`, `/about` — guest/user — legal/about

## Account

- `/account` — user/admin — role cockpit (affiliate/apprentice/operator)
- `/account/apprentice-profile` — user/admin (APPRENTICE) — profile management

## Admin (operators)

- `/admin` — admin — operator hub (launch tasks)
- `/admin/intake` — admin — triage requests → create deal → assign owner
- `/admin/deals` — admin — work queue for deal lifecycle
- `/admin/deals/[id]` — admin — detailed deal operations
- `/admin/ledger` — admin — approve/payout money ops
- `/admin/newsletter` — admin — issue list + create
- `/admin/newsletter/[id]` — admin — draft/review/publish
- `/admin/events` — admin — events ops
- `/admin/events/[slug]` — admin — event management
- `/admin/events/[slug]/registrations` — admin — registrations/check-ins
- `/admin/events/[slug]/export` — admin — export
- `/admin/users` — admin — user status/roles
- `/admin/referrals` — admin — referral ops
- `/admin/field-reports` — admin — review reports
- `/admin/field-reports/[id]` — admin — report detail
- `/admin/audit` — admin — trace incidents
- `/admin/offers` — admin — offer catalog ops
- `/admin/offers/[slug]` — admin — offer detail ops
- `/admin/commercial` — admin — commercial ops
- `/admin/engagements` — admin — engagements ops
- `/admin/registrations` — admin — registrations ops
- `/admin/measurement` — admin — measurement
- `/admin/flywheel` — admin — growth/flywheel
- `/admin/entitlements` — admin — entitlements
- `/admin/settings` — admin — system settings
- `/admin/apprentices` — admin — apprentices ops

---

## Notes

This inventory is intentionally task-oriented. During refactors we’ll tighten each page to 1–2 primary tasks and move everything else behind disclosure or deeper links.
