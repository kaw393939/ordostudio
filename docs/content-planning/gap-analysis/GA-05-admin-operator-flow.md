# GA-05 — Admin / Operator Flow
**User type:** Keith Williams (Maestro) and any designated admin.  
**Entry point:** `/admin`  
**Purpose:** Manage the full business — intake triage, role approvals, commission ledger, referrals, events, users.

---

## Admin Dashboard (`/admin`)

**File:** `src/app/(admin)/admin/page.tsx`

### What exists
- Navigation links to all admin modules, dynamically driven by `resolveMenuForContext("adminHeaderQuick", context)`
- Clean layout — no substantial issues

### What's needed
| Item | Gap |
|------|-----|
| Pending action count badges | Dashboard shows module links but no "3 pending approvals" badge — operator has to enter each module to see work queued |
| Revenue summary widget | No revenue overview on dashboard — no total commissions earned, total cohort revenue, total referral commissions owed |

---

## Module: Intake (`/admin/intake`)

**File:** `src/app/(admin)/admin/intake/page.tsx` (557 lines — most complete admin module)

### What exists
- Full pipeline view: NEW → TRIAGED → QUALIFIED → BOOKED → LOST
- Per-intake: contact info, org, goals, timeline, constraints, status, owner, priority
- Status transitions with history/notes
- Deal linkage: `deal_id`, `deal_status`
- Filters by status, search by name/email

### What's needed
| Item | Gap |
|------|-----|
| Referral code on intake | `so_ref` cookie attribution is not surfaced in intake detail — operator can't see "this came through Keith's card QR" |
| Project type structured field | `goals` is freetext. Once the service request form adds a structured `project_type` selector, this needs to render on the intake detail view. |
| Commission calculation | No field showing: `estimated_project_value` or `commission_amount` (20%). These would need to be set during TRIAGED → QUALIFIED transition. |
| Intake → Maestro Training routing | No way to flag/redirect an intake as "this is a Maestro Training inquiry, not a project inquiry" |

---

## Module: Approvals (`/admin/approvals`)

**File:** `src/app/(admin)/admin/approvals/page.tsx`

### What exists
- Two tabs: Action Proposals | Role Requests
- Loads PENDING role requests
- Shows: user email, role requested, created_at, context JSON

### What's needed
| Item | Gap |
|------|-----|
| Approve / Reject UI | Detail page at `/admin/approvals/[id]` — need to verify it has working approve/reject buttons |
| Context display | Context is raw JSON blob — should render portfolio URL as a link, `experience` as a paragraph, `audienceSize` as a field |
| Notification sending | No system to notify applicant of decision — critical user experience gap |
| Journeyman application | No `JOURNEYMAN` role request type in approvals — Journeyman application flow doesn't exist yet |
| Maestro Training enrollment approval | Maestro Training enrollment (from booking → paid → confirmed) doesn't go through this approvals flow — where does it land? |

---

## Module: Users (`/admin/users`)

**File directory:** `src/app/(admin)/admin/users/`

### What exists
- Directory exists — content not fully read

### What's needed (minimum)
- User list with roles
- Ability to manually assign/change roles (fallback if approvals API breaks)
- Filter by role: APPRENTICE, JOURNEYMAN, MAESTRO, AFFILIATE, ADMIN

---

## Module: Engagements (`/admin/engagements`)

**File:** `src/app/(admin)/admin/engagements/page.tsx`

### What exists
- **Stub** — empty state: `"No engagements dashboard yet"`, links to `/admin/events`

### What's needed (aligned to business model)
An "engagement" in the new business model is a completed or in-progress project commission. This is the most important financial tracking surface after the ledger.

| Item | Needed |
|------|--------|
| Project commission tracking | List of active/completed projects: client, project type, total value, 20% commission, payment status |
| Maestro Training enrollment tracking | List of enrolled cohort students: name, cohort start date, payment status, completion status |
| Engagement ↔ ledger linkage | Each completed project should auto-generate a `PLATFORM_REVENUE` + `REFERRER_COMMISSION` ledger entry |

**This module is the biggest operational gap in the admin.** It needs to be built to track the actual business.

---

## Module: Referrals (`/admin/referrals`)

*See GA-04 for full referrals audit.*

Summary of gaps:
- Commission approval not surfaced on this page (must go to ledger separately)
- No attribution source breakdown (project vs. training vs. event)

---

## Module: Ledger (`/admin/ledger`)

*See GA-04 for full ledger audit.*

Summary of gaps:
- No UI to create ledger entries from a project completion
- No payment method on file for beneficiary
- No export for accounting (verify the `_links.export` endpoint works)

---

## Module: Commercial (`/admin/commercial`) + Deals (`/admin/deals`)

**File directory:** `src/app/(admin)/admin/commercial/` and `/admin/deals/`  
*(Not fully read — deeper audit needed)*

### What's assumed to exist
- Deal pipeline (from intake → deal → closed)
- Connected to ledger via `deal_id`

### What's needed
- Confirm that `deal_id` on intake flows through to a deal record that tracks project value and triggers commission calculation
- If deals are the mechanism for project commission tracking, this is the right place — but operator needs a clear visual flow from intake → deal → ledger entry

---

## Module: Agent Ops (`/admin/agent-ops`) + Flywheel, Telemetry, Measurement

**Files:** Various `/admin/` sub-pages  
*(Not read — assumed to be internal tooling)*

### Decision needed
Which of these internal admin tools are retained vs. archived? They're not related to the buyer/learner/affiliate flows in the content plan.

---

## Module: Events (`/admin/events`)

**File directory:** `src/app/(admin)/admin/events/`

### What exists
- Events management module (listings, registrations)

### Relationship to new model
Events are a lead-generation and community surface — not a primary revenue stream. They stay but are not acquisition-critical. The `RecommendedEvents` component on `/studio` should move to `/insights` or `/newsletter` once `/studio` is client-facing only.

---

## Critical Gaps Summary (Admin)

| Priority | Gap | Module |
|----------|-----|--------|
| P1 | Engagements module is a stub — primary business tracking surface missing | `/admin/engagements` |
| P1 | No notification system for role request approvals | `/admin/approvals` |
| P2 | No commission calculation flow from project → ledger | `/admin/ledger` + `/admin/commercial` |
| P2 | Referral attribution not surfaced on intake detail | `/admin/intake` |
| P3 | No Maestro Training cohort tracking | (new module needed) |
| P3 | Dashboard has no pending-count badges or revenue summary | `/admin` |
| P4 | Context JSON rendered as raw blob in approvals | `/admin/approvals` |
