# Vec-01: Vector Search Foundation — Architecture

**Sprint:** `sprint-vec-01-foundation`

---

## New NPM Dependencies

```json
"dependencies": {
  "sqlite-vec": "^0.1.x"
}
```

Also requires OpenAI key (already present for Claude as ANTHROPIC_API_KEY; add `OPENAI_API_KEY` for embeddings).

Add to `.env.local`:
```
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMS=1536
```

---

## DB Migrations

### Migration 045 — `embeddings` table

```sql
CREATE TABLE IF NOT EXISTS embeddings (
  id           TEXT PRIMARY KEY,
  corpus       TEXT NOT NULL, -- 'content' | 'chat' | 'ingested' | 'field_report'
  source_id    TEXT NOT NULL, -- file path OR row id depending on corpus
  chunk_index  INTEGER NOT NULL DEFAULT 0,
  chunk_text   TEXT NOT NULL,
  visibility   TEXT NOT NULL DEFAULT 'PUBLIC', -- PUBLIC|AUTHENTICATED|ADMIN
  user_id      TEXT,          -- NULL for content corpus; userId for 'chat' corpus
  embedding    BLOB NOT NULL, -- float32 array, 1536 dims for text-embedding-3-small
  metadata_json TEXT,         -- arbitrary extra: { title, section, word_count }
  created_at   TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Corpus + source index for re-indexing and deduplication
CREATE INDEX IF NOT EXISTS idx_embeddings_corpus_source ON embeddings(corpus, source_id);
-- User memory index (Vec-02 query pattern)
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON embeddings(user_id, corpus);
```

### Migration 046 — `search_analytics` table

```sql
CREATE TABLE IF NOT EXISTS search_analytics (
  id           TEXT PRIMARY KEY,
  query        TEXT NOT NULL,
  corpus       TEXT NOT NULL DEFAULT 'content',
  result_count INTEGER NOT NULL DEFAULT 0,
  top_source   TEXT,          -- source_id of top-ranked result
  top_score    REAL,          -- cosine similarity of top result
  user_id      TEXT,          -- NULL for anonymous
  session_id   TEXT,          -- anonymous session cookie value
  source       TEXT NOT NULL DEFAULT 'intake-agent', -- 'intake-agent'|'maestro'|'eval'
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at);
```

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/vector/client.ts` | OpenAI embedding client; `embed(text): Promise<Float32Array>` |
| `src/lib/vector/chunker.ts` | Markdown → chunks: respects heading boundaries, max 400 tokens, 50-token overlap |
| `src/lib/vector/indexer.ts` | Content corpus indexer: reads `content/**/*.md`, parses frontmatter, chunks, embeds, upserts into `embeddings` |
| `src/lib/vector/search.ts` | `vectorSearch(query, userRole, limit)` — embeds query, runs cosine sim, filters by visibility |
| `src/lib/vector/visibility.ts` | Role → visibility level mapping; `isVisibleTo(visibility, role)` |
| `src/cli/commands/index-content.ts` | CLI command: `npx tsx src/cli/cli.ts index-content` — runs the full corpus indexer |

---

## Modified Files

| File | Change |
|------|--------|
| `src/lib/api/content-search.ts` | Replace keyword scoring with `vectorSearch()`; log to `search_analytics` |
| `src/lib/api/agent-tools.ts` | Pass `userRole` to `searchContent()` for RBAC gating |
| `src/cli/db.ts` | Add migrations 045, 046 |
| `src/cli/cli.ts` | Register `index-content` command |
| `package.json` | Add `sqlite-vec`, add `script: "index-content": "tsx src/cli/commands/index-content.ts"` |

---

## RBAC Visibility Model

Visibility levels form a 3-tier hierarchy. AUTHENTICATED users can see all non-admin content:

```
PUBLIC < AUTHENTICATED < ADMIN
```

```typescript
// src/lib/vector/visibility.ts
export type Visibility = 'PUBLIC' | 'AUTHENTICATED' | 'ADMIN';

const LEVEL: Record<Visibility, number> = {
  PUBLIC: 0, AUTHENTICATED: 1, ADMIN: 2,
};

export function isVisibleTo(contentVisibility: Visibility, userRole: string | null): boolean {
  const userLevel = userRole ? (LEVEL[userRole as Visibility] ?? 0) : 0;
  return LEVEL[contentVisibility] <= userLevel;
}
```

SQL query adds this filter:
```sql
WHERE visibility IN (/* roles up to user's level */)
```

---

## Content File Frontmatter

Add to each `content/**/*.md` file:
```yaml
---
title: Training Programs
visibility: PUBLIC
---
```

Required files to update:
- `content/site/training.md` → `PUBLIC`
- `content/site/services.md` → `PUBLIC`
- `content/site/guild.md` → `PUBLIC`
- `content/site/faq.md` → `PUBLIC`
- `content/site/about.md` → `PUBLIC`
- `content/policies/commission.md` → `AUTHENTICATED`
- `content/policies/onboarding.md` → `AUTHENTICATED`

---

## sqlite-vec Integration

```typescript
// src/lib/vector/client.ts (DB init side)
import * as sqliteVec from 'sqlite-vec';

export function loadVecExtension(db: Database): void {
  sqliteVec.load(db);
}
```

Call `loadVecExtension(db)` in `openCliDb()` after `db` is opened.

Cosine similarity query pattern:
```sql
SELECT
  e.source_id,
  e.chunk_text,
  e.metadata_json,
  vec_distance_cosine(e.embedding, ?) AS distance
FROM embeddings e
WHERE e.corpus = 'content'
  AND e.visibility IN (...)
ORDER BY distance ASC
LIMIT ?
```

(Lower cosine distance = more similar)

---

## Indexer Flow

```
index-content CLI command
  │
  ├─ read content/**/*.md
  │     parse frontmatter → { title, visibility }
  │     strip frontmatter → plain markdown text
  │
  ├─ chunk(text, maxTokens=400, overlap=50)
  │     split on headings first, then window
  │
  ├─ for each chunk:
  │     embed(chunk) → Float32Array via OpenAI
  │     upsert INTO embeddings (ON CONFLICT source_id+chunk_index DO UPDATE)
  │
  └─ print: "Indexed N chunks from M files"
```

Indexer must be **idempotent** — running it twice produces the same set of rows, not duplicates. Use `ON CONFLICT(source_id, chunk_index) DO UPDATE`.

---

## Data Flow: New `content_search` Tool

```
User: "how much does training cost?"
  │
  └─ agent calls content_search("how much does training cost?")
        │
        └─ vectorSearch("how much does training cost?", userRole='PUBLIC', limit=5)
              │
              ├─ embed(query) → [0.2, -0.1, ...] Float32Array
              │
              └─ SQL: SELECT ... vec_distance_cosine(embedding, ?) ... WHERE visibility = 'PUBLIC'
                    → returns top 5 chunks
                    → [{ source: 'content/site/training.md', text: '...Individual: $3,000...' }]
              │
              └─ log to search_analytics: query, result_count, top_source, top_score, session_id
        │
        └─ return { results: [{ file, excerpt, score }] }
  │
  └─ Claude synthesizes: "Training costs $3,000–$5,000 for individuals..."
```
