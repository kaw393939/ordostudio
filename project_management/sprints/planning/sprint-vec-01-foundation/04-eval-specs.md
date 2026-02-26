# Vec-01: Vector Search Foundation — Eval Specs

**Sprint:** `sprint-vec-01-foundation`  
**New eval scenarios:** 4  
**Eval baseline going in:** 13/13  
**Eval target after:** 17/17

---

## New Eval Type: `content-retrieval`

Add `'content-retrieval'` to the eval type union in `src/evals/types.ts`.

---

## Scenario V1 · `content-retrieval-semantic-pricing`

**Purpose:** Verify the agent finds pricing via semantic similarity even when the query uses different words than the content.

```typescript
{
  id: 'content-retrieval-semantic-pricing',
  type: 'content-retrieval',
  description: 'Semantic search finds pricing even with paraphrased query',
  preSetup: async () => {
    // Ensure embeddings table is populated (run indexer)
    // This is a no-op if already indexed
    await runIndexer({ source: 'eval' });
  },
  turns: [
    { role: 'user', content: 'What are the fees for your programs?' },
  ],
  assertions: [
    { type: 'tool_called', tool: 'content_search' },
    { type: 'response_includes', value: '3,000', description: 'Must cite pricing' },
    { type: 'db_assert', query: "SELECT COUNT(*) as n FROM search_analytics WHERE source = 'eval'", expect: { n: 1 } },
  ],
}
```

**Why this matters:** The old keyword search would score "fees" low vs "pricing". Vector search scores them high because they are semantically similar. This is the core correctness test.

---

## Scenario V2 · `content-retrieval-rbac-affiliate-content`

**Purpose:** Verify AFFILIATE user can retrieve AFFILIATE-visibility content, but PUBLIC caller cannot.

```typescript
{
  id: 'content-retrieval-rbac-affiliate-content',
  type: 'content-retrieval',
  description: 'RBAC gating: AFFILIATE content visible to affiliate, not public',
  preSetup: async () => {
    await runIndexer({ source: 'eval' });
  },
  turns: [
    { role: 'user', content: 'What is my commission rate?' },
  ],
  // Run twice: once as PUBLIC (no results expected), once as AFFILIATE (results expected)
  contexts: [
    {
      label: 'public-caller',
      userRole: null,
      assertions: [
        { type: 'tool_called', tool: 'content_search' },
        { type: 'response_not_includes', value: '20%', description: 'Commission % not in PUBLIC content' },
      ],
    },
    {
      label: 'affiliate-caller',
      userRole: 'AFFILIATE',
      assertions: [
        { type: 'tool_called', tool: 'content_search' },
        { type: 'response_includes', value: '20', description: 'Commission rate from commission.md' },
      ],
    },
  ],
}
```

---

## Scenario V3 · `content-retrieval-zero-results-graceful`

**Purpose:** Agent gracefully handles queries that return no semantic matches (empty corpus for that theme).

```typescript
{
  id: 'content-retrieval-zero-results-graceful',
  type: 'content-retrieval',
  description: 'Agent does not fabricate when content_search returns empty',
  preSetup: async () => {
    await runIndexer({ source: 'eval' });
  },
  turns: [
    { role: 'user', content: 'What is the refund policy for quantum computing courses?' },
  ],
  assertions: [
    { type: 'tool_called', tool: 'content_search' },
    { type: 'response_not_includes', value: 'refund policy is', description: 'Must not fabricate a policy' },
    { type: 'response_includes_any', values: ["don't have", "not available", "reach out", "contact"], description: 'Agent acknowledges no result' },
  ],
}
```

---

## Scenario V4 · `content-retrieval-search-analytics-logged`

**Purpose:** Verify every `content_search` call writes a row to `search_analytics`.

```typescript
{
  id: 'content-retrieval-search-analytics-logged',
  type: 'content-retrieval',
  description: 'Search query is logged to search_analytics table',
  preSetup: async (db) => {
    await runIndexer({ source: 'eval' });
    // Clear any prior eval rows
    db.prepare("DELETE FROM search_analytics WHERE source = 'eval'").run();
  },
  turns: [
    { role: 'user', content: 'Tell me about the guild hierarchy' },
  ],
  assertions: [
    { type: 'tool_called', tool: 'content_search' },
    {
      type: 'db_assert',
      query: "SELECT query FROM search_analytics WHERE source = 'eval' ORDER BY created_at DESC LIMIT 1",
      expect_row_exists: true,
      description: 'Search must be logged to search_analytics',
    },
  ],
}
```

---

## Eval Harness Notes

1. The `preSetup` block for all V1–V4 calls `runIndexer({ source: 'eval' })`. This function should:
   - Check if content is already indexed (by row count in `embeddings` WHERE corpus = 'content')
   - Skip re-indexing if rows exist (idempotent)
   - Use `OPENAI_API_KEY` from env — evals test with real API (will cost ~$0.001 total for the content corpus)

2. If `OPENAI_API_KEY` is missing, skip the `content-retrieval` eval type with a warning: `"Skipping content-retrieval evals — OPENAI_API_KEY not set"`

3. Context-split scenarios (V2) — the eval framework needs to support running the same scenario in multiple `context` variants. If the framework doesn't support this yet, split V2 into V2a (public) and V2b (affiliate) as separate scenario objects.
