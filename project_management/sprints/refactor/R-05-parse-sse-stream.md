# Sprint R-05: Extract `parseSSEStream` Utility

**Track:** Chat Refactor  
**Audit source:** Uncle Bob SRP audit — `sendMessage` doing 6 things  
**Depends on:** R-02 (stable message ids — streaming update by id)  
**Estimated effort:** 2–3 hours  

---

## Context

`sendMessage()` in `chat-widget.tsx` currently contains ~40 lines of raw SSE parsing logic inline. This logic is the most testable part of the entire data flow — a pure bytes-in/callbacks-out decoder — yet it has zero unit tests because it is buried inside a React state closure.

Extracting it to a standalone `parseSSEStream` function allows:
1. The SSE format to be tested without mounting a component
2. `sendMessage` to shrink to its essential responsibility: "build the request, call the parser, wire the callbacks into state"
3. Future streaming improvements (R-08) to be swapped in by changing one function

---

## 5.1 — SSE Protocol Used by This App

The route (`route.ts`) emits newline-delimited JSON objects:

```
data: {"delta":"Hello"}\n\n
data: {"delta":" world"}\n\n
data: {"toolCall":{"name":"get_availability","args":{...}}}\n\n
data: {"toolResult":{"name":"get_availability","content":"..."}}\n\n
data: {"done":true,"conversationId":"abc","sessionId":"xyz"}\n\n
```

The client currently parses this with inline `TextDecoder`, `split('\n\n')`, `JSON.parse`, and a large `if/else` inside the reader loop.

---

## 5.2 — `parseSSEStream` API

```typescript
interface SSEHandlers {
  /** Called for each text token — append to the current assistant message */
  onDelta: (delta: string) => void;

  /** Called when the stream is complete */
  onDone: (meta: { conversationId: string | null; sessionId: string | null }) => void;

  /** Called when a tool call starts */
  onToolCall: (call: { name: string; args: unknown }) => void;

  /** Called when a tool result arrives */
  onToolResult: (result: { name: string; content: string }) => void;

  /** Called on any parse error or network error */
  onError: (error: Error) => void;
}

/**
 * Reads an SSE stream from a ReadableStream<Uint8Array> and dispatches
 * events to the provided handlers. Returns when the stream ends.
 *
 * Pure function — no imports from React or Next.js. Testable in any JS runtime.
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: SSEHandlers,
): Promise<void>
```

---

## 5.3 — Implementation

```typescript
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: SSEHandlers,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by double newline
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";  // last item may be incomplete

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data:")) continue;

        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          handlers.onError(new Error(`SSE parse error: ${raw}`));
          continue;
        }

        if (!parsed || typeof parsed !== "object") continue;
        const msg = parsed as Record<string, unknown>;

        if (typeof msg.delta === "string") {
          handlers.onDelta(msg.delta);
        } else if (msg.toolCall) {
          handlers.onToolCall(msg.toolCall as { name: string; args: unknown });
        } else if (msg.toolResult) {
          handlers.onToolResult(msg.toolResult as { name: string; content: string });
        } else if (msg.done) {
          handlers.onDone({
            conversationId: (msg.conversationId as string | null) ?? null,
            sessionId: (msg.sessionId as string | null) ?? null,
          });
        }
      }
    }
  } catch (err) {
    handlers.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
```

---

## 5.4 — Updated `sendMessage`

After extraction, `sendMessage`'s SSE section becomes:

```typescript
const reader = response.body!.getReader();

await parseSSEStream(reader, {
  onDelta(delta) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === streamingIdRef.current
          ? { ...m, content: m.content + delta }
          : m,
      ),
    );
  },
  onDone({ conversationId, sessionId }) {
    if (conversationId) {
      localStorage.setItem("chatConversationId", conversationId);
    }
    if (sessionId) {
      localStorage.setItem("chatSessionId", sessionId);
    }
    setIsStreaming(false);
    streamingIdRef.current = null;
  },
  onToolCall(call) {
    // Future: show tool activity in UI
    console.debug("[Chat] tool call:", call.name);
  },
  onToolResult(result) {
    // Future: show tool result in UI  
    console.debug("[Chat] tool result:", result.name);
  },
  onError(err) {
    console.error("[Chat] SSE error:", err);
    setIsStreaming(false);
    streamingIdRef.current = null;
  },
});
```

---

## 5.5 — File Placement

```
src/lib/
  parse-sse-stream.ts       ← NEW utility

src/lib/__tests__/
  parse-sse-stream.test.ts  ← NEW tests
```

No React imports — this is a plain TypeScript utility. It belongs in `src/lib/`, not `src/components/`.

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Write `parseSSEStream` function | `src/lib/parse-sse-stream.ts` | 30 min |
| T2 | Write comprehensive unit tests | `src/lib/__tests__/parse-sse-stream.test.ts` | 45 min |
| T3 | Replace inline SSE loop in `sendMessage` with `parseSSEStream` call | `chat-widget.tsx` | 20 min |
| T4 | Verify no remaining inline `TextDecoder` / `split('\n\n')` in widget | — | 5 min |

---

## Test Coverage

Tests for `parseSSEStream`:

| Test | Scenario |
|------|----------|
| Calls `onDelta` for each delta frame | Happy path streaming |
| Accumulates partial frames across reads | Chunked delivery |
| Calls `onDone` with conversationId + sessionId | Completion frame |
| Calls `onToolCall` with parsed args | Tool start |
| Calls `onToolResult` with content | Tool complete |
| Calls `onError` on malformed JSON | Error path |
| Handles `[DONE]` sentinel safely | SSE spec edge case |
| Handles empty frames | No crash on blank lines |

---

## Definition of Done

- [ ] `parseSSEStream` exported from `src/lib/parse-sse-stream.ts`
- [ ] No inline `TextDecoder` / `split('\n\n')` / `JSON.parse` in `chat-widget.tsx`
- [ ] 8+ unit tests all passing
- [ ] `npx vitest run` total ≥ 1555/1556 (8 new tests)
- [ ] TypeScript: `npx tsc --noEmit` clean
