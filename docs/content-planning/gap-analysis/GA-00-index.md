# Gap Analysis — Master Index
**Date:** 2026-02-24  
**Method:** Codebase audit cross-referenced against content planning docs (`00` – `06`).  
**Status:** Planning only. No code changed.

---

## User Flows Audited

| File | User Type | Entry Point | Priority |
|------|-----------|-------------|----------|
| [GA-01-buyer-flow.md](./GA-01-buyer-flow.md) | Client / Buyer | Homepage → `/studio` → `/services/request` | P1 |
| [GA-02-learner-flow.md](./GA-02-learner-flow.md) | Maestro Training applicant | Homepage → `/maestro` | P1 |
| [GA-03-guild-member-flow.md](./GA-03-guild-member-flow.md) | Apprentice / Journeyman | `/join` → `/apply/apprentice` → Dashboard | P2 |
| [GA-04-affiliate-flow.md](./GA-04-affiliate-flow.md) | Affiliate (one type — lowest guild tier, refers work, earns commission) | `/affiliate` → `/apply/affiliate` → Dashboard | P2 |
| [GA-05-admin-operator-flow.md](./GA-05-admin-operator-flow.md) | Admin / Maestro operator | `/admin/*` | P3 |

---

## Critical Missing Pages

| Route | Type | Blocks |
|-------|------|--------|
| `/maestro` | New page | Entire learner acquisition flow |
| `/card` | New page | QR business card → buyer + learner routing |

## Site-Wide Issues (all flows)

| Item | Current | Required |
|------|---------|---------|
| `"Hire an Associate →"` CTA (homepage §02) | `href="/services/request"` | Label → `"Commission a project →"` |
| `"Book a Technical Consult"` on `/studio` | Correct destination, wrong context | Remove — `/studio` is client-facing only |
| `"Not sure which path fits you?"` on `/studio` | Routes to `/join` wizard | Routes to `/join` (will still work after join redesign) |
| `/r/[code]` referral redirect | Redirects → `/services` | Redirect → `/card?ref=CODE` |
| `/join` page | 3-question wizard (GuildJoinFlow) | 3 buttons, immediate routing |

## Revenue Model Alignment Check

| Revenue stream | Page serving it | Status |
|----------------|----------------|--------|
| Project commissions (20%) | `/studio` + `/services/request` | `/studio` mixed w/ apprentice content — needs rewrite |
| Maestro Training cohort ($3K–$5K) | NO PAGE | `/maestro` must be built |
| Maestro Training advisory ($1,500–$2,500/mo) | `/services/advisory` partial | Needs pricing + `/maestro` link |

---

## What Can Be Removed

| Page / Section | Reason |
|----------------|--------|
| `/studio` bottega history section (Leonardo da Vinci copy) | Client buyers don't need this. Apprentice content moves to `/apply/apprentice` or `/join`. |
| `/studio` "CEO of Agents" section | Apprentice-facing. Wrong audience for client-facing page. |
| `/studio` guild hierarchy (`StudioBottegaModel` component) | Apprentice-facing. |
| `/services/team-program` and `/services/workshop` sub-pages | These are B2B training tracks — not the primary revenue model. Consolidate or demote. |
| GuildJoinFlow 3-question wizard | Retire the wizard. Replace with 3 buttons. |
| `/studio/report` internal field report link exposed in newsletter page | Internal artifact, shouldn't be public-linked. |
