# Krug-Style IA + UI Audit (Menus, Roles, and Page Surfaces)

Date: 2026-02-23

This is a clarity-first audit of the current information architecture (IA) and UI system.

Guiding constraint: the system can do a lot, but **each screen must feel obvious** (Steve Krug). That means:
- Fewer visible choices per screen.
- Clear “where am I / what’s next”.
- Consistent navigation layers.
- Progressive disclosure for advanced / rare actions.

---

## 1) Inventory: users, roles, and “home base”

### Audiences
- `guest`: not signed in
- `user`: signed in (non-operator)
- `admin`: operator context (currently includes `ADMIN`, `SUPER_ADMIN`, `MAESTRO`)

### Roles observed in code/UI
- `AFFILIATE` (many students)
- `APPRENTICE` (field ops + learning path)
- `MAESTRO` (operator, but not necessarily full admin)
- `ADMIN`, `SUPER_ADMIN`

### Home base expectation (Uber principle)
Each role needs **one default landing** that answers:
1) What should I do next?
2) What’s urgent?
3) What’s my status?

Current mapping (implemented):
- Public site: `/` + `publicHeader`
- Signed-in home: `/account` (Dashboard cockpit)
- Operator home: `/admin` (Admin Dashboard tiles)

---

## 2) Inventory: routes (UI surfaces)

### Public routes (guest + user)
- `/` (home)
- `/services` + `/services/[slug]` + `/services/request` (+ sub-pages like advisory/workshop)
- `/events` + `/events/[slug]`
- `/studio` + `/studio/report` (role-gated)
- `/apprentices` + `/apprentices/[handle]`
- `/newsletter` + `/newsletter/unsubscribe`
- `/resources/*` + `/frameworks/*`
- `/about`, `/privacy`, `/terms`
- `/login`, `/register`
- `/account` (+ `/account/apprentice-profile`)

### Admin routes (operator surfaces)
- `/admin` (dashboard)
- `/admin/intake` (triage cockpit)
- `/admin/deals` + `/admin/deals/[id]` (cockpit + detail)
- `/admin/ledger` (cockpit)
- `/admin/newsletter` + `/admin/newsletter/[id]`
- `/admin/events` + `/admin/events/[slug]` + `/admin/events/[slug]/registrations` + `/admin/events/[slug]/export`
- `/admin/users`
- `/admin/audit`
- `/admin/offers` + `/admin/offers/[slug]`
- `/admin/commercial`, `/admin/measurement`, `/admin/flywheel`, `/admin/entitlements`
- `/admin/apprentices`, `/admin/field-reports` + `/admin/field-reports/[id]`, `/admin/referrals`, `/admin/settings`, `/admin/engagements`, `/admin/registrations`

---

## 3) Navigation model (what we want)

### Desired layers (your spec)
1) **Primary**: always-visible “main menu”
2) **Secondary**: contextual menu (appears below primary)
3) **Tertiary**: left navigation (persistent on desktop)
4) **Main content**
5) **Footer menu**

### Current menus in code
Menus are centralized in `src/lib/navigation/menu-registry.ts`:
- `publicHeader` (primary)
- `publicFooter` (footer)
- `adminHeaderQuick` (secondary)
- `adminPrimary` (tertiary)

---

## 4) Findings (what’s not Krug-approved yet)

### F1 — Too many nav surfaces visible at once (stacking overload)
Symptoms:
- Admin pages can show multiple header rows (public + admin quick) *plus* a large left nav.
- On smaller viewports, the left nav can appear as a full-width block above content.

Impact:
- Violates “don’t make me think”: operator must parse nav before doing work.

Krug fix:
- On small viewports: tertiary nav must be an **off-canvas drawer**, not a stacked block.
- On desktop: tertiary nav stays left; header remains slim.
- For operators, public nav should be present but **de-emphasized** (see recommendations).

### F2 — Role clarity leaks into navigation
Symptoms:
- Operator context is inferred from roles; some pages are effectively “operator only” but appear alongside public items.

Krug fix:
- Make the “mode” obvious: Public vs Admin (operator) should be visually distinct.

### F3 — Inconsistent “what’s next” per page
Progress has been made (Intake/Deals/Ledger cockpits), but many admin pages still behave like:
- big lists/tables
- unclear next action
- weak state explanation

Krug fix:
- Apply the cockpit pattern everywhere it makes sense (queue → focus → act; details behind disclosure).

---

## 5) Recommendations (system-level)

### R1 — Navigation contract (one pattern)
For admin pages:
- Primary row: brand + a slim public nav (or “Public site” link) + Cmd+K
- Secondary row: admin quick tasks (3–5)
- Tertiary: admin primary tree (left)
- Footer: publicFooter

For public pages:
- Primary row: publicHeader
- No secondary/tertiary by default

### R2 — Responsive behavior
- `< md`: left nav is a drawer (overlay), never stacked.
- `>= md`: left nav is persistent column.

### R3 — Role home screens
- `AFFILIATE`: referral cockpit first.
- `APPRENTICE`: field ops cockpit (reports + referrals + assigned work).
- `MAESTRO/ADMIN`: operator cockpit (intake/deals/ledger/newsletter).

---

## 6) What “Krug-approved” means (acceptance criteria)

Navigation:
- No page shows 3 nav layers that fight for attention.
- The operator can name where they are in 2 seconds.

Per page:
- Page header states: context + next step.
- Primary action(s) are visible without scrolling.

Per role:
- One home base with 3–5 primary actions.

---

## 7) Next steps

This audit becomes Sprint 1 input. See sprint planning docs in `project_management/sprints/planning/`.
