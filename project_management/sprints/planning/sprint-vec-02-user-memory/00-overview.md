# Sprint Vec-02: User Memory & Chat History Search — DEFERRED

## Status
**DEFERRED — PARKING LOT** | No schedule | Do not start without user research

---

## Why This Sprint Is Deferred

Three signals must exist before building this sprint:

1. **User feedback** — Users explicitly ask "can you remember what we talked about?"
   or report that they couldn't find a previous answer. This has not happened yet.

2. **Volume threshold** — The `intake_conversations` table should have > 500
   sessions before semantic search over chat history provides meaningful recall.
   Today it has far fewer.

3. **Performance budget** — Every chat turn currently makes zero OpenAI API calls
   for non-RAG messages. Vec-02 would add an embedding call (text-embedding-3-small)
   on every single turn to index the conversation. At $0.02/million tokens, the
   cost per unit is negligible, but the latency is not: ~80ms per turn added.
   That 80ms is noticeable in a conversational interface.

---

## Original Scope (preserved as reference)

If undeferred, this sprint builds:

- Migration 047: `ALTER TABLE intake_conversations ADD COLUMN user_id TEXT`
- Conversation indexer: after each agent turn, embed the exchange and INSERT into
  `embeddings` with `corpus = 'chat'`, `user_id = callerId`
- `search_chat_history` tool: semantic search over caller's own past conversations
- Cross-user isolation: every query WHERE `user_id = callerId` — no admin override

Full spec files (`01-spec.md`, `02-architecture.md`, `03-tool-spec.md`,
`04-eval-specs.md`, `05-sprint.md`) are preserved and current. This overview
is the only file with the deferred status.

---

## Prerequisites to Revisit

- User research showing ≥ 3 users independently request conversation recall
- OR intake conversation volume > 500 sessions
- OR latency budget review shows 80ms/turn acceptable in production

When any condition is met, update this file and move Vec-02 into the active
execution sequence after Vec-01.
