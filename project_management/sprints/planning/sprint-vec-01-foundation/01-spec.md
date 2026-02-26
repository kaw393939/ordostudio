# Vec-01: Vector Search Foundation — Specification

**Sprint:** `sprint-vec-01-foundation`

---

## Scope

### In scope

- `sqlite-vec` npm package install + DB extension load
- Migration 045: `embeddings` table with RBAC `visibility` column
- Migration 046: `search_analytics` table (supersedes planned `content_search_log`)
- `src/lib/vector/client.ts` — OpenAI embedding client
- `src/lib/vector/chunker.ts` — markdown → chunks with heading context
- `src/lib/vector/indexer.ts` — content corpus indexer
- `src/lib/vector/search.ts` — cosine similarity search with RBAC filter + analytics logging
- `src/lib/vector/visibility.ts` — role→visibility level mapping
- `src/cli/commands/index-content.ts` — CLI indexer command
- `content/**/*.md` — add `visibility` frontmatter
- `src/lib/api/content-search.ts` — replace keyword implementation with vector search
- 4 new `content-retrieval` eval scenarios (V1–V4)
- Unit tests for chunker, visibility, search

### Out of scope

- User chat history embeddings (Vec-02)
- `search_chat_history` tool (Vec-02)
- Maestro tool for querying analytics (Maestro-03)
- PostHog integration

---

## Success Criteria

| Check | Pass condition |
|-------|---------------|
| Dependencies | `sqlite-vec` installed; `vec_version()` callable |
| Migrations | 045 + 046 run cleanly on fresh DB |
| Content indexed | `SELECT COUNT(*) FROM embeddings WHERE corpus = 'content'` > 0 after `npm run index-content` |
| Semantic retrieval | Query "how much does it cost?" finds training.md pricing chunk (cosine distance < 0.5) |
| RBAC | AFFILIATE query returns commission.md chunk; same query with userRole=null does not |
| Analytics | Every `content_search` call writes a row to `search_analytics` |
| Eval gate | `npm run evals` → 17/17 PASS |
| Unit tests | ≥ 1726 passing |
| Content files | All `content/**/*.md` files have `visibility` frontmatter |
| Build | `npm run build` clean |
| Fallback | If `OPENAI_API_KEY` absent, keyword search is used and build does not fail |
