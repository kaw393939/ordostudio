# Sprint Vec-02: User Memory & Chat History Search — Architecture

## Migration 047

```sql
-- 047_intake_conversations_user_id.ts

ALTER TABLE intake_conversations
  ADD COLUMN user_id TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_ic_user_id
  ON intake_conversations(user_id);
```

## Conversation Indexer Data Flow

```
POST /api/v1/intake/chat
        │
        ▼
  call LLM → stream response to client (SSE)
        │
  (stream complete)
        │
  queueMicrotask(() => {
    conversationIndexer.indexTurn({
      db,
      conversationId,
      turnNumber,
      userMsg,
      assistantMsg,
      callerId,
    })
  })
        │
        ▼
  conversationIndexer.ts
    │
    ├── format text: "User: {userMsg}\nAssistant: {assistantMsg}"
    ├── await embeddingClient.embed(text)
    └── db.prepare(`
          INSERT OR REPLACE INTO embeddings
            (id, corpus, source_id, chunk_index, user_id, visibility, embedding, embedded_at)
          VALUES (?, 'chat', ?, ?, ?, 'AUTHENTICATED', ?, datetime('now'))
        `).run(id, conversationId, turnNumber, callerId, vectorToBlob(embedding))
```

## `search_chat_history` Query Pattern

```typescript
async function searchChatHistory(db, { query, limit = 5, callerId }) {
  // 1. Embed the query
  const queryVec = await embeddingClient.embed(query);

  // 2. sqlite-vec nearest-neighbour search filtered to caller's own history
  const rows = db.prepare(`
    SELECT
      e.source_id   AS conversation_id,
      e.chunk_index AS turn_number,
      vec_distance_cosine(e.embedding, ?) AS score
    FROM embeddings e
    WHERE e.corpus = 'chat'
      AND e.user_id = ?
    ORDER BY score ASC
    LIMIT ?
  `).all(vectorToBlob(queryVec), callerId, limit);

  // 3. Fetch snippet text from intake_conversations
  return rows.map(r => {
    const turn = db.prepare(`
      SELECT user_message, assistant_message
      FROM intake_conversation_turns
      WHERE conversation_id = ? AND turn_number = ?
    `).get(r.conversation_id, r.turn_number);

    return {
      conversationId: r.conversation_id,
      turnNumber:     r.turn_number,
      snippet:        (turn?.user_message ?? "").slice(0, 200),
      score:          r.score,
    };
  });
}
```

> **Note:** `intake_conversation_turns` is the assumed turns sub-table. If the
> schema uses a single `messages` JSON column instead, adapt the fetch step to
> parse the JSON array.

## Cross-User Isolation Guarantee

The `WHERE e.user_id = ?` clause is **mandatory** — bound to `callerId`, not
supplied by the user. This means even if the caller passes a malicious query,
the SQL layer prevents any other user's rows from being returned.

## Fire-and-Forget Pattern

```typescript
// In chat route handler — AFTER streaming response:
queueMicrotask(() => {
  void indexChatTurn(...).catch(err =>
    console.error("[vec-02] indexing error:", err)
  );
});
// Response has already been sent — indexing failure cannot affect the user
```

## File Map

```
src/lib/db/migrations/
  047_intake_conversations_user_id.ts    ← NEW
src/lib/vector/
  conversation-indexer.ts               ← NEW
src/lib/agent/tools/
  maestro-vec-memory.ts                 ← NEW
src/app/api/v1/intake/chat/
  route.ts                              ← MODIFIED (+queueMicrotask call)
src/lib/agent/
  maestro-tools.ts                      ← MODIFIED (+1 tool → 43 total)
src/evals/
  vec-memory.eval.ts                    ← NEW
src/evals/fixtures/
  vec-memory-seeds.ts                   ← NEW
```
