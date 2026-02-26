# Sprint Planning: Agent Intelligence Phase (v2)

**Created:** 2026-02-26  
**Git HEAD at creation:** `e2da15a`  
**Test baseline:** 1714/1715 passing (1 pre-existing failure: `intake-agent-pricing-lookup`)  
**Eval baseline:** 12/13 passing  
**Next DB migration number:** 044  

> This is the master index for all unbuilt sprints as of February 2026.  
> All previously-planned work (sprints 24–34, maestro 00–03 v1) is in `archive/`.  
> The `completed/` folder contains all historical sprint records.

---

## Execution Sequence

Dependencies flow top to bottom. Items on the same indentation level are parallel-safe.

```
[PHASE 0]  sprint-phase0-eval-fix          ← 30 min, unblocks eval gate
    │
    ├── [PRE]   sprint-maestro-00b-db-gaps  ← pre-req for all agent expansions
    │
    ├── [VEC-1] sprint-vec-01-foundation    ← pre-req for RBAC search + memory
    │               │
    │               └── [VEC-2] sprint-vec-02-user-memory  ← after maestro-01
    │
    ├── [M-01]  sprint-maestro-01-ops-agent    ← after 00b (roles must exist)
    │               │
    │               ├── [M-02] sprint-maestro-02-admin-chat-ui
    │               │               │
    │               │               └── [M-03] sprint-maestro-03-intelligence
    │               │
    │               ├── [P-01] sprint-persona-01-membership  ← after 00b + M-01
    │               │               │
    │               │               └── [P-02] sprint-persona-02-affiliate
    │               │
    │               └── [EVAL-1] sprint-eval-01-policy-suite  ← after 00b
    │
    └── [JF]   sprint-journey-f-escalation  ← after M-01 (shares maestro-tools.ts)
                    │
                    └── [P-03] sprint-persona-03-delivery  ← after JF
```

---

## Sprint Inventory

| ID | Folder | Description | Deps | Est Days | Priority |
|----|--------|-------------|------|----------|----------|
| **Phase 0** | `sprint-phase0-eval-fix` | Strip pricing from system prompt; fix failing eval | none | 0.5 | 🔴 P0 |
| **00b** | `sprint-maestro-00b-db-gaps` | Add 3 missing DB roles; self-referral block; double-booking guard; refund→commission void | none | 1 | 🔴 P0 |
| **Vec-01** | `sprint-vec-01-foundation` | sqlite-vec setup; unified `embeddings` table; content indexer; RBAC `visibility` frontmatter; rewrite `content_search` | Phase 0 | 3–4 | 🟠 P1 |
| **M-01** | `sprint-maestro-01-ops-agent` | 25 admin-tier tools; operator system prompt; auth-gated route; 18 eval scenarios; full KPI suite | 00b | 3–4 | 🟠 P1 |
| **M-02** | `sprint-maestro-02-admin-chat-ui` | Split-panel `/admin/chat` UI; localStorage history; ops-summary poll | M-01 | 2–3 | 🟡 P2 |
| **M-03** | `sprint-maestro-03-intelligence` | Rewritten: unified search analytics; full KPI tool suite; `get_ops_brief`; 4 intelligence evals | M-01, Vec-01 | 2–3 | 🟡 P2 |
| **Vec-02** | `sprint-vec-02-user-memory` | `user_id` on `intake_conversations`; conversation embeddings; `search_chat_history` tool; session backfill | M-01, Vec-01 | 2 | 🟡 P2 |
| **P-01** | `sprint-persona-01-membership` | 8 membership/apprentice tools; ASSOCIATE role gating; 5 apprentice evals | M-01, 00b | 2–3 | 🟡 P2 |
| **P-02** | `sprint-persona-02-affiliate` | Affiliate link tools; commission ledger tools; `issue_affiliate_code`; 3 affiliate evals | P-01 | 2 | 🟢 P3 |
| **Eval-01** | `sprint-eval-01-policy-suite` | New `policy` eval type; 6 policy enforcement scenarios | 00b, M-01 | 1–2 | 🟢 P3 |
| **JF** | `sprint-journey-f-escalation` | `flag_urgent_intake`; `trigger_urgent_callback`; `log_callback_outcome`; 3 evals | M-01 | 1–2 | 🟡 P2 |
| **P-03** | `sprint-persona-03-delivery` | Event management MCP tools; subscriber→lead bridge; 3 evals | JF | 2 | 🟢 P3 |

---

## Eval Projection

| After sprint | Total evals | Passing target |
|--------------|-------------|----------------|
| Start (now) | 13 | 12/13 |
| Phase 0 | 13 | 13/13 ✅ |
| M-01 | 31 | 31/31 |
| Vec-01 | 35 | 35/35 |
| M-03 | 39 | 39/39 |
| Vec-02 | 42 | 42/42 |
| P-01 | 47 | 47/47 |
| P-02 | 50 | 50/50 |
| Eval-01 | 56 | 56/56 |
| JF | 59 | 59/59 |
| P-03 | 62 | 62/62 |

---

## Sprint Folder Template

Each sprint folder uses this file structure:

```
sprint-{id}-{name}/
  00-overview.md       Goals, key decisions, why this sprint, what it unlocks
  01-spec.md           Detailed requirements, scope boundaries, success criteria
  02-architecture.md   DB migrations, file map, dependency graph, data flow
  03-tool-specs.md     TypeScript interfaces, Zod schemas, executor sketches, safety notes
  04-eval-specs.md     Full scenario definitions: preSetup, turns, tool assertions, DB assertions
  05-sprint.md         Task breakdown T1–Tn with file targets and acceptance criteria
  06-qa-checklist.md   Gate items: test count, eval count, build, lint, manual checks
  07-ux-design.md      UI sprints only: component map, layout, interaction model
```

---

## Key Architectural Decisions (reference)

These apply to all sprints. Do not re-debate without a recorded decision log entry.

| Decision | Detail |
|----------|--------|
| **ORM** | None. Raw SQL + `better-sqlite3`. Synchronous. No Prisma, no Drizzle. |
| **DB** | SQLite, 1 file per site instance. No Postgres. |
| **Vector search** | `sqlite-vec` extension. `embeddings` table with `embedding BLOB`. Cosine similarity. |
| **Embeddings model** | `text-embedding-3-small` (OpenAI). 1536 dims. Normalized to float32. |
| **RBAC for search** | `visibility` column on `embeddings`: `PUBLIC \| AUTHENTICATED \| AFFILIATE \| APPRENTICE \| ADMIN`. Query filters by user's highest role. |
| **Session persistence** | 90-day `session_id` cookie (`so_anon_session`). Backfill `user_id` on account creation. |
| **Analytics layer** | Internal SQLite tables only. PostHog is a stub — do not build KPI tools against it. |
| **Feed events** | `writeFeedEvent()` must be called at every major business event (intake submitted, deal closed, payment received, newsletter sent, booking created). |
| **Agent system prompt** | Pricing removed (Phase 0). Rule: use `content_search` before stating any factual claim. |
| **Tool registry pattern** | All tools use Zod for arg validation. Tool executor returns `{ error: string }` on bad args — never throws. |
| **Eval harness** | Anthropic Claude — real API calls. Evals must be idempotent (each tests seeds its own data, cleans up). `source: 'eval'` flag on all eval-originated data. |
| **Migration numbers** | Last: `043`. Phase 0 needs none. 00b starts at `044`. |

---

## P0 Bug Registry (carry into relevant sprints)

These are live bugs tracked from the reconciliation report:

| Bug | File | Fixed in sprint |
|-----|------|-----------------|
| Pricing hardcoded in system prompt | `src/lib/api/agent-system-prompt.ts` | Phase 0 |
| Self-referral not blocked in referral resolution | `src/app/r/[code]/route.ts` | 00b |
| Double-booking guard missing in `create_booking` | `src/lib/api/bookings.ts` | 00b |
| Stripe webhook doesn't void ledger on refund | `src/app/api/v1/webhooks/stripe/route.ts` | 00b |
| `referral_conversions.conversion_type` only has `INTAKE_REQUEST` | `src/cli/db.ts` | 00b |
| ASSOCIATE, CERTIFIED_CONSULTANT, STAFF roles missing from DB | `src/cli/db.ts` (seeding) | 00b |
| `commission_rate: 0.25` in referral API response | `src/app/api/v1/account/referral/route.ts` | M-01 or 00b |
| Referral code lazy-created (not at registration) | `src/app/api/v1/auth/register/route.ts` | P-02 |
| No `user_id` on `intake_conversations` | `src/cli/db.ts` | Vec-02 |
| `feed_events` only written for role requests | multiple | M-01 writer expansion |
