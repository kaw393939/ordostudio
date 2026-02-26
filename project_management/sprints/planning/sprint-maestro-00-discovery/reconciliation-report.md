# Studio Ordo Reconciliation Report
> Sprint: Maestro-00 (Discovery Pass)  
> Source Spec: `project_management/letter.6.md` — "Studio Ordo Canonical Persona Pack for MCP Tools and Evals"  
> Generated: 2025-01  
> Status: **BASELINE ESTABLISHED**

---

## Executive Summary

The letter.6.md canonical spec defines 10 personas, 6 MCP tool domains, 5 canonical journeys (A–E), 10 minimum policy rules, and a 3-level eval framework.

This report maps every element of that spec against the **actual codebase** as of the discovery pass.

**Top-line verdict:**

| Dimension | Status |
|-----------|--------|
| DB schema coverage | ✅ Strong — all 6 domains have underlying tables |
| API route coverage | ✅ Good — 140+ routes, all journeys have endpoints |
| MCP tool coverage | ⚠️ Partial — 20 tools, 4 of 6 domains covered |
| Agent chat tools | ⚠️ Thin — 5 tools, only 2 of 6 domains covered |
| Roles / identity | ❌ Gap — 5 DB roles vs 10 letter personas; 3 roles missing |
| Eval coverage | ❌ Gap — 13 scenarios, 3 types; no `policy` type, no persona-specific coverage |

---

## Part 1 — Canonical Domains vs Existing Code

### Domain 1: Practice OS (Site · Content · Knowledge Base)

**Letter definition:** Site-wide settings, KB search, content ingestion pipeline.

| Asset | Exists | Location |
|-------|--------|----------|
| `content_search` agent tool | ✅ | `src/lib/api/agent-tools.ts:42` |
| `get_site_setting` agent tool | ✅ | `src/lib/api/agent-tools.ts:60` |
| `ingest_item` MCP tool | ✅ | `src/mcp/tools.ts:79` |
| `list_ingested_items` MCP tool | ✅ | `src/mcp/tools.ts:109` |
| `/api/v1/content/search` route | ✅ | `src/app/api/v1/content/search/route.ts` |
| `ingested_items` DB table | ✅ | `src/cli/db.ts` |
| `site_settings` DB table | ✅ | `src/cli/db.ts` |

**Missing tools per letter:**
- `get_kb_article` — read a specific KB article by slug
- `get_content_search_log` — search analytics (planned Sprint-03)
- `get_funnel_velocity` — conversion-rate trends (planned Sprint-03)

**Gap assessment:** Site and content foundation is solid. Analytics and reporting layer is missing.

---

### Domain 2: Membership & Identity (Roles · Credentials · Rank)

**Letter definition:** All persona role models, onboarding flows, apprentice rank gates.

| Asset | Exists | Location |
|-------|--------|----------|
| `roles` DB table | ✅ | `src/cli/db.ts` |
| `role_requests` DB table (PENDING\|APPROVED\|REJECTED) | ✅ | `src/cli/db.ts` |
| `apprentice_profiles` DB table | ✅ | `src/cli/db.ts` |
| `apprentice_levels` DB table | ✅ | `src/cli/db.ts` |
| `gate_projects` DB table | ✅ | `src/cli/db.ts` |
| `apprentice_gate_submissions` DB table | ✅ | `src/cli/db.ts` |
| `/api/v1/roles/request` route | ✅ | `src/app/api/v1/roles/request/route.ts` |
| `/api/v1/apprentices/*` routes | ✅ | `src/app/api/v1/apprentices/` |
| `/api/v1/account/role-requests` route | ✅ | `src/app/api/v1/account/role-requests/route.ts` |
| `createRoleRequest()` lib function | ✅ | `src/lib/api/roles.ts` |
| MCP tool: any membership tool | ❌ | Not present |
| Agent tool: any membership tool | ❌ | Not present |

**Role model gap — DB vs Letter:**

| Letter Persona | DB Role | Exists? |
|----------------|---------|---------|
| New Visitor / Prospect | USER | ✅ |
| Lead / Intake Requester | USER (+ intake_request row) | ✅ |
| Event Attendee / Field Member | USER (+ registration row) | ✅ |
| Affiliate Referrer | AFFILIATE | ✅ |
| Apprentice | APPRENTICE | ✅ |
| The Maestro / Studio Director | ADMIN / SUPER_ADMIN | ✅ (2 roles) |
| Associate | ASSOCIATE | ❌ Missing |
| Certified Consultant | CERTIFIED_CONSULTANT | ❌ Missing |
| Staff / Operations | STAFF or DIRECTOR | ❌ Missing |
| Anonymous / Public | (no auth) | ✅ By convention |

**3 DB roles missing:** ASSOCIATE, CERTIFIED_CONSULTANT, STAFF.

**Missing tools per letter:**
- `apply_for_apprenticeship` — create role_request for APPRENTICE
- `activate_member_profile` — admin transitions USER → AFFILIATE or APPRENTICE
- `issue_affiliate_code` — generates a referral_code for a new affiliate
- `generate_affiliate_card` — QR/link card payload for an affiliate
- `review_apprentice_application` — admin reads a gate_submission and approves/rejects
- `list_assigned_tasks` — apprentice views their gate_projects
- `view_rank_requirements` — read apprentice_levels table
- `list_role_upgrade_requests` — admin reads role_requests queue

---

### Domain 3: Commerce & Finance (Deals · Proposals · Invoices · Ledger)

**Letter definition:** Full revenue cycle — intake → deal → proposal → invoice → payment → commission payout.

| Asset | Exists | Location |
|-------|--------|----------|
| `deals` DB table | ✅ | `src/cli/db.ts` — status includes `MAESTRO_APPROVED` gate |
| `proposals` DB table | ✅ | `src/cli/db.ts` |
| `invoices` DB table | ✅ | `src/cli/db.ts` |
| `payments` DB table | ✅ | `src/cli/db.ts` |
| `ledger_entries` DB table | ✅ | type: `PROVIDER_PAYOUT\|REFERRER_COMMISSION\|PLATFORM_REVENUE`; status: `EARNED\|APPROVED\|PAID\|VOID` |
| `engagements` DB table | ✅ | type: `PROJECT_COMMISSION\|MAESTRO_TRAINING` |
| `offers` / `packages` DB table | ✅ | `src/cli/db.ts` |
| `referral_conversions` DB table | ✅ | conversion_type: `INTAKE_REQUEST`; links code → intake |
| `/api/v1/commercial/*` routes | ✅ | proposals, invoices, payments |
| `/api/v1/admin/deals` route | ✅ | `src/app/api/v1/admin/deals/` |
| `/api/v1/admin/ledger` route | ✅ | `src/app/api/v1/admin/ledger/` |
| `/api/v1/webhooks/stripe` route | ✅ | `src/app/api/v1/webhooks/stripe/route.ts` |
| MCP tool: `list_deals` | ✅ | `src/mcp/tools.ts:219` |
| MCP tool: `assign_deal` | ✅ | `src/mcp/tools.ts:242` |
| MCP tool: `approve_deal` | ✅ | `src/mcp/tools.ts:275` |
| Agent tool: any commerce tool | ❌ | Not present |

**Missing tools per letter:**
- `get_customer_timeline` — CRM view of a contact's full deal/invoice history
- `create_payment_request` — admin-initiated payment link generation
- `trigger_urgent_callback` — flag a deal for immediate outreach
- `list_pending_commissions` — affiliate ledger filtered to EARNED/APPROVED
- `void_commission` — mark a ledger_entry VOID on refund (policy rule 8)

**Notable:** `referral_conversions.conversion_type` is currently only `INTAKE_REQUEST`. Letter requires tracking through to invoice payment — migration needed to add `INVOICE_PAID` type.

---

### Domain 4: Media & Reporting (Field Reports · Newsletter · Ingestion)

**Letter definition:** Field reports → featured → newsletter pipeline; ingest from external sources.

| Asset | Exists | Location |
|-------|--------|----------|
| `field_reports` DB table | ✅ | structured: key_insights, models, money, people, what_i_tried, client_advice |
| `newsletter_issues` DB table | ✅ | `src/cli/db.ts` |
| `newsletter_blocks` DB table | ✅ | `src/cli/db.ts` |
| `newsletter_subscribers` DB table | ✅ | `src/cli/db.ts` |
| `ingested_items` DB table | ✅ | `src/cli/db.ts` |
| `/api/v1/admin/field-reports` route | ✅ | `src/app/api/v1/admin/field-reports/` |
| `/api/v1/admin/newsletter` route | ✅ | `src/app/api/v1/admin/newsletter/` |
| `/api/v1/newsletter/*` route | ✅ | subscribe/unsubscribe |
| MCP tool: `list_field_reports` | ✅ | `src/mcp/tools.ts:301` |
| MCP tool: `get_field_report` | ✅ | `src/mcp/tools.ts:320` |
| MCP tool: `feature_field_report` | ✅ | `src/mcp/tools.ts:335` |
| MCP tool: `summarize_field_report` | ✅ | `src/mcp/tools.ts:361` |
| MCP tool: `attach_field_report_to_newsletter` | ✅ | `src/mcp/tools.ts:404` |
| MCP tool: `attach_ingested_item_to_newsletter` | ✅ | `src/mcp/tools.ts:124` |
| MCP tool: `create_newsletter_issue` | ✅ | `src/mcp/tools.ts:441` |
| MCP tool: `generate_newsletter` | ✅ | `src/mcp/tools.ts:465` |
| MCP tool: `schedule_newsletter` | ✅ | `src/mcp/tools.ts:518` |
| MCP tool: `export_newsletter` | ✅ | `src/mcp/tools.ts:544` |
| Agent tool: any media tool | ❌ | Not present |

**Missing tools per letter:**
- `subscribe_to_newsletter` — prospect opts in during intake/chat flow
- `convert_subscriber_to_lead` — newsletter subscriber → intake request
- `capture_content_interest` — tag a contact with content preference for segmentation

**Assessment:** This is the **most complete domain**. The full report→newsletter pipeline is built and exposed through MCP tools. The gap is the subscriber-side agent tools for the public chat flow.

---

### Domain 5: Studio Delivery (Events · Bookings · Maestro Availability)

**Letter definition:** Event lifecycle, bookings, Maestro scheduling.

| Asset | Exists | Location |
|-------|--------|----------|
| `events` DB table | ✅ | `src/cli/db.ts` |
| `event_registrations` DB table | ✅ | `src/cli/db.ts` |
| `bookings` DB table | ✅ | `src/cli/db.ts` |
| `maestro_availability` DB table | ✅ | `src/cli/db.ts` |
| `/api/v1/events/*` routes | ✅ | full lifecycle + registrations + artifacts |
| `/api/v1/bookings` route | ✅ | `src/app/api/v1/bookings/route.ts` |
| `/api/v1/maestro/availability` route | ✅ | `src/app/api/v1/maestro/availability/route.ts` |
| Agent tool: `get_available_slots` | ✅ | `src/lib/api/agent-tools.ts:123` |
| Agent tool: `create_booking` | ✅ | `src/lib/api/agent-tools.ts:141` |
| MCP tool: any delivery tool | ❌ | Not present |

**Missing tools per letter:**
- `set_schedule` — Maestro admin sets/clears availability blocks (Maestro-01 sprint)
- `cancel_booking` — admin-initiated cancellation with notification
- `get_event_attendance` — summary of registered vs attended for a given event
- `list_registered_attendees` — enumerate registrations for event-level targeting
- `create_event` / `update_event` — event management through MCP (Maestro-01)

---

### Domain 6: Governance & Audit (Action Proposals · Triage · Audit · Workflows)

**Letter definition:** Risk-leveled action proposals, intake triage, audit log, workflow automation.

| Asset | Exists | Location |
|-------|--------|----------|
| `action_proposals` DB table | ✅ | status: `PENDING\|APPROVED\|DENIED\|EXPIRED`; risk_level: `LOW\|MEDIUM\|HIGH` |
| `triage_tickets` DB table | ✅ | category: 7 types; priority: low/med/high/urgent; status: 6 states |
| `workflow_rules` DB table | ✅ | `src/cli/db.ts` |
| `workflow_executions` DB table | ✅ | `src/cli/db.ts` |
| `feed_events` DB table | ✅ | `src/cli/db.ts` |
| `/api/v1/admin/triage` route | ✅ | `src/app/api/v1/admin/triage/` |
| `/api/v1/admin/workflows` route (assumed) | ✅ | `src/app/api/v1/admin/` |
| MCP tool: `get_audit_log` | ✅ | `src/mcp/tools.ts:563` |
| MCP tool: `propose_action` | ✅ | `src/mcp/tools.ts:590` |
| Agent tool: `submit_intake` | ✅ | `src/lib/api/agent-tools.ts:79` |

**Missing tools per letter (Maestro Ops Agent — 21 tools planned in Sprint-01):**
- `get_ops_brief` — daily summary (planned Sprint-03)
- `list_triage_queue` — Maestro views pending triage tickets
- `override_triage` — admin triage category override
- `list_workflow_rules` / `toggle_workflow_rule` — automation management
- `list_role_upgrade_requests` — role approval queue
- All 17 remaining ops tools in Sprint-01 spec

---

## Part 2 — Canonical Journeys vs Existing Routes

> **Note:** The canonical letter defines **6 journeys** (A–F). The initial report omitted Journey F. Corrected here.

### Journey A: Event to Lead
**Trigger:** User attends event → files field report → report surfaces in marketing

| Step | Route | Tool | Status |
|------|-------|------|--------|
| User registers for event | `/api/v1/events/:id/registrations` | — | ✅ route |
| User files field report | `/api/v1/account/field-reports` | — | ✅ route |
| Admin reviews report | `/api/v1/admin/field-reports` | `list_field_reports`, `get_field_report` | ✅ |
| Admin features report | `/api/v1/admin/field-reports/:id/feature` | `feature_field_report` | ✅ |
| Report → newsletter | — | `attach_field_report_to_newsletter` | ✅ |
| Newsletter subscriber becomes lead | — | ❌ no `convert_subscriber_to_lead` tool | ❌ gap |

**Journey A verdict: 5/6 steps covered. Missing: subscriber→lead conversion tool.**

---

### Journey B: Lead to Booking
**Trigger:** Prospect submits intake → Maestro triages → deal → booking confirmed

| Step | Route | Tool | Status |
|------|-------|------|--------|
| Prospect chats with agent | `/api/v1/agent/chat` | `content_search`, `get_site_setting` | ✅ |
| Agent submits intake | `/api/v1/intake` | `submit_intake` | ✅ |
| Admin triage | `/api/v1/admin/triage` | `triage_intake` (MCP) | ✅ |
| Deal created | — | `list_deals`, `approve_deal` | ✅ |
| Maestro approves | — | `approve_deal` (MAESTRO_APPROVED status gate) | ✅ |
| Booking created | `/api/v1/bookings` | `create_booking` | ✅ |

**Journey B verdict: Full coverage. Best-covered journey.**

---

### Journey C: Referral to Purchase
**Trigger:** Affiliate shares referral link → visitor converts → deal closes → commission paid

| Step | Route | Tool | Status |
|------|-------|------|--------|
| Affiliate gets referral link | `/api/v1/account/referral` | ❌ no `get_affiliate_link` tool | ❌ gap |
| Visitor clicks referral link | `/api/v1/referrals/*` | — | ✅ route |
| Referral conversion logged | auto on intake | — | ✅ (INTAKE_REQUEST type only) |
| Deal closes | `/api/v1/admin/deals` | `approve_deal` | ✅ |
| Commission calculated | — | ❌ no `list_pending_commissions` tool | ❌ gap |
| Payout approved | `/api/v1/admin/ledger` | ❌ no `approve_payout` tool | ❌ gap |

**Journey C verdict: Route infrastructure exists. No agent/MCP tools for affiliate side or payout side. DB only tracks `INTAKE_REQUEST` conversions — no `INVOICE_PAID` tracking.**

---

### Journey D: Apprentice Advancement
**Trigger:** Apprentice applies → gate review → rank promotion → role upgrade

| Step | Route | Tool | Status |
|------|-------|------|--------|
| User requests apprentice role | `/api/v1/roles/request` | ❌ no `apply_for_apprenticeship` tool | ❌ gap |
| Apprentice views requirements | `/api/v1/apprentices/levels` (assumed) | ❌ no `view_rank_requirements` tool | ❌ gap |
| Apprentice submits gate project | `/api/v1/apprentices/gate-submissions` | — | ✅ route |
| Admin reviews submission | `/api/v1/admin/apprentices` | ❌ no `review_apprentice_application` tool | ❌ gap |
| Role approved | `/api/v1/admin/role-requests` | ❌ no `list_role_upgrade_requests` tool | ❌ gap |
| User promoted | `/api/v1/users/:id/role` | ❌ no `promote_user` MCP tool | ❌ gap |

**Journey D verdict: Routes and DB are complete. Zero MCP/agent tools for this entire journey.**

---

### Journey E: Reporting to Media
**Trigger:** Maestro curates field reports → drafts newsletter → publishes

| Step | Route | Tool | Status |
|------|-------|------|--------|
| List this week's reports | — | `list_field_reports` | ✅ |
| Review and feature best report | — | `get_field_report`, `feature_field_report` | ✅ |
| AI summarizes report | — | `summarize_field_report` | ✅ |
| Create newsletter issue | — | `create_newsletter_issue` | ✅ |
| Attach content | — | `attach_field_report_to_newsletter`, `attach_ingested_item_to_newsletter` | ✅ |
| Draft with AI | — | `generate_newsletter` | ✅ |
| Schedule | — | `schedule_newsletter` | ✅ |
| Export markdown | — | `export_newsletter` | ✅ |

**Journey E verdict: Fully covered. This is the showcase journey.**

---

### Journey F: High-Value Lead Escalation
**Trigger:** Incoming intake is flagged as high-priority/urgent → bypasses standard triage queue → routed to immediate human callback instead of automation

| Step | Route | Tool | Status |
|------|-------|------|--------|
| Intake submitted | `/api/v1/intake` | `submit_intake` | ✅ |
| Triage ticket created | auto on intake | — | ✅ triage_tickets.priority = 'urgent' |
| Urgent flag detected | `/api/v1/admin/triage` | ❌ no `flag_urgent_intake` tool | ❌ gap |
| Maestro notified | feed_events | ❌ not triggered on urgent priority | ❌ gap |
| Human callback scheduled | `/api/v1/maestro/availability` | ❌ no `trigger_urgent_callback` tool | ❌ gap |
| Callback outcome logged | — | ❌ no callback outcome tool | ❌ gap |

**Journey F verdict: Infrastructure partially in place (triage priority field exists). Zero tools for the escalation surface. This is the highest-risk gap — high-intent leads may fall into automation and be lost.**

**Why this matters (per letter.6.md):** The whole model depends on urgent/high-intent leads being routed to personal human contact. Over-automating this path directly undermines the "25% lifetime relationship" positioning.

**Tools needed:**
- `flag_urgent_intake` — marks triage ticket priority `urgent` and triggers immediate Maestro feed event
- `trigger_urgent_callback` — admin-initiated: reserves next open slot + creates a pre-booking hold
- `log_callback_outcome` — records the result of the callback call on a deal or intake

---

## Part 3 — Policy Rules vs Enforcement

The letter defines 10 minimum policy rules. Current enforcement status:

| # | Policy Rule | Enforced? | Where |
|---|-------------|-----------|-------|
| 1 | No double-booking a slot | ❌ Gap | Slot uniqueness check missing in `create_booking` |
| 2 | Intake visible only to submitter and ADMIN | ✅ Partial | `src/lib/api/intake.ts` actor checks |
| 3 | Self-referral must be blocked | ❌ Gap | No check in referral resolution route |
| 4 | Field reports only by APPRENTICE or higher | ✅ Partial | Route-level auth check exists |
| 5 | Deal approval requires MAESTRO_APPROVED status gate | ✅ | Deal status machine in DB |
| 6 | Action proposals require admin confirmation string | ✅ | `propose_action` tool uses `requireConfirm()` |
| 7 | Apprentice cannot access CERTIFIED-only tools | ❌ Gap | No CERTIFIED role in DB to gate against |
| 8 | Commission voided on refund | ❌ Gap | Stripe webhook does not void ledger entries |
| 9 | Newsletter send requires at least one attached block | ⚠️ Unclear | Not verified in `schedule_newsletter` |
| 10 | Role escalation cannot be self-approved | ✅ Partial | Separate approved_by / user_id fields |

**5 of 10 policy rules are unverified or missing.**

---

## Part 4 — Eval Coverage Audit

### Current eval inventory

| Type | Count | Scenarios |
|------|-------|-----------|
| `workflow` | 4 | - |
| `triage` | 4 | - |
| `intake-agent` | 5 | - |
| `policy` | 0 | ❌ Type does not exist |
| **Total** | **13** | All passing |

### Missing eval coverage per letter

**Policy / abuse evals (new type needed):**
- `policy-self-referral` — affiliate submits own intake, should be blocked
- `policy-double-booking` — attempt to book an already-taken slot
- `policy-apprentice-scope` — APPRENTICE calls certified-only MCP tool, should 403
- `policy-commission-void` — invoice refunded, commission should auto-void
- `policy-role-self-approve` — user tries to approve their own role request
- `policy-intake-visibility` — non-owner, non-admin cannot fetch intake detail

**Persona-specific evals (coverage gaps):**
- `affiliate-get-link` — AFFILIATE retrieves their referral link and QR
- `affiliate-view-commissions` — AFFILIATE lists pending ledger entries
- `apprentice-apply` — USER submits apprentice application via agent
- `apprentice-view-gate` — APPRENTICE views gate project requirements
- `maestro-ops-brief` — ADMIN requests daily ops summary
- `maestro-approve-deal` — ADMIN reviews and approves a deal through MCP
- `maestro-triage-override` — ADMIN overrides an auto-triage category

**Total missing evals: ~13 new scenarios across 2 new types (policy, persona).**

---

## Part 5 — Duplication / Overlap Surfaces

These surfaces exist in both agent-tools.ts (public chat) and mcp/tools.ts (admin) and should be reviewed for divergence:

| Capability | Agent Tool | MCP Tool | Overlap Risk |
|------------|-----------|----------|--------------|
| Submit intake | `submit_intake` | `list_intake`, `get_intake` | Read vs write — OK, different actors |
| Triage | none | `triage_intake` | None |
| Booking | `create_booking` | none | No overlap yet |

No critical divergence found. The two tool registries serve different actors (public vs admin) cleanly.

**One structural concern:** `src/lib/api/agent-tools.ts` is coupled to the `/api/v1/agent/chat` route only. As personas expand, this file will need to be refactored into a registry pattern matching `src/mcp/tools.ts`.

---

## Part 6 — Build Order Recommendation

Based on this gap analysis, the recommended sprint sequence is:

### Priority 1 — Close DB Gaps (prerequisite for all tool work)
**Sprint Maestro-00b (DB migrations)**
- Add roles: `ASSOCIATE`, `CERTIFIED_CONSULTANT`, `STAFF`
- Add `referral_conversions.conversion_type` value: `INVOICE_PAID`
- Policy enforcement: self-referral block in referral resolution route; double-booking check; refund→commission void in Stripe webhook

### Priority 2 — Maestro Ops Agent (planned, proceed)
**Sprint Maestro-01** — 21 MCP tools + 14 eval scenarios (Governance domain focus)
**Sprint Maestro-02** — `/admin/chat` UI
**Sprint Maestro-03** — `get_ops_brief`, `get_funnel_velocity`, `get_content_search_log` (analytics)

### Priority 3 — Membership Tools (Journey D)
**Sprint Persona-01** — 8 membership/apprentice tools + 5 apprentice persona evals

### Priority 4 — Affiliate Tools (Journey C)
**Sprint Persona-02** — affiliate link tools + commission ledger tools + 3 affiliate evals

### Priority 5 — Policy Eval Suite
**Sprint Eval-01** — add `policy` eval type to `src/evals/types.ts` + 6 policy scenarios

### Priority 6 — Studio Delivery Expansion (Journey A expanded)
**Sprint Persona-03** — event management MCP tools + subscriber→lead tools + 3 evals

---

## Appendix A — Complete Tool Inventory

### MCP Tools (`src/mcp/tools.ts`) — 20 tools

| Tool | Domain | Actor |
|------|--------|-------|
| `ingest_item` | Practice OS | ADMIN |
| `list_ingested_items` | Practice OS | ADMIN |
| `attach_ingested_item_to_newsletter` | Media | ADMIN |
| `list_intake` | Governance | ADMIN |
| `get_intake` | Governance | ADMIN |
| `triage_intake` | Governance | ADMIN |
| `list_deals` | Commerce | ADMIN |
| `assign_deal` | Commerce | ADMIN |
| `approve_deal` | Commerce | ADMIN |
| `list_field_reports` | Media | ADMIN |
| `get_field_report` | Media | ADMIN |
| `feature_field_report` | Media | ADMIN |
| `summarize_field_report` | Media | ADMIN |
| `attach_field_report_to_newsletter` | Media | ADMIN |
| `create_newsletter_issue` | Media | ADMIN |
| `generate_newsletter` | Media | ADMIN |
| `schedule_newsletter` | Media | ADMIN |
| `export_newsletter` | Media | ADMIN |
| `get_audit_log` | Governance | ADMIN |
| `propose_action` | Governance | ADMIN |

### Agent Chat Tools (`src/lib/api/agent-tools.ts`) — 5 tools

| Tool | Domain | Actor |
|------|--------|-------|
| `content_search` | Practice OS | PUBLIC |
| `get_site_setting` | Practice OS | PUBLIC |
| `submit_intake` | Governance | PUBLIC |
| `get_available_slots` | Studio Delivery | PUBLIC |
| `create_booking` | Studio Delivery | PUBLIC |

### Coverage by Domain

| Domain | MCP Tools | Agent Tools | Missing (per letter) |
|--------|-----------|-------------|----------------------|
| Practice OS | 2 | 2 | `get_kb_article`, `get_content_search_log` |
| Membership & Identity | 0 | 0 | 8 tools |
| Commerce & Finance | 3 | 0 | 5 tools |
| Media & Reporting | 11 | 0 | 3 tools |
| Studio Delivery | 0 | 2 | 5 MCP tools |
| Governance & Audit | 4 | 1 | 20 Maestro tools (planned) |

---

## Appendix B — Complete DB Table Inventory by Domain

### Practice OS
`site_settings`, `ingested_items`, `content_search_log` *(missing)*

### Membership & Identity
`users`, `roles`, `role_requests`, `apprentice_profiles`, `apprentice_levels`, `gate_projects`, `apprentice_gate_submissions`

### Commerce & Finance
`deals`, `proposals`, `invoices`, `payments`, `ledger_entries`, `engagements`, `offers`, `packages`, `referral_codes`, `referral_clicks`, `referral_conversions`

### Media & Reporting
`field_reports`, `newsletter_issues`, `newsletter_blocks`, `newsletter_subscribers`, `ingested_items`

### Studio Delivery
`events`, `event_registrations`, `bookings`, `maestro_availability`

### Governance & Audit (incl. Automation)
`intake_requests`, `triage_tickets`, `action_proposals`, `workflow_rules`, `workflow_executions`, `feed_events`, `audit_log`

---

*End of reconciliation report. Next: Sprint Maestro-00b (DB migrations) or Sprint Maestro-01 (ops agent tools).*
