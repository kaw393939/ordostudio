# Vec-01: Vector Search Foundation — Overview

**Sprint:** `sprint-vec-01-foundation`  
**Date:** 2026-02-26  
**Estimate:** 3–4 days  
**Priority:** 🟠 P1 — unblocks role-aware search and Maestro-03 analytics  
**Depends on:** Phase 0 (eval gate must be green before adding content evals)  
**Migration numbers:** 045 (`embeddings` table), 046 (`search_analytics` table)

---

## What This Sprint Builds

The current `content_search` tool uses keyword frequency scoring over raw markdown files. It works but has three problems:

1. **No semantic understanding** — "how much does it cost?" doesn't match "pricing" as a keyword; "guild hierarchy" misses relevant passages that use "rank" instead
2. **No RBAC** — all content is visible to all callers; authenticated users, affiliates, and apprentices can't see role-gated knowledge
3. **No analytics** — we can't tell what queries are being asked, which means Maestro-03 has no data to surface

This sprint installs `sqlite-vec`, creates the unified `embeddings` table, builds the content indexer, rewrites `content_search` to use cosine similarity, and adds RBAC-gated visibility.

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Vector library | `sqlite-vec` | In-process SQLite extension; no external service; works with existing `better-sqlite3` setup |
| Embeddings model | `text-embedding-3-small` | 1536 dims; $0.02/million tokens; fast; accurate for knowledge retrieval |
| Chunk size | ~400 tokens (~300 words) | Tested against content files; good recall/precision balance |
| Chunk overlap | 50 tokens | Prevents boundary effects where a concept spans chunks |
| Similarity metric | Cosine similarity | Standard for text embeddings; sqlite-vec supports it natively |
| RBAC | frontmatter `visibility` field; 3 tiers only | `PUBLIC / AUTHENTICATED / ADMIN` — covers all real content cases |
| Default visibility | `PUBLIC` | Safe default; nothing is accidentally hidden |
| `embeddings` table scope | Content corpus only (Vec-01); user chat history (Vec-02) | Phases; don't over-build Vec-01 |
| Search analytics | Log to `search_analytics` table, not `content_search_log` | Supersedes the Maestro-03-v1 `content_search_log` design; unified, richer |

---

## What This Unlocks

- **Better answers** — semantic retrieval beats keyword matching for natural language questions
- **Role-aware search** — AUTHENTICATED users see all site content including commission and onboarding docs; PUBLIC users see only public content; ADMIN sees everything. AFFILIATE and APPRENTICE as separate visibility tiers are deferred (3 tiers cover all real cases today).
- **Maestro-03** — `search_analytics` table provides the data for top-query reporting and funnel correlation
- **Vec-02** — the same `embeddings` table will store conversation history with `corpus = 'chat'`
