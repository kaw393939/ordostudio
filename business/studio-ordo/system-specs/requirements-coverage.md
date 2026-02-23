# Requirements Coverage (Personas/Journeys → As-Is System)

This document bridges:

- Business requirements derived from personas/journey maps
- The canonical “as-is” system specs in this folder

It exists to answer: **Can we plan accurately from today’s reality?**

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## How to use this

1. Start with `business/studio-ordo/journey-maps.md` “Platform features required” checklists.
2. Use the tables below to see what is **Implemented**, **Partial**, or **Not implemented**.
3. For planning:

   - Use **Implemented** as stable building blocks.
   - Treat **Partial** as “finish the slice” work (usually UX + reporting + polish).
   - Treat **Not implemented** as new capability (likely needs schema + API + UI + tests).

Status meanings:

- **Implemented**: present in code with a stable surface (UI route and/or API route) and tests in place.
- **Partial**: some underlying pieces exist (e.g., endpoints) but the end-to-end workflow is incomplete.
- **Not implemented**: no clear code surface exists yet.
- **Unknown**: needs deeper code archaeology.

---

## Current planning readiness (short answer)

We have a strong **inventory of implemented features**:

- `scope.md` inventories major subsystems.
- `api-v1-methods.md` inventories every `/api/v1` endpoint + HTTP method.
- `ui-routes.md` inventories App Router pages.
- `cli-surface.md` inventories CLI/MCP operational capabilities.

What we did *not* yet have (until this doc) is a **persona/journey requirements → implementation coverage** matrix.

---

## Coverage matrix (journeys → capabilities)

### Journey: Enterprise training buyer (Marcus)

Source: `business/studio-ordo/journey-maps.md` (Journey 1)

| Capability | Status | As-is evidence (code/spec) |
| --- | --- | --- |
| Services page with published pricing | Partial | UI routes exist (see `ui-routes.md`); pricing-as-data exists via offers API (`api-domains/offers.md`) |
| Team Readiness Assessment preview/sample | Not implemented | No assessment domain spec exists in `api-domains/` and no obvious `/api/v1/assessment` surface |
| Consultation booking flow | Not implemented | No booking/scheduling API surface in `/api/v1` inventory |
| Deal creation (intake → deal) | Implemented | `api-domains/intake.md`, `api-domains/deals.md` + admin routes under `/api/v1/admin/deals/*` |
| Engagement tracking dashboard | Partial | Event/registration tracking exists; “engagement program” tracking not modeled as a first-class domain |
| Artifact repository per engagement | Partial | File uploads/attachments exist in multiple domains; no single “engagement artifacts” domain |
| Ledgered money movement | Implemented | `api-domains/ledger.md` + Stripe/Connect integration surfaces |
| Pre/post comparison report | Not implemented | No assessment/reporting endpoint beyond current event/deal/ledger exports |
| Repeat engagement flow (re-booking) | Not implemented | No explicit re-book/repeat workflow modeled |
| Referral attribution tracking | Implemented | `api-domains/referrals.md` + intake attribution hook |

### Journey: Studio apprentice (Alex)

Source: `business/studio-ordo/journey-maps.md` (Journey 2)

| Capability | Status | As-is evidence (code/spec) |
| --- | --- | --- |
| Newsletter signup + unsubscribe | Implemented | `api-domains/newsletter.md` |
| Lead magnet download + email capture | Unknown | Public pages exist; capture/download flows need verification in `src/app/(public)` |
| Human Edge Scorecard (interactive + export) | Not implemented | No scorecard domain/API/UI identified |
| Context Pack Kit download | Unknown | Likely content-only; needs verification |
| Application form + review workflow | Not implemented | No apprenticeship application domain/API/UI identified |
| Tuition payment (Stripe Checkout) | Partial | Stripe Checkout exists for deals; no dedicated “tuition” product workflow |
| Apprentice profile + avatar | Implemented | `api-domains/apprentices.md` (account profile endpoints) |
| Level progression tracking | Implemented | `api-domains/apprentices.md` (levels + progress) |
| Gate project submission + review | Implemented | Gate submissions endpoints in apprenticeship surfaces |
| Field report submission & review | Implemented | Field reports exist (see `scope.md` + API routes under account) |
| Spell Book / vocabulary tracking | Implemented | Vocabulary endpoints in apprenticeship surfaces |
| Incident drill scheduling/recording | Not implemented | No incident drill domain/API/UI identified |
| AI Audit Log repository | Partial | Audit log exists (platform/audit), but not “AI audit logs as apprentice artifacts” |
| Demo Day event | Partial | Events exist; no explicit “demo day” workflow beyond events |
| Career Bridge profile | Not implemented | No such domain/API/UI identified |

---

## What to add next (to make planning “accurate by default”)

If you want planning to flow cleanly from personas → roadmap → sprints, the missing artifact is a **capability model** with:

- Named capabilities (1–2 levels deep)
- Owners (business + tech)
- Source-of-truth links (UI route, API endpoint, CLI command, DB tables)
- Test anchor (unit/e2e file)

The quickest high-signal next doc is a `capability-map.md` that normalizes naming and resolves the “Partial/Unknown” rows above.
