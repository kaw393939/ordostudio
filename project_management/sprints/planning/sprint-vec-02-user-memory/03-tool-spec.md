# Sprint Vec-02: User Memory & Chat History Search — Tool Spec

File: `src/lib/agent/tools/maestro-vec-memory.ts`

---

## Tool: `search_chat_history`

### Description
Semantically searches the calling user's own past chat conversations. Returns
the most relevant turns as snippets. Strictly isolated: cannot return any other
user's history.

### Zod Input Schema

```typescript
const SearchChatHistoryInput = z.object({
  query: z.string().min(1).max(500)
          .describe("Natural language query to search chat history"),
  limit: z.number().int().min(1).max(20).default(5)
          .describe("Max results to return"),
});
```

### Output Shape

```typescript
type SearchChatHistoryOutput = {
  results: {
    conversationId: string;
    turnNumber:     number;
    snippet:        string;   // first 200 chars of user message
    score:          number;   // cosine distance (lower = more similar)
  }[];
  totalFound: number;
  query:      string;
  note?:      string;   // e.g. "no history found" when empty
};
```

### Implementation Notes

1. Calls `embeddingClient.embed(query)` to get query vector
2. sqlite-vec cosine search filtered to `corpus='chat'` AND `user_id=callerId`
3. Fetches snippet text from conversation turns table
4. Returns empty `results: []` (never throws) if no history exists

### Error Handling

```typescript
if (!callerId) return { results: [], totalFound: 0, query, note: "user identity required" };
if (rows.length === 0) return { results: [], totalFound: 0, query, note: "no chat history found" };
```

### Auth
- No special role required — all authenticated users can search their own history
- Tool MUST receive `callerId` from the route context (not from user input)
- If `callerId` is absent, return empty result (never throw — never expose other users' data)

### Registration in `maestro-tools.ts`

```typescript
import { searchChatHistory } from "./tools/maestro-vec-memory";

// Append to toolRegistry:
{ name: "search_chat_history", fn: searchChatHistory, schema: SearchChatHistoryInput }
```

Total tools after: **43**

---

## `conversationIndexer` Module

File: `src/lib/vector/conversation-indexer.ts`

Not a registered agent tool — called internally by the chat route.

```typescript
export interface IndexTurnParams {
  db:             Database;
  conversationId: string;
  turnNumber:     number;
  userMsg:        string;
  assistantMsg:   string;
  callerId:       string;
}

export async function indexChatTurn(params: IndexTurnParams): Promise<void> {
  const { db, conversationId, turnNumber, userMsg, assistantMsg, callerId } = params;
  const text = `User: ${userMsg}\nAssistant: ${assistantMsg}`;
  const embedding = await embeddingClient.embed(text);
  const id = `chat-${conversationId}-${turnNumber}`;

  db.prepare(`
    INSERT OR REPLACE INTO embeddings
      (id, corpus, source_id, chunk_index, user_id, visibility, embedding, embedded_at)
    VALUES (?, 'chat', ?, ?, ?, 'AUTHENTICATED', ?, datetime('now'))
  `).run(id, conversationId, turnNumber, callerId, vectorToBlob(embedding));
}
```
