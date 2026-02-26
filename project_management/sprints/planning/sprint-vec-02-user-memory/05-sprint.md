# Sprint Vec-02: User Memory & Chat History Search — Sprint Plan

## Prerequisites
- [ ] Vec-01 complete: `embeddings` table, `EmbeddingClient`, `vectorToBlob` utility
- [ ] `intake_conversations` table confirmed present
- [ ] `src/app/api/v1/intake/chat/route.ts` identified as the chat SSE endpoint

## Tasks

### T1 — Migration 047 (30 min)
- [ ] Create `src/lib/db/migrations/047_intake_conversations_user_id.ts`
- [ ] `ALTER TABLE intake_conversations ADD COLUMN user_id TEXT REFERENCES users(id)`
- [ ] `CREATE INDEX IF NOT EXISTS idx_ic_user_id ON intake_conversations(user_id)`
- [ ] Register migration in migration runner
- [ ] Run: `npm run db:migrate` — verify no error

### T2 — Conversation indexer (45 min)
- [ ] Create `src/lib/vector/conversation-indexer.ts`
- [ ] `indexChatTurn(params)` — embeds user+assistant text, inserts to `embeddings`
- [ ] Handle OpenAI errors: log + swallow (never propagate to chat route)
- [ ] Unit test: `indexChatTurn` inserts correct row with `corpus='chat'`

### T3 — Wire indexer into chat route (30 min)
- [ ] In `src/app/api/v1/intake/chat/route.ts`: after stream completes,
  call `queueMicrotask(() => void indexChatTurn(...).catch(...))`
- [ ] Verify: chat response is NOT delayed by indexing
- [ ] Verify: indexing errors appear in console but do not 500 the route

### T4 — `search_chat_history` tool (45 min)
- [ ] Create `src/lib/agent/tools/maestro-vec-memory.ts`
- [ ] Implement with `callerId` isolation and graceful empty return
- [ ] Register in `maestro-tools.ts` → total = 43

### T5 — Seed fixture + evals (1.5 h)
- [ ]  `vec-memory-seeds.ts` (zero vectors, 2 users, 2 convs)
- [ ] `vec-memory.eval.ts` (V2-01, V2-02, V2-03)
- [ ] Run: `npm run evals -- --file vec-memory`

### T6 — Full test suite + build
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TSC errors

### T7 — Commit
```bash
git add src/lib/db/migrations/047_intake_conversations_user_id.ts \
        src/lib/vector/conversation-indexer.ts \
        src/lib/agent/tools/maestro-vec-memory.ts \
        src/app/api/v1/intake/chat/route.ts \
        src/lib/agent/maestro-tools.ts \
        src/evals/vec-memory.eval.ts \
        src/evals/fixtures/vec-memory-seeds.ts
git commit -m "feat(vector): user memory — conversation indexing + search_chat_history tool (migration 047)"
```

## Definition of Done
- [ ] Migration 047 applied without error
- [ ] Chat route indexes turns (fire-and-forget, non-blocking)
- [ ] `search_chat_history` returns only calling user's results
- [ ] V2-01 passes: agent calls tool and surfaces results
- [ ] V2-02 passes: cross-user data never returned
- [ ] V2-03 passes: graceful empty response (no hallucination)
- [ ] `npm test` 1714+/1715, build clean
