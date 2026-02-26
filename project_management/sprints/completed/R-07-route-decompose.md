# Sprint R-07: `POST` Handler Decomposition

**Track:** Chat Refactor  
**Audit source:** Uncle Bob SRP audit — 270-line God route  
**Depends on:** none — backend changes, independent of frontend refactors  
**Estimated effort:** 3–4 hours  

---

## Context

`src/app/api/v1/agent/chat/route.ts` is a 590-line file with a single exported `POST` function that does all of:
1. Request body parsing and validation
2. Loading or creating conversations in SQLite
3. Rate-limiting
4. Building Anthropic/OpenAI message payloads (with attachment blocks)
5. Choosing Claude vs OpenAI provider
6. Running the agent tool loop
7. Persisting the assistant response
8. Building and returning the SSE response

Beyond the cognitive load, there are two concrete bugs:
- `interface AttachmentInput` is declared inside the `POST` function body (line ~214)
- `db.close()` is called in 4+ early-return paths with no `try/finally`, meaning an exception in the middle of the function leaks an open SQLite connection

This sprint decomposes the route without changing any external contract.

---

## 7.1 — Bug: `db.close()` scattered without `try/finally`

**Current pattern:**
```typescript
export async function POST(req: Request) {
  const db = openCliDb();
  
  // early return 1
  const body = await req.json().catch(() => null);
  if (!body) {
    db.close();
    return Response.json({ error: "..." }, { status: 400 });
  }
  
  // early return 2
  if (rateLimited) {
    db.close();
    return Response.json({ error: "..." }, { status: 429 });
  }
  
  // ... many more early returns
  
  const stream = new ReadableStream({ ... });
  db.close();                // inside stream controller
  return new Response(stream, ...);
}
```

If any line between `openCliDb()` and a `db.close()` throws (e.g., `req.json()` throws on invalid UTF-8, or a DB query throws), the connection is never closed.

**Fix:**
```typescript
export async function POST(req: Request) {
  const db = openCliDb();
  try {
    return await handleChatPost(req, db);
  } finally {
    db.close();
  }
}

async function handleChatPost(req: Request, db: Database): Promise<Response> {
  // All early returns here — db.close() happens in outer finally
  ...
}
```

---

## 7.2 — `interface AttachmentInput` — Move to Module Scope

**Current (line ~214):**
```typescript
export async function POST(req: Request) {
  ...
  interface AttachmentInput {   // BUG: inside function body
    name: string;
    type: string;
    base64: string;
  }
  ...
}
```

TypeScript permits this but it is unusual and prevents reuse. Move to module scope.

---

## 7.3 — Extraction Plan

Extract these named functions from `handleChatPost`:

### `parseAndValidateChatBody(req: Request)`
```typescript
interface ChatBody {
  message: string;
  sessionId: string;
  conversationId?: string;
  attachments?: AttachmentInput[];
}

async function parseAndValidateChatBody(
  req: Request,
): Promise<{ ok: true; body: ChatBody } | { ok: false; response: Response }>
```

Owns: `req.json()`, field presence checks, type guards. Returns early Response if invalid.

### `loadOrCreateConversation(db: Database, sessionId: string, conversationId?: string)`
```typescript
interface ConversationContext {
  conversationId: string;
  history: Array<{ role: string; content: string }>;
  isNew: boolean;
}

function loadOrCreateConversation(
  db: Database,
  sessionId: string,
  conversationId?: string,
): ConversationContext
```

Owns: all `db.prepare` calls for conversation loading, creation, and history fetch.

### `buildAnthropicMessageBlock(attachment: AttachmentInput)`
```typescript
function buildAnthropicMessageBlock(attachment: AttachmentInput): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam
```

Converts an attachment to the Anthropic API payload format. Currently inlined in two places.

### `checkRateLimit(db: Database, sessionId: string)`
```typescript
function checkRateLimit(
  db: Database,
  sessionId: string,
): { limited: true; response: Response } | { limited: false }
```

Extracts the rate-limiting logic (currently inlined).

### `persistAssistantMessage(db: Database, conversationId: string, content: string, bookingId?: string)`
```typescript
function persistAssistantMessage(...): void
```

The DB write after the LLM responds. Currently duplicated in Claude and OpenAI paths.

---

## 7.4 — Route After Refactor

```typescript
// module scope
export interface AttachmentInput {
  name: string;
  type: string;
  base64: string;
}

export async function POST(req: Request): Promise<Response> {
  const db = openCliDb();
  try {
    return await handleChatPost(req, db);
  } finally {
    db.close();
  }
}

async function handleChatPost(req: Request, db: Database): Promise<Response> {
  const parse = await parseAndValidateChatBody(req);
  if (!parse.ok) return parse.response;

  const rateCheck = checkRateLimit(db, parse.body.sessionId);
  if (rateCheck.limited) return rateCheck.response;

  const ctx = loadOrCreateConversation(db, parse.body.sessionId, parse.body.conversationId);

  const { assistantContent, toolEvents, bookingId } = await runAgentWithProvider(
    parse.body,
    ctx,
    db,
  );

  persistAssistantMessage(db, ctx.conversationId, assistantContent, bookingId);

  return buildSSEResponse(toolEvents, assistantContent, ctx.conversationId, parse.body.sessionId);
}
```

Target: `handleChatPost` < 40 lines. Each helper < 40 lines. Total route file < 250 lines.

---

## 7.5 — File Placement

```
src/app/api/v1/agent/chat/
  route.ts                  ← slimmed, exports only POST
  
src/lib/api/
  chat-body-parser.ts       ← parseAndValidateChatBody
  conversation-store.ts     ← loadOrCreateConversation, persistAssistantMessage
  rate-limiter.ts           ← checkRateLimit (if not already extracted)
  attachment-builder.ts     ← buildAnthropicMessageBlock
```

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Move `interface AttachmentInput` to module scope | `route.ts` | 2 min |
| T2 | Wrap `POST` in `try/finally { db.close() }` | `route.ts` | 10 min |
| T3 | Extract `parseAndValidateChatBody` | `chat-body-parser.ts` | 20 min |
| T4 | Extract `loadOrCreateConversation` + `persistAssistantMessage` | `conversation-store.ts` | 30 min |
| T5 | Extract `checkRateLimit` | `rate-limiter.ts` | 15 min |
| T6 | Extract `buildAnthropicMessageBlock` | `attachment-builder.ts` | 15 min |
| T7 | Reduce `handleChatPost` to compositor | `route.ts` | 20 min |
| T8 | Write unit tests for each extracted helper | `__tests__/` | 45 min |

---

## Test Coverage

| Test | Helper |
|------|--------|
| Returns 400 on missing `message` | `parseAndValidateChatBody` |
| Returns 400 on missing `sessionId` | `parseAndValidateChatBody` |
| Creates new conversation if id absent | `loadOrCreateConversation` |
| Returns existing conversation history | `loadOrCreateConversation` |
| Returns 429 after rate limit exceeded | `checkRateLimit` |
| Builds correct image block | `buildAnthropicMessageBlock` |

---

## Definition of Done

- [ ] `interface AttachmentInput` at module scope
- [ ] `db.close()` only in `finally` block, zero scattered calls
- [ ] Five named helper functions extracted
- [ ] `handleChatPost` body < 45 lines
- [ ] Route file total < 260 lines
- [ ] All existing behavior preserved (integration-test manually)
- [ ] 6+ new unit tests passing
- [ ] `npx vitest run` total ≥ 1568/1569
