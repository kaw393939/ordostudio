# Vec-01: Vector Search Foundation — Tool Specs

**Sprint:** `sprint-vec-01-foundation`

---

## Tool: `content_search` (rewritten)

**Current location:** `src/lib/api/agent-tools.ts` → calls `searchContent()` in `content-search.ts`  
**This sprint:** Replace `searchContent()` implementation with `vectorSearch()`

### TypeScript Interface

```typescript
// src/lib/vector/search.ts

export interface VectorSearchOptions {
  query: string;
  /** Role of the calling user — determines visibility filter. Null = anonymous PUBLIC only. */
  userRole: string | null;
  /** Corpus to search. Default: 'content'. */
  corpus?: 'content' | 'chat';
  /** Max results to return. Default: 5. */
  limit?: number;
  /** Source identifier for search_analytics logging. */
  source?: 'intake-agent' | 'maestro' | 'eval';
  /** Session ID for anonymous tracking. */
  sessionId?: string;
  /** Authenticated user ID (nullable). */
  userId?: string | null;
}

export interface VectorSearchResult {
  file: string;      // source_id
  excerpt: string;   // chunk_text
  score: number;     // cosine distance (0 = identical, 2 = opposite)
}

export interface VectorSearchResponse {
  results: VectorSearchResult[];
  query: string;
  corpus: string;
}

export async function vectorSearch(
  opts: VectorSearchOptions,
): Promise<VectorSearchResponse>
```

### Zod Schema (for tool input validation)

```typescript
// In agent-tools.ts, the content_search tool input schema:
const ContentSearchArgs = z.object({
  query: z.string().min(1).max(500).describe('Natural language search query'),
});
```

### Safety Notes

- Never throw on embedding failure — catch and return `{ results: [], error: 'Embedding unavailable' }`
- If `OPENAI_API_KEY` is missing, fall back to the existing keyword search with a warning log
- `source: 'eval'` must be set by eval harness to prevent eval queries polluting analytics
- Log every call to `search_analytics` regardless of result count (zero results is signal)

---

## Utility: `embed(text: string): Promise<Float32Array>`

```typescript
// src/lib/vector/client.ts

export async function embed(text: string): Promise<Float32Array> {
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    input: text.trim(),
    encoding_format: 'float',
  });
  return new Float32Array(response.data[0].embedding);
}
```

### Notes

- Input is trimmed; max 8191 tokens for text-embedding-3-small
- Returns normalized float32 array — sqlite-vec requires this exact format
- Cache embeddings in process for the same query within a single request (LRU, max 100 entries)

---

## Utility: `chunk(markdown: string, maxTokens = 400, overlap = 50): string[]`

```typescript
// src/lib/vector/chunker.ts

export function chunk(markdown: string, maxTokens = 400, overlap = 50): string[] {
  // 1. Strip frontmatter
  // 2. Split on H2/H3 headings first (preserve section context)
  // 3. Window each section to maxTokens; carry overlap tokens to next window
  // 4. Return array of string chunks
}
```

### Notes

- "Tokens" approximated as `text.length / 4` (GPT tokenizer ratio for English prose). Exact tokenization not required for chunking purposes.
- Each chunk includes the nearest heading above it as its first line for context
- Empty chunks (< 20 chars) are discarded

---

## CLI Indexer: `index-content`

```typescript
// src/cli/commands/index-content.ts

async function run() {
  const files = glob('content/**/*.md');
  let totalChunks = 0;

  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const visibility = (frontmatter.visibility as Visibility) ?? 'PUBLIC';
    const chunks = chunk(body);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i]);
      db.prepare(`
        INSERT INTO embeddings (id, corpus, source_id, chunk_index, chunk_text, visibility, embedding, metadata_json, created_at)
        VALUES (?, 'content', ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id, chunk_index) DO UPDATE SET
          chunk_text = excluded.chunk_text,
          embedding = excluded.embedding,
          visibility = excluded.visibility,
          metadata_json = excluded.metadata_json
      `).run(
        randomUUID(),
        file,
        i,
        chunks[i],
        visibility,
        Buffer.from(embedding.buffer),
        JSON.stringify({ title: frontmatter.title, word_count: chunks[i].split(' ').length }),
        new Date().toISOString(),
      );
      totalChunks++;
    }
  }
  console.log(`Indexed ${totalChunks} chunks from ${files.length} files`);
}
```
