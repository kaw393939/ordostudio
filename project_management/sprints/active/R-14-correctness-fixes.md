# R-14 · Correctness: `booking_id` Forwarding + Error Propagation + `MAX_AGENT_TOKENS` + SDK Comment

**Status:** Not started  
**Audit refs:** DK-1, DK-2, DK-3, DK-4, UB-4  
**Severity:** High (DK-1), Medium (DK-2, DK-3), Low (DK-4, UB-4)  
**Estimated effort:** ~1.5 hours  
**Depends on:** R-12 is preferred first (fixes `done` frame in one shared place)

---

## Problem

### DK-1 — `booking_id` is captured but never forwarded to the client

Both `buildClaudeStreamingResponse` and `buildOAIStreamingResponse` emit:
```ts
sseChunk({ done: true, conversation_id: ..., intake_submitted: ... })
```

`streamResult.capturedValues.booking_id` — populated when `create_booking` succeeds — is silently discarded. The frontend has no way to:
- Show a booking confirmation to the user
- Know whether to render a "booking confirmed" state vs. "intake submitted" state
- Link to a booking receipt

### DK-2 — `tool_call_id: m.tool_call_id ?? ""` is an invalid fallback

In `buildOAIStreamingResponse`:
```ts
if (m.role === "tool") {
  return { role: "tool", content: m.content, tool_call_id: m.tool_call_id ?? "" };
}
```

OpenAI requires `tool_call_id` to be a non-empty string matching a prior assistant `tool_calls[].id`. An empty string will cause a 400 from the OpenAI API. The fallback silently masks a data integrity problem.

### DK-3 — Silent catch discards the original error

Both streaming builders:
```ts
} catch {
  controller.error(new Error("stream failed"));
}
```

The original exception (API error, DB error, rate limit, etc.) is silently dropped. Debugging production failures is impossible without correlating unrelated server logs.

### DK-4 — `stream.finalMessage()` after exhausted iterator is undocumented

```ts
for await (const chunk of stream) { ... }  // iterates to end
const final = await stream.finalMessage(); // called after exhaustion
```

This works because the OpenAI SDK accumulates chunks internally. It's not a documented public contract. A future SDK major version could break this silently.

### UB-4 — `MAX_AGENT_TOKENS` asymmetry is undocumented

`llm-anthropic.ts` uses 2048; `llm-openai.ts` uses 4096. No comment explains the intentional difference or whether it was a mistake.

---

## Solution

### DK-1 — Add `booking_confirmed` and `booking_id` to the `done` frame

**In `buildStreamingResponse` (after R-12) or in both builders (before R-12):**

```ts
controller.enqueue(encoder.encode(sseChunk({
  done: true,
  conversation_id: conversation.id,
  intake_submitted: intakeRequestId !== null,
  booking_confirmed: typeof result.capturedValues.booking_id === "string",
  booking_id: result.capturedValues.booking_id ?? null,
})));
```

Update the SSE `done` frame TypeScript type / interface comment to document these fields.

### DK-2 — Replace `?? ""` fallback with an assertion

**In `toOAIMessages()` (R-12) or inline in `buildOAIStreamingResponse`:**

```ts
if (m.role === "tool") {
  if (!m.tool_call_id) {
    throw new Error(
      `[toOAIMessages] tool message missing tool_call_id — data integrity error. ` +
      `content: "${m.content.slice(0, 40)}"`
    );
  }
  return { role: "tool", content: m.content, tool_call_id: m.tool_call_id };
}
```

This converts a silent contract violation into an explicit, locally diagnosed error.

### DK-3 — Preserve the original error

**In both streaming builders (or in `buildStreamingResponse` after R-12):**

```ts
} catch (err) {
  console.error("[ChatStream] stream error:", err);
  controller.error(err instanceof Error ? err : new Error(String(err)));
}
```

Passing the original error (or a wrapping Error) to `controller.error()` also propagates it to any AbortSignal listeners and gives the browser a more meaningful error event.

### DK-4 — Add explanatory comment in `llm-openai.ts`

```ts
// stream.finalMessage() is safe here even after the for-await loop exhausts the
// async iterator. The OpenAI SDK's Stream wrapper accumulates all chunks in an
// internal snapshot and resolves finalMessage() from that state — it does NOT
// attempt to re-read the network connection.
// Ref: openai-node/src/lib/streaming.ts — `_messageSnapshot` accumulation
const final = await stream.finalMessage();
```

### UB-4 — Document the `MAX_AGENT_TOKENS` asymmetry

**In `llm-anthropic.ts`:**
```ts
// Claude sonnet output cap: 2 048 tokens is sufficient for structured intake
// conversations and keeps latency predictable. Claude's default max is 8 192.
const MAX_AGENT_TOKENS = 2048;
```

**In `llm-openai.ts`:**
```ts
// GPT-4o-mini output cap: 4 096 tokens. Intentionally higher than the Claude cap
// because GPT-4o-mini tends toward verbose tool-use responses and the model's
// default max is 16 384. Align this with the Claude cap if response length parity
// is required.
const MAX_AGENT_TOKENS = 4096;
```

---

## Files to Change

| File | Change |
|---|---|
| `src/app/api/v1/agent/chat/route.ts` (or `buildStreamingResponse`) | Add `booking_confirmed`/`booking_id` to `done` frame; preserve error in catch |
| `src/lib/api/message-adapters.ts` (R-12) or `route.ts` | Replace `?? ""` with assertion |
| `src/lib/llm-openai.ts` | Add `stream.finalMessage()` comment; add `MAX_AGENT_TOKENS` comment |
| `src/lib/llm-anthropic.ts` | Add `MAX_AGENT_TOKENS` comment |

---

## Tests to Add / Update

- **SSE `done` frame** — add a test asserting `booking_confirmed: true` and `booking_id` in the done frame when `create_booking` is called (integration test for `route.ts` or unit test mocking `runClaudeAgentLoopStream`)
- **`toOAIMessages` throw** — covered in R-12's `message-adapters.test.ts`
- **Error propagation** — test that when `runClaudeAgentLoopStream` throws, the stream's error event carries the original error message (not `"stream failed"`)

---

## Acceptance Criteria

- [ ] SSE `done` frame includes `booking_confirmed` (boolean) and `booking_id` (string | null)
- [ ] No `?? ""` fallback for `tool_call_id`; missing `tool_call_id` throws with diagnostic message
- [ ] Both streaming catch blocks log and re-throw the original error
- [ ] `stream.finalMessage()` post-exhaustion assumption has an explanatory comment
- [ ] Both `MAX_AGENT_TOKENS` constants have comments explaining the value and the asymmetry
- [ ] All existing tests pass
- [ ] New tests for `done` frame `booking_id` forwarding pass
