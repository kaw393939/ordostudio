# Vec-01: Vector Search Foundation — QA Checklist

**Sprint:** `sprint-vec-01-foundation`

---

## Gate: All items must be checked before DONE

### Dependencies & Config

- [ ] `npm ls sqlite-vec` shows installed package
- [ ] `OPENAI_API_KEY` documented in `.env.local.example`
- [ ] Build does not fail when `OPENAI_API_KEY` is missing (graceful fallback)

### DB

- [ ] Migration 045: `embeddings` table exists with `corpus`, `source_id`, `chunk_index`, `chunk_text`, `visibility`, `embedding`, `user_id` columns
- [ ] Migration 046: `search_analytics` table exists
- [ ] UNIQUE index on `(source_id, chunk_index)` exists (idempotent indexer)
- [ ] `vec_distance_cosine()` function callable in the DB session

### Content

- [ ] All `content/**/*.md` files have `---\nvisibility: ...` frontmatter
- [ ] `content/policies/commission.md` has `visibility: AFFILIATE`
- [ ] `content/policies/onboarding.md` has `visibility: APPRENTICE`
- [ ] `npm run index-content` runs without errors and prints "Indexed N chunks"
- [ ] `SELECT COUNT(*) FROM embeddings WHERE corpus = 'content'` > 0

### Search Quality

- [ ] `vectorSearch({ query: "how much does training cost?", userRole: null })` returns result from `content/site/training.md`
- [ ] `vectorSearch({ query: "commission rate", userRole: 'AFFILIATE' })` returns result from `content/policies/commission.md`
- [ ] `vectorSearch({ query: "commission rate", userRole: null })` returns empty or non-commission results

### Analytics

- [ ] `SELECT COUNT(*) FROM search_analytics WHERE source = 'intake-agent'` increments after each `content_search` call
- [ ] Eval source logged as `'eval'` in `search_analytics`

### Evals

- [ ] `npm run evals:content` → 4/4 (or 5/5) PASS
- [ ] `npm run evals` → 17/17 PASS (13 existing + 4 new)

### Tests

- [ ] `npx vitest run` → ≥ 1726 passing
- [ ] Chunker test: produces expected chunk count from sample markdown
- [ ] Visibility test: `visibilityFilter('AFFILIATE')` returns correct array
- [ ] Search test (mocked embeddings): SQL query includes visibility filter

### Build

- [ ] `npm run build` clean, no TypeScript errors

### Commit

- [ ] All changes committed and pushed to `origin main`
