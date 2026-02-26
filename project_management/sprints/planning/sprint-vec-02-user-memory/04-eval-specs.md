# Sprint Vec-02: User Memory & Chat History Search — Eval Specs

Eval file: `src/evals/vec-memory.eval.ts`
Seed: `src/evals/fixtures/vec-memory-seeds.ts`

---

## Seed Helper: `vec-memory-seeds.ts`

```typescript
export function seedVecMemoryFixtures(db: Database) {
  db.prepare(`INSERT OR IGNORE INTO users (id,email,role) VALUES
    ('u-mem-1', 'memory@test.com',  'SUBSCRIBER'),
    ('u-mem-2', 'other@test.com',   'SUBSCRIBER')
  `).run();

  // Pre-index two chat turns for u-mem-1
  // In tests, we insert embeddings directly (bypass OpenAI call)
  const fakeVec = Buffer.alloc(1536 * 4, 0);  // zero vector — still searchable

  db.prepare(`INSERT OR IGNORE INTO embeddings
    (id, corpus, source_id, chunk_index, user_id, visibility, embedding, embedded_at)
    VALUES
    ('emb-chat-1', 'chat', 'conv-1', 1, 'u-mem-1', 'AUTHENTICATED', ?, datetime('now','-5 days')),
    ('emb-chat-2', 'chat', 'conv-1', 2, 'u-mem-1', 'AUTHENTICATED', ?, datetime('now','-3 days'))
  `).run(fakeVec, fakeVec);

  // One chat embedding for u-mem-2 (different user — must NOT be returned for u-mem-1)
  db.prepare(`INSERT OR IGNORE INTO embeddings
    (id, corpus, source_id, chunk_index, user_id, visibility, embedding, embedded_at)
    VALUES
    ('emb-chat-3', 'chat', 'conv-2', 1, 'u-mem-2', 'AUTHENTICATED', ?, datetime('now','-1 day'))
  `).run(fakeVec);
}
```

---

## Eval V2-01: `search-own-history`

**Goal:** User asks agent to recall a past conversation; agent calls
`search_chat_history` and returns results from that user's history.

```typescript
{
  id: "vec-memory-V2-01-search-own",
  description: "User can search their own chat history via agent",
  callerId: "u-mem-1",
  callerRole: "SUBSCRIBER",
  preSetup: (db) => seedVecMemoryFixtures(db),
  turns: [
    { role: "user", content: "Can you find any past conversations where I asked about pricing?" },
  ],
  assertions: [
    { type: "tool-called", toolName: "search_chat_history" },
    {
      // Results should reference u-mem-1's conversation
      type: "content-matches-regex",
      pattern: /conv-1|found|history|past|conversation/i,
    },
    // Must NOT reference u-mem-2's conversation
    { type: "content-not-contains", substring: "conv-2" },
  ],
},
```

---

## Eval V2-02: `cross-user-isolation`

**Goal:** When the tool is called with `callerId='u-mem-1'`, it never returns
`u-mem-2`'s embeddings — even with an identical query.

```typescript
{
  id: "vec-memory-V2-02-cross-user-blocked",
  description: "Cross-user chat history cannot be accessed",
  // This is a direct tool-call eval (not LLM turn)
  type: "direct-tool",
  callerId: "u-mem-1",
  callerRole: "SUBSCRIBER",
  preSetup: (db) => seedVecMemoryFixtures(db),
  toolName: "search_chat_history",
  toolArgs: { query: "anything", limit: 10 },
  assertions: [
    {
      // Should find 2 results (emb-chat-1, emb-chat-2) — NOT emb-chat-3
      type: "result-length-lte",
      max: 2,
    },
    {
      // None of the returned source_ids should be 'conv-2'
      type: "result-every",
      predicate: (r) => r.conversationId !== "conv-2",
    },
  ],
},
```

---

## Eval V2-03: `search-no-history`

**Goal:** User with no indexed chat history receives a graceful empty response,
not an error or hallucinated results.

```typescript
{
  id: "vec-memory-V2-03-no-history",
  description: "No chat history — graceful empty response without hallucination",
  callerId: "u-mem-2",
  callerRole: "SUBSCRIBER",
  preSetup: (db) => {
    // Only seed u-mem-2 user — do NOT index any chat for them
    db.prepare(`INSERT OR IGNORE INTO users (id,email,role) VALUES
      ('u-mem-2','other@test.com','SUBSCRIBER')
    `).run();
  },
  turns: [
    { role: "user", content: "Do I have any past conversations about events?" },
  ],
  assertions: [
    { type: "tool-called", toolName: "search_chat_history" },
    {
      type: "content-matches-regex",
      pattern: /no (previous|past|prior|chat)|haven't|no history|don't have any/i,
    },
    // Must not fabricate conversation content
    { type: "content-not-contains", substring: "conv-1" },
    { type: "content-not-contains", substring: "pricing" },
  ],
},
```
