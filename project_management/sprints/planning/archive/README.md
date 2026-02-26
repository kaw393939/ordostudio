# Sprint Planning Archive

**Archived:** 2026-02-26  
**Reason:** Superseded by enhanced sprint planning format that adds explicit tool specs, eval specs, architecture notes, and per-sprint `architecture.md` files.

## Why Was This Archived?

The original Maestro sprint docs (00-discovery through 03-marketing-intelligence) were written as intent documents — they named tools and evals but did not fully specify:

- TypeScript interfaces and Zod schemas for each tool
- Eval `preSetup` data, expected tool calls, and DB assertions in machine-readable form
- Architecture decisions (why this file, not that file; what migration number; what existing code to reuse)
- KPI/analytics tools decided in the Feb 2026 architecture session
- Vector search layer (sqlite-vec + unified `embeddings` table) — not present at all
- Session persistence / `user_id` on `intake_conversations` — not present at all
- Journey F (urgent lead escalation) — identified in reconciliation but not planned
- Policy eval suite — identified in reconciliation but not planned
- Persona-specific tool suites (Membership, Affiliate) — identified in reconciliation but not planned

The new planning format applies lessons from the reconciliation report and the architecture decisions made in the Feb 2026 session.

## What Is in This Archive

| File / Folder | What It Was |
|---------------|-------------|
| `00-sprint-map.md` | Sprints 24–34 execution map (all now in completed/) |
| `sprint-maestro-00-discovery/` | Reconciliation report + feedback — still useful reference |
| `sprint-maestro-01-ops-agent/` | Original 21-tool Maestro ops agent spec — superseded by `sprint-maestro-01-ops-agent/` in new planning |
| `sprint-maestro-02-admin-chat-ui/` | Original admin chat UI spec — superseded |
| `sprint-maestro-03-marketing-intelligence/` | Original marketing intelligence spec — superseded by Maestro-03 v2 which is unified embeddings + full KPI suite |

## Cross-Reference: Decisions Made in the Archive Session

These decisions from the Feb 2026 architecture session are baked into the new sprint plans:

1. **Keep SQLite** — no Postgres migration; 1 site = 1 DB file; embed vector search via `sqlite-vec`
2. **Unified `embeddings` table** — single vector space spanning content corpus, user chat history, ingested items, all RBAC-gated by `visibility` column
3. **PostHog is a stub** — no real analytics data; KPI tools query internal SQLite tables only
4. **`feed_events` needs more writers** — intake submitted, deal closed, payment received, newsletter sent should all write feed events
5. **Option B on pricing** — pricing sentence removed from system prompt; `content_search` becomes the source of truth; fixes the one failing eval (`intake-agent-pricing-lookup`)
6. **90-day session cookie** — anonymous sessions persist; backfill `user_id` on account creation
7. **Frontmatter-driven RBAC visibility** — content files declare `visibility: PUBLIC | AUTHENTICATED | AFFILIATE | APPRENTICE | ADMIN`
8. **Journey F gap is highest-risk** — urgent intake escalation path has no tooling; high-intent leads are lost today
