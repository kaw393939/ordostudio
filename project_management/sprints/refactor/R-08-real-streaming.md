# Sprint R-08: Real Anthropic Streaming

**Track:** Chat Refactor  
**Audit source:** Knuth algorithmic audit — fake streaming via buffer+word-split  
**Depends on:** R-07 (route is decomposed — easier to slot in), R-05 (client-side SSE parser already handles real deltas)  
**Estimated effort:** 3–4 hours  

---

## Context

The current implementation buffers the entire Claude response and then artificially re-emits it word by word:

```typescript
// route.ts — current implementation
const result = await runClaudeAgentLoop(messages, db, sessionId);
const assistantFinalContent = result.content;

// Fake "streaming" — split the completed response and re-emit it
const words = assistantFinalContent.split(/(\s+)/);
for (const word of words) {
  if (word.trim()) {
    controller.enqueue(encoder.encode(sseChunk({ delta: word })));
    await new Promise(r => setTimeout(r, 20));  // artificial delay
  }
}
```

This means:
1. The user sees a loading state for the full LLM round-trip (2–8 seconds)
2. Then sees fake word-by-word reveal as if it were streamed — but all content was available at T+0
3. The perceived "streaming" is actually a UI lie
4. Users who are quick readers can tell the difference

### What Real Streaming Looks Like

With true streaming, the first token appears in ~200ms (Anthropic TTFT) and the response fills in as it's generated. The psychological improvement is significant — perceived latency drops from 3–5s to <0.5s.

The Anthropic SDK provides native streaming via `client.messages.stream()`.

---

## 8.1 — Anthropic Client Module-Level Singleton

**Current:** `new Anthropic({ apiKey: ... })` is called inside `runClaudeAgentLoop` on every request.

**Fix:** Create a module-level singleton:

```typescript
// src/lib/llm-anthropic.ts — top of file
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
```

The client holds no per-request state. Module-level is correct for serverless edge functions where the module is reused within the worker's lifetime.

---

## 8.2 — Streaming Architecture Change

**Current flow (batch):**
```
Request → runClaudeAgentLoop() → await complete response → SSE word-split → Client
```

**Target flow (streaming):**
```
Request → runClaudeAgentLoopStream(controller) → token_delta → SSE → Client
         (tool calls still await, then resume streaming)
```

### New API for `llm-anthropic.ts`

```typescript
interface StreamingCallbacks {
  onDelta: (text: string) => void;
  onToolCall: (name: string, args: unknown) => void;
  onToolResult: (name: string, content: string) => void;
  onDone: (bookingId: string | null) => void;
}

export async function runClaudeAgentLoopStream(
  messages: Anthropic.MessageParam[],
  db: Database,
  sessionId: string,
  callbacks: StreamingCallbacks,
): Promise<void>
```

### Implementation

```typescript
export async function runClaudeAgentLoopStream(
  messages: Anthropic.MessageParam[],
  db: Database,
  sessionId: string,
  callbacks: StreamingCallbacks,
): Promise<void> {
  const client = getClient();
  let bookingId: string | null = null;
  const history = [...messages];

  while (true) {
    const stream = await client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: AGENT_SYSTEM_PROMPT,
      tools: AGENT_TOOL_DEFINITIONS,
      messages: history,
    });

    let assistantText = "";
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

    // Stream text_delta events in real time
    stream.on("text", (text) => {
      assistantText += text;
      callbacks.onDelta(text);         // ← fires for each real token
    });

    const response = await stream.finalMessage();

    // Handle tool_use blocks after response is complete
    for (const block of response.content) {
      if (block.type === "tool_use") {
        toolUseBlocks.push(block);
      }
    }

    if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      callbacks.onDone(bookingId);
      return;
    }

    // Execute tools
    history.push({ role: "assistant", content: response.content });
    
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolBlock of toolUseBlocks) {
      callbacks.onToolCall(toolBlock.name, toolBlock.input);
      const result = await executeAgentTool(toolBlock.name, toolBlock.input, db, sessionId);
      if (result.bookingId) bookingId = result.bookingId;
      callbacks.onToolResult(toolBlock.name, result.content);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: result.content,
      });
    }

    history.push({ role: "user", content: toolResults });
    // Continue loop to get Claude's response after tool results
  }
}
```

---

## 8.3 — Route Integration

Replace the `runClaudeAgentLoop` + fake word-split block in `route.ts`:

```typescript
// Before: entire response buffered then word-split
const stream = new ReadableStream({
  async start(controller) {
    await runClaudeAgentLoopStream(messages, db, sessionId, {
      onDelta(text) {
        controller.enqueue(encoder.encode(sseChunk({ delta: text })));
      },
      onToolCall(name, args) {
        controller.enqueue(encoder.encode(sseChunk({ toolCall: { name, args } })));
      },
      onToolResult(name, content) {
        controller.enqueue(encoder.encode(sseChunk({ toolResult: { name, content } })));
      },
      onDone(bookingId) {
        // persist + send done frame
        persistAssistantMessage(db, conversationId, fullContent, bookingId ?? undefined);
        controller.enqueue(encoder.encode(sseChunk({ done: true, conversationId, sessionId })));
        controller.close();
      },
    });
  },
});
```

The artificial `setTimeout` delay loop is **deleted**.

---

## 8.4 — Client-Side Changes

None required — `parseSSEStream` from R-05 already handles `{ delta: "..." }` frames. Real streaming produces the same SSE frame format as fake streaming, just arriving sooner and at irregular intervals. The client is already correct.

---

## 8.5 — OpenAI Fallback Path

The OpenAI path in `route.ts` also uses the batch-and-fake-stream pattern. Upgrade to OpenAI streaming (`openai.chat.completions.stream`) using the same `onDelta` callback pattern.

However, OpenAI streaming is lower priority — the primary provider is Claude. If bandwidth is limited, document the OpenAI path as "to be streamed in R-10" and leave it as batch for now with a `// TODO(R-10): upgrade to streaming` comment.

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Module-level Anthropic client singleton | `llm-anthropic.ts` | 15 min |
| T2 | Write `runClaudeAgentLoopStream` with `stream.on("text")` | `llm-anthropic.ts` | 60 min |
| T3 | Remove `runClaudeAgentLoop` (old batch version) or keep with deprecation notice | `llm-anthropic.ts` | 5 min |
| T4 | Remove fake word-split loop from `route.ts` | `route.ts` | 10 min |
| T5 | Wire `runClaudeAgentLoopStream` into route streaming response | `route.ts` | 30 min |
| T6 | Manual streaming test (DevTools → Network → EventStream) | — | 10 min |
| T7 | Write unit test for `runClaudeAgentLoopStream` with mocked SDK | `llm-anthropic.test.ts` | 60 min |

---

## Verification

1. Open DevTools → Network → select the `/api/v1/agent/chat` request
2. Click EventStream tab
3. Send a chat message
4. Verify deltas arrive progressively from ~200ms after request, not all at once after 3+ seconds
5. Count: there should be no `setTimeout` anywhere in the streaming path

**Latency improvement expected:** TTFT drops from ~3s to ~200ms.

---

## Definition of Done

- [ ] Anthropic client is a module-level singleton
- [ ] `runClaudeAgentLoopStream` uses `client.messages.stream()` and fires `onDelta` per token
- [ ] No fake word-split loop, no `setTimeout` delay in SSE path
- [ ] Full conversation still persists correctly to SQLite after stream ends
- [ ] Tool calls still execute and their results feed back to Claude correctly
- [ ] `bookingId` captured and persisted correctly
- [ ] TTFT visibly improves (browser DevTools confirmation)
- [ ] `npx vitest run` passes (no regression)
