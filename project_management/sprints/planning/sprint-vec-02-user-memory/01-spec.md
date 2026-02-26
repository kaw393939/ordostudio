# Sprint Vec-02: User Memory & Chat History Search — Spec

## Objective
Wire `user_id` into conversations, index each chat turn as an embedding, and
expose a `search_chat_history` tool that retrieves semantically relevant past
exchanges for the calling user only.

## Acceptance Criteria

### AC-1  Migration 047
- [ ] `ALTER TABLE intake_conversations ADD COLUMN user_id TEXT REFERENCES users(id)`
- [ ] Index: `CREATE INDEX idx_ic_user_id ON intake_conversations(user_id)`
- [ ] Backfill: `UPDATE intake_conversations SET user_id = ...` via `registerUser`
  session link (best-effort; existing rows may remain NULL)

### AC-2  Conversation indexer
- [ ] After each completed chat turn, embed `"User: {user_msg}\nAssistant: {response}"` text
- [ ] Insert into `embeddings` table:
  - `corpus = 'chat'`
  - `source_id = conversation_id`
  - `chunk_index = turn_number`
  - `user_id = callerId`
  - `visibility = 'AUTHENTICATED'`
- [ ] Fire-and-forget (non-blocking): does not delay SSE response

### AC-3  `search_chat_history` tool
- [ ] Accepts `query: string`, `limit?: number` (default 5)
- [ ] Searches `embeddings` WHERE `corpus='chat'` AND `user_id=callerId`
- [ ] Returns matching turns with `{ conversationId, turnNumber, snippet, score }`
- [ ] NEVER returns another user's chat history

### AC-4  3 Evals
- [ ] V2-01: search own history → finds relevant result
- [ ] V2-02: search cross-user → blocked (returns empty, no error)
- [ ] V2-03: search with no history → graceful empty response

## New Files
```
src/lib/db/migrations/047_intake_conversations_user_id.ts
src/lib/vector/conversation-indexer.ts
src/lib/agent/tools/maestro-vec-memory.ts
src/evals/fixtures/vec-memory-seeds.ts
src/evals/vec-memory.eval.ts
```

## Modified Files
```
src/app/api/v1/intake/chat/route.ts    ← call indexer after turn completes
src/lib/agent/maestro-tools.ts         ← register search_chat_history
```

## Non-Goals
- No conversation summarisation
- No cross-user admin view of chat history
- No history deletion tool (future sprint)
