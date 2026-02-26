# Sprint Vec-02: User Memory & Chat History Search — QA Checklist

## Pre-Deploy
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TypeScript errors
- [ ] Migration 047 applied (check schema: `PRAGMA table_info(intake_conversations)`)
- [ ] 3 evals pass: V2-01, V2-02, V2-03
- [ ] Tool count = 43

## Migration Verification
```sql
PRAGMA table_info(intake_conversations);
-- Expect: user_id column present with references users(id)

SELECT name FROM sqlite_master WHERE type='index' AND name='idx_ic_user_id';
-- Expect: 1 row
```

## Indexer Behaviour
- [ ] Single chat turn → 1 row inserted into `embeddings` with `corpus='chat'`
- [ ] Row has correct `user_id`, `source_id` (conversation_id), `chunk_index` (turn #)
- [ ] Indexing failure (simulated OpenAI timeout) → chat response still delivered
  (error logged, not re-thrown)
- [ ] Calling `indexChatTurn` twice with same id → `INSERT OR REPLACE` (no duplicates)

## Tool Isolation Check
- [ ] `search_chat_history` with `callerId='u-mem-1'` → never returns `u-mem-2` rows
- [ ] `search_chat_history` with no `callerId` → returns empty `{ results: [] }`
- [ ] Empty history → returns `note: "no chat history found"` (not an error)

## Eval Gate
| Eval | Expected | Pass? |
|------|----------|-------|
| V2-01 search-own-history | tool called, results from own history | |
| V2-02 cross-user-isolation | max 2 results, no conv-2 | |
| V2-03 search-no-history | graceful empty, no fabrication | |

## Regression Checks
- [ ] Vec-01 evals (V1-V4) still pass
- [ ] Chat route response time not measurably increased (indexer is async)
- [ ] Maestro-01 evals (A1–E2) still pass

## Accept / Reject
| Check | Result |
|---|---|
| All 3 evals pass | |
| Cross-user isolation confirmed | |
| Indexer non-blocking confirmed | |
| Migration clean (no existing rows broken) | |
| Build clean | |
| No test regression | |
