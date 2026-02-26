# Sprint Vec-02: User Memory & Chat History Search — Overview

## Status
**NOT STARTED** | Depends on: Vec-01 complete (embeddings table, search infrastructure)

## One-Liner
Attach user identity to chat conversations and build a `search_chat_history` tool
that lets users semantically search their own past chat sessions — with strict
cross-user isolation.

## Why This Sprint Exists
After Vec-01, the `embeddings` table exists and has RBAC visibility. But:
1. `intake_conversations` rows have no `user_id` — sessions are anonymous
2. The agent cannot recall past conversations for context
3. There is no way for a user to find a previous answer they received

This sprint wires user identity into the conversation pipeline and adds semantic
recall as a first-class tool.

## Scope Boundaries
| In scope | Out of scope |
|---|---|
| Migration 047: `ALTER TABLE intake_conversations ADD COLUMN user_id` | Full conversation summarisation |
| Conversation indexer (embed after each turn) | Real-time suggestion / autocomplete |
| `search_chat_history` tool | Cross-user search or admin history browsing |
| 3 evals (V2-01 through V2-03) | Multi-device sync |

## Inputs Required
- Vec-01 complete: `embeddings` table, `EmbeddingClient`, `VectorSearch` module

## Outputs Produced
- Migration `047_intake_conversations_user_id`
- `src/lib/vector/conversation-indexer.ts`
- `search_chat_history` tool
- 3 evals: V2-01, V2-02, V2-03
- Total tools: 42 → 43

## Estimated Effort
| Role | Hours |
|---|---|
| DB + embeddings | 2 h |
| Tool + indexer | 2 h |
| Evals | 1.5 h |
| Total | 5.5 h |

## Risk
**Medium.** Embedding is async; the conversation turn must complete before the
indexer runs (fire-and-forget in a `setImmediate` or `queueMicrotask` is fine).
Must not block the SSE stream response.
