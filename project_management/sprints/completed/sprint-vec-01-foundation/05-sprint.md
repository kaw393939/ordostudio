# Vec-01: Vector Search Foundation — Sprint Tasks

**Sprint:** `sprint-vec-01-foundation`

---

## T1 — Install sqlite-vec

```bash
npm install sqlite-vec
```

In `src/cli/db.ts`, import and load vec extension after opening the DB:
```typescript
import * as sqliteVec from 'sqlite-vec';
// in openCliDb():
sqliteVec.load(db);
```

**Acceptance:** `db.prepare("SELECT vec_version()").get()` returns without error.

---

## T2 — Add OpenAI embedding client

**New file:** `src/lib/vector/client.ts`

Import `openai` from the existing `@ai-sdk/openai` or install `openai` directly if needed. Implement `embed(text)` per `03-tool-specs.md`.

Add env var check:
```typescript
export function isEmbeddingAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
```

**Acceptance:** `embed("hello world")` resolves to a Float32Array of length 1536.

---

## T3 — DB migrations 045 + 046

Add to `src/cli/db.ts` after migration 043:
- `045_embeddings_table` — full schema from `02-architecture.md`
- `046_search_analytics_table` — full schema from `02-architecture.md`

Add UNIQUE constraint for idempotent upsert: `CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_source_chunk ON embeddings(source_id, chunk_index)`

Run: `npx tsx src/cli/cli.ts db migrate`

**Acceptance:** Both tables exist in the DB with correct columns.

---

## T4 — Chunker

**New file:** `src/lib/vector/chunker.ts`

Implement `parseFrontmatter()` and `chunk()` per `03-tool-specs.md`.

Test with `content/site/training.md` — should produce 3–8 chunks.

**Acceptance:** `chunk(sampleMarkdown)` returns array of strings, each < 1600 chars (approx 400 tokens).

---

## T5 — RBAC visibility module

**New file:** `src/lib/vector/visibility.ts`

Implement visibility hierarchy and `isVisibleTo()` per `02-architecture.md`.

Build the SQL visibility filter:
```typescript
export function visibilityFilter(userRole: string | null): Visibility[] {
  const level = userRole ? (LEVEL[userRole as Visibility] ?? 0) : 0;
  return (Object.keys(LEVEL) as Visibility[]).filter(v => LEVEL[v] <= level);
}
```

**Acceptance:** Unit test; `visibilityFilter('AFFILIATE')` returns `['PUBLIC', 'AUTHENTICATED', 'AFFILIATE']`.

---

## T6 — Content frontmatter

Add `visibility` frontmatter to all 7 content files (see `02-architecture.md` for visibility assignments). Use `PUBLIC` as default for any others found.

**Acceptance:** `grep -l "^visibility:" content/**/*.md` lists all content files.

---

## T7 — Content indexer CLI command

**New file:** `src/cli/commands/index-content.ts`

Implement per `03-tool-specs.md`. Wire into `src/cli/cli.ts` as a new command.

Add to `package.json`:
```json
"index-content": "tsx src/cli/commands/index-content.ts"
```

Run: `npm run index-content`

**Acceptance:** Command runs, prints "Indexed N chunks from M files", rows appear in `embeddings` table.

---

## T8 — Vector search function

**New file:** `src/lib/vector/search.ts`

Implement `vectorSearch()` per `03-tool-specs.md`. SQL query:
```sql
SELECT source_id, chunk_text, metadata_json,
       vec_distance_cosine(embedding, ?) AS distance
FROM embeddings
WHERE corpus = 'content' AND visibility IN (?, ?, ...)
ORDER BY distance ASC
LIMIT ?
```

After results: insert row into `search_analytics`.

Fallback: if `OPENAI_API_KEY` missing, call existing keyword `searchContent()`.

**Acceptance:** `vectorSearch({ query: "pricing", userRole: null, source: 'eval' })` returns results with `score < 0.5` for the training.md pricing chunk.

---

## T9 — Wire into `content_search` tool

**File:** `src/lib/api/content-search.ts`

Replace implementation body with call to `vectorSearch()`. Preserve the existing function signature so callers don't break.

Pass `source` and `sessionId` from the agent tool executor context.

**Acceptance:** `npm run evals` → still 13/13 (or 17/17 if V1–V4 were added in this step).

---

## T10 — Add Vec-01 evals

**File:** `src/evals/scenarios/content-retrieval.ts` (new file)

Add scenarios V1–V4 per `04-eval-specs.md`.

Register in `src/evals/run.ts` with type `content-retrieval`.

Add to `package.json`:
```json
"evals:content": "tsx src/evals/run.ts --type content-retrieval"
```

**Acceptance:** `npm run evals:content` → 4/4 PASS (or 5/5 if V2 was split into V2a+V2b).

---

## T11 — Unit tests

New test file: `src/lib/vector/__tests__/chunker.test.ts`  
New test file: `src/lib/vector/__tests__/visibility.test.ts`  
New test file: `src/lib/vector/__tests__/search.test.ts` (mock OpenAI, assert SQL + analytics write)

**Acceptance:** ≥ 1726 tests passing (add 8+ new unit tests).

---

## T12 — Commit

```bash
git add .
git commit -m "feat(vec): add sqlite-vec, unified embeddings table, RBAC content search, search analytics"
git push origin main
```
