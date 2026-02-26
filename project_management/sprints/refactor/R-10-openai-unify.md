# Sprint R-10: OpenAI Loop Unification + DB Hygiene

**Track:** Chat Refactor  
**Audit source:** Architecture audit — feature parity gap, scattered patterns, long-term maintainability  
**Depends on:** R-07 (route decomposed), R-08 (streaming architecture), R-09 (tool registry)  
**Estimated effort:** 3–4 hours  

---

## Context

The route file currently maintains two independent agent loops: one for Claude (driven by `runClaudeAgentLoopStream` after R-08) and one for OpenAI. The OpenAI path was written separately and has quietly diverged:

1. **Missing `booking_id` capture** — the Claude path flows `bookingId` from `executeAgentTool` through the loop into `persistAssistantMessage`. The OpenAI path's tool loop does not.
2. **Still uses batch-and-fake-stream** — even after R-08 upgrades Claude to real streaming, the OpenAI path still buffers the full response. R-08 noted this as a `// TODO(R-10)` for now.
3. **DB connection discipline** — after R-07's `try/finally`, the DB connection is managed correctly in `POST`. But individual OpenAI-path tool calls may need audit.
4. **Shared tool loop contract** — both providers should call `executeAgentTool` from R-09 (which has Zod validation). If the OpenAI loop has its own args coercion, that needs to go.

This sprint aligns the OpenAI path with the Claude path, upgrades it to real streaming, and ensures both paths use the unified tool registry from R-09.

---

## 10.1 — Unified Agent Loop Contract

The Claude loop (after R-08) follows this contract:

```typescript
interface AgentLoopCallbacks {
  onDelta: (text: string) => void;
  onToolCall: (name: string, args: unknown) => void;
  onToolResult: (name: string, content: string) => void;
  onDone: (bookingId: string | null) => void;
}

// Claude
export async function runClaudeAgentLoopStream(
  messages: Anthropic.MessageParam[],
  db: Database,
  sessionId: string,
  callbacks: AgentLoopCallbacks,
): Promise<void>
```

The OpenAI path should implement the identical signature:

```typescript
// OpenAI
export async function runOpenAIAgentLoopStream(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  db: Database,
  sessionId: string,
  callbacks: AgentLoopCallbacks,
): Promise<void>
```

Both functions are called from `route.ts` using the same callback shape — the route has no `if (provider === "claude")` branches inside the callback wiring.

---

## 10.2 — `booking_id` Capture in OpenAI Path

**Current OpenAI path (~`route.ts`):**

```typescript
// Approximate — OpenAI tool loop
while (true) {
  const completion = await openai.chat.completions.create({ ... });
  const message = completion.choices[0].message;

  if (message.tool_calls) {
    for (const tc of message.tool_calls) {
      const result = await executeAgentTool(tc.function.name, JSON.parse(tc.function.arguments), db, sessionId);
      // BUG: result.bookingId is discarded — never written to DB or SSE done frame
      toolMessages.push({ role: "tool", content: result.content, tool_call_id: tc.id });
    }
  } else {
    break;
  }
}
```

**Fixed:**

```typescript
let bookingId: string | null = null;

for (const tc of message.tool_calls) {
  const result = await executeAgentTool(...);
  if (result.bookingId) bookingId = result.bookingId;   // ← capture
  ...
}

// Pass bookingId to callbacks.onDone
callbacks.onDone(bookingId);
```

After R-09, `executeAgentTool` validates args with Zod — `JSON.parse(tc.function.arguments)` still needed for the raw string, but the Zod layer protects downstream.

---

## 10.3 — OpenAI Real Streaming

OpenAI provides streaming via `openai.chat.completions.stream(...)` (SDK v4 pattern):

```typescript
export async function runOpenAIAgentLoopStream(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  db: Database,
  sessionId: string,
  callbacks: AgentLoopCallbacks,
): Promise<void> {
  const client = getOpenAIClient();  // module-level singleton (mirrors R-08 for Claude)
  let bookingId: string | null = null;
  const history = [...messages];

  while (true) {
    const stream = client.chat.completions.stream({
      model: "gpt-4o-mini",
      messages: history,
      tools: AGENT_TOOL_DEFINITIONS_OPENAI_FORMAT,  // converted from registry
      tool_choice: "auto",
    });

    let assistantText = "";
    const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];

    // Real streaming deltas
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        assistantText += delta.content;
        callbacks.onDelta(delta.content);      // ← real token, not fake word
      }
      if (delta?.tool_calls) {
        // Accumulate streaming tool call fragments
        for (const tc of delta.tool_calls) {
          // merge tool call fragments (OpenAI streams them in parts)
          mergeToolCallFragment(toolCalls, tc);
        }
      }
    }

    const finalMsg = await stream.finalMessage();
    if (finalMsg.choices[0].finish_reason !== "tool_calls" || toolCalls.length === 0) {
      callbacks.onDone(bookingId);
      return;
    }

    history.push({ role: "assistant", content: assistantText, tool_calls: toolCalls });

    const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
    for (const tc of toolCalls) {
      const args = JSON.parse(tc.function.arguments);
      callbacks.onToolCall(tc.function.name, args);
      const result = await executeAgentTool(tc.function.name, args, db, sessionId);
      if (result.bookingId) bookingId = result.bookingId;
      callbacks.onToolResult(tc.function.name, result.content);
      toolResults.push({ role: "tool", content: result.content, tool_call_id: tc.id });
    }

    history.push(...toolResults);
  }
}
```

---

## 10.4 — Module-Level OpenAI Client Singleton

Mirrors the Anthropic singleton from R-08:

```typescript
// src/lib/llm-openai.ts — NEW file (or add to existing openai adapter)
import OpenAI from "openai";

let _openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}
```

---

## 10.5 — Tool Definitions in OpenAI Format

Both providers use the same 5 tools from the registry (R-09), but slightly different API shapes.

Add a derived export in `agent-tools.ts`:

```typescript
// For Anthropic — already exists
export const AGENT_TOOL_DEFINITIONS = Object.values(TOOL_REGISTRY).map(e => e.definition);

// For OpenAI — NEW
export const AGENT_TOOL_DEFINITIONS_OPENAI: OpenAI.Chat.ChatCompletionTool[] =
  Object.values(TOOL_REGISTRY).map((entry) => ({
    type: "function" as const,
    function: {
      name: entry.definition.name,
      description: entry.definition.description,
      parameters: entry.definition.input_schema,
    },
  }));
```

Single source of truth — add a tool to the registry once, available to both providers.

---

## 10.6 — Route Cleanup

After this sprint, `route.ts` selects a provider and calls the appropriate loop with the same callbacks:

```typescript
const providerLoop = config.provider === "openai"
  ? runOpenAIAgentLoopStream
  : runClaudeAgentLoopStream;

const stream = new ReadableStream({
  async start(controller) {
    await providerLoop(messages, db, sessionId, {
      onDelta(delta) { ... },
      onToolCall(name, args) { ... },
      onToolResult(name, content) { ... },
      onDone(bookingId) { ... },
    });
  },
});
```

No provider-specific logic after the loop selection line.

---

## 10.7 — DB Hygiene Completion

Review all remaining `db.prepare`, `db.run`, `db.exec` calls across all agent library files:
- `agent-tools.ts` — all executors receive `db` parameter after R-09; none call `openCliDb()` directly; ✓
- `llm-anthropic.ts` — receives `db` parameter; ✓
- `llm-openai.ts` (new) — receives `db` parameter; ✓
- No stray `openCliDb()` outside of `route.ts`

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Extract `getOpenAIClient()` singleton | `src/lib/llm-openai.ts` | 15 min |
| T2 | Port OpenAI path to `runOpenAIAgentLoopStream` with real streaming + booking_id capture | `src/lib/llm-openai.ts` | 75 min |
| T3 | Add `AGENT_TOOL_DEFINITIONS_OPENAI` derived export to registry | `agent-tools.ts` | 15 min |
| T4 | Unify route provider selection to single callback call | `route.ts` | 20 min |
| T5 | Audit all DB access across lib files for stray `openCliDb()` | all lib files | 15 min |
| T6 | Test both providers end-to-end (manual) | — | 15 min |
| T7 | Write unit tests for `runOpenAIAgentLoopStream` with mocked SDK | `llm-openai.test.ts` | 45 min |

---

## Verification

1. Set `OPENAI_API_KEY` in `.env.local` and force `config.provider = "openai"` temporarily
2. Send a chat message — verify streaming deltas arrive progressively
3. Trigger a tool call — verify `bookingId` is written to DB correctly
4. Revert to Claude — verify no regression

---

## Definition of Done

- [ ] `runOpenAIAgentLoopStream` exists with same callback contract as Claude
- [ ] OpenAI path captures and persists `bookingId` (feature parity with Claude)
- [ ] OpenAI path uses real streaming (`for await` on stream, not `.create()`)
- [ ] `AGENT_TOOL_DEFINITIONS_OPENAI` derived from single tool registry
- [ ] `route.ts` has zero provider-specific code after the providerLoop selection
- [ ] Module-level OpenAI client singleton (no per-request constructor)
- [ ] No stray `openCliDb()` calls outside `route.ts`
- [ ] `npx vitest run` passes (no regression)
- [ ] Both providers work end-to-end in manual test

---

## Final State After All 10 Sprints

| Metric | Before | After |
|--------|--------|-------|
| `chat-widget.tsx` lines | 844 | < 100 |
| `route.ts` lines | 590 | < 200 |
| `llm-anthropic.ts` lines | 309 | < 150 |
| `agent-tools.ts` lines | 290 | < 200 |
| P0 bugs | 5 | 0 |
| SSE TTFT | ~3–5s | ~200ms |
| `db.close()` leak paths | 4+ | 0 |
| Unvalidated tool args | all 5 tools | 0 |
| Duplicate SVG blocks | 5× | 1 |
| Test coverage | 1547/1548 | ≥ 1580/1581 |
