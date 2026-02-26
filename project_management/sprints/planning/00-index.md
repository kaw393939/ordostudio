# Sprint Planning: Agent Intelligence Phase (v2 — Revised 2026-02-26)

**Git HEAD at creation:** `e2da15a`
**Test baseline:** 1714/1715 passing
**Eval baseline:** 12/13 passing (failing: `intake-agent-pricing-lookup`)
**Next DB migration:** 044
**Last revised:** 2026-02-26 — full re-prioritisation based on business value audit

> **What changed from v2 original:**
> M-01 cut from 25 to 10 tools (proven daily-use first; 15 deferred to M-01b).
> M-01 and M-02 treated as a single delivery unit.
> Journey-F promoted from last to P1 — highest revenue-per-hour sprint in the plan.
> Three new sprints added: commerce-agent (deal pipeline), prospect-agent (top-of-funnel),
> event-management. Vec-02 deferred pending evidence of user need.
> M-03 trimmed to `get_ops_brief` only; analytics tools deferred until intake volume warrants.
> Persona-01 agent tools limited to user-facing; dangerous admin actions moved to dedicated UI sprint.
> `approve_payout` removed from agent; finance actions require an explicit confirmation UI.

---

## Execution Sequence

```
[P0]   phase0-eval-fix            <- 30 min. Fix failing eval. No deps.
   |
   +-- [P0]  maestro-00b-db-gaps  <- DB bugs with real money consequences
   |
   +-- [P1]  vec-01-foundation    <- Content search prerequisite (3-tier RBAC)
   |
   +-- [P1]  maestro-01-ops-agent  -+
             maestro-02-admin-chat  -+  Ship together as one delivery unit.
                   |                     M-02 validates M-01 is usable.
                   |
                   +-- [P1]  journey-f-escalation   <- Highest revenue sprint.
                   |                                   Do immediately once UI exists.
                   |
                   +-- [P1]  commerce-agent          <- Wire existing deal MCP tools.
                   |                                   Already-built infra. Low effort.
                   |
                   +-- [P1]  prospect-agent          <- Stranger -> lead automation.
                   |                                   Only sprint that grows revenue.
                   |
                   +-- [P2]  event-management        <- Create/update events in agent.
                   |
                   +-- [P2]  persona-01-membership   <- 4 user-facing tools only.
                   |               |
                   |               +-- [P2] persona-02-affiliate  <- Read-only tools.
                   |
                   +-- [P3]  maestro-03-intelligence  <- ops-brief only.
                   |                                    Defer analytics until volume warrants.
                   |
                   +-- [P3]  maestro-01b-extended     <- Deferred M-01 tools.
                                                        Build based on observed usage gaps.

[P3]  eval-01-policy-suite  <- After 00b + M-01; no production changes.

[DEFERRED — no schedule]  vec-02-user-memory
    Reason: No evidence of user need. Adds OpenAI latency to every chat turn.
    Revisit if users explicitly request conversation recall.
```

---

## Sprint Inventory

| ID | Folder | Description | Deps | Est Days | Priority |
|----|--------|-------------|------|----------|----------|
| **Phase 0** | `sprint-phase0-eval-fix` | Fix 1 failing eval: strip pricing from system prompt | none | 0.5 | 🔴 P0 |
| **00b** | `sprint-maestro-00b-db-gaps` | 3 DB correctness bugs (self-referral, double-booking, refund void); 3 missing roles | none | 1 | 🔴 P0 |
| **Vec-01** | `sprint-vec-01-foundation` | sqlite-vec; `embeddings` table; content indexer; 3-tier RBAC (`PUBLIC / AUTHENTICATED / ADMIN`) | Phase 0 | 2–3 | 🟠 P1 |
| **M-01/02** | `sprint-maestro-01-ops-agent` + `sprint-maestro-02-admin-chat-ui` | 10 core tools (intake queue, role requests, revenue summary, ops summary, audit); split-panel UI validates each tool. Ship together. | 00b, Vec-01 | 3–4 | 🟠 P1 |
| **JF** | `sprint-journey-f-escalation` | `flag_urgent_intake`, `trigger_urgent_callback`, `log_callback_outcome`; 3 evals | M-01/02 | 1–2 | 🟠 P1 |
| **CA** | `sprint-commerce-agent` | Wire existing `list_deals`/`assign_deal`/`approve_deal` MCP tools to ops agent; add `get_customer_timeline`, `get_deal_detail` | M-01/02 | 1–2 | 🟠 P1 |
| **PA** | `sprint-prospect-agent` | `subscribe_to_newsletter`, `convert_subscriber_to_lead`, `capture_content_interest` in public intake agent | Vec-01 | 2 | 🟠 P1 |
| **EM** | `sprint-event-management` | `create_event`, `update_event`, `get_event_attendance`, `list_registered_attendees` in ops agent | M-01/02 | 2 | 🟡 P2 |
| **P-01** | `sprint-persona-01-membership` | 4 user-facing tools: `apply_for_apprenticeship`, `view_rank_requirements`, `list_assigned_tasks`, `get_apprentice_profile`; 4 evals | M-01/02, 00b | 2 | 🟡 P2 |
| **P-02** | `sprint-persona-02-affiliate` | `get_affiliate_link`, `get_affiliate_stats`, `list_pending_commissions`, `void_commission` (no `approve_payout` via chat); 3 evals | P-01 | 1.5 | 🟡 P2 |
| **M-03** | `sprint-maestro-03-intelligence` | `get_ops_brief` + `get_content_search_analytics` only. Velocity/trend analytics deferred to M-03b. | M-01/02, Vec-01 | 1 | 🟢 P3 |
| **M-01b** | `sprint-maestro-01b-extended` | 15 deferred tools from M-01: bookings, workflow, health-check, KPI expansion. Build based on observed usage gaps after M-01/02 is live. | M-01/02 live | 2–3 | 🟢 P3 |
| **Eval-01** | `sprint-eval-01-policy-suite` | `policy` eval type; 6 enforcement scenarios | 00b, M-01/02 | 1.5 | 🟢 P3 |
| **Vec-02** | `sprint-vec-02-user-memory` | DEFERRED. No evidence of user need. High per-turn latency cost. Revisit when users request conversation recall. | — | — | ⏸ Deferred |

---

## Eval Projection

| After sprint | New evals | Running total | Notes |
|---|---|---|---|
| Start | — | 12/13 | |
| Phase 0 | — | 13/13 | fix 1 existing failure |
| M-01/02 | +8 | 21 | 8 evals for 10 tools |
| Vec-01 | +4 | 25 | V1–V4 |
| Journey-F | +3 | 28 | JF-01–03 |
| Commerce-agent | +3 | 31 | CA-01–03 |
| Prospect-agent | +3 | 34 | PA-01–03 |
| P-01 | +4 | 38 | |
| P-02 | +3 | 41 | |
| M-03 | +2 | 43 | |
| Eval-01 | +6 | 49 | policy scenarios |

---

## What Was Deliberately Deferred and Why

| Item | Original plan | Reason deferred |
|---|---|---|
| M-01 tools 11–25 | M-01 sprint | Build first, observe usage, add only what's needed (M-01b) |
| `approve_payout` via agent | Persona-02 | Finance action; requires explicit confirmation UI, not LLM text |
| `promote_user_role` via agent | Persona-01 | Permanent DB mutation; belongs in a UI with dedicated confirmation |
| `review_gate_submission` via agent | Persona-01 | Admin review action, not a conversational pattern |
| `get_funnel_velocity` + `get_search_trend` | M-03 | Need 200+ data points per stage to be statistically meaningful |
| Vec-02 user memory | Vec-02 | OpenAI API call on every chat turn; no evidence of user demand |
| 5-tier RBAC visibility | Vec-01 | 3 tiers cover all real content cases; AFFILIATE/APPRENTICE add zero value now |
| Event management in M-01 | M-01 | Gets its own focused sprint (EM) rather than bloating the ops agent |

---

## Key Architectural Decisions (unchanged)

| Decision | Detail |
|---|---|
| **ORM** | None. Raw SQL + `better-sqlite3`. Synchronous. |
| **DB** | SQLite, 1 file per site instance. |
| **Vector search** | `sqlite-vec`. `embeddings` table, `embedding BLOB`, cosine similarity. |
| **Embeddings model** | `text-embedding-3-small` (OpenAI). 1536 dims, float32. |
| **RBAC for search** | 3 tiers: `PUBLIC / AUTHENTICATED / ADMIN`. Simple, covers real cases. |
| **Session persistence** | 90-day `so_anon_session` cookie. Backfill `user_id` on registration. |
| **Analytics** | Internal SQLite only. PostHog is a stub. |
| **Feed events** | `writeFeedEvent()` at every major business event. |
| **Agent system prompt** | Pricing removed (Phase 0). Rule: call `content_search` before any factual claim. |
| **Tool registry** | Zod validation. Returns `{ error }` on bad args, never throws. |
| **Eval harness** | Anthropic Claude, real API. Idempotent. `source: 'eval'` on all seed data. |
| **Migration numbers** | Last: `043`. 00b starts at `044`. |

---

## P0 Bug Registry

| Bug | File | Fixed in sprint |
|---|---|---|
| Pricing hardcoded in system prompt | `src/lib/api/agent-system-prompt.ts` | Phase 0 |
| Self-referral not blocked | `src/app/r/[code]/route.ts` | 00b |
| Double-booking guard missing | `src/lib/api/bookings.ts` | 00b |
| Stripe webhook doesn't void ledger on refund | `src/app/api/v1/webhooks/stripe/route.ts` | 00b |
| `referral_conversions.conversion_type` only `INTAKE_REQUEST` | `src/cli/db.ts` | 00b |
| ASSOCIATE, CERTIFIED_CONSULTANT, STAFF roles missing | `src/cli/db.ts` | 00b |
| `commission_rate: 0.25` hardcoded in referral API | `src/app/api/v1/account/referral/route.ts` | 00b |
| Referral code not captured at registration | `src/app/api/v1/auth/register/route.ts` | 00b |
| No `user_id` on `intake_conversations` | `src/cli/db.ts` | Vec-02 (deferred) |
| `feed_events` only written for role requests | multiple | M-01 writer expansion |
