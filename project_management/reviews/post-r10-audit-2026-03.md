# Post-R10 Code Audit — Uncle Bob · Grady Booch · Don Knuth
**Date:** 2026-03  
**Git HEAD:** `458348c`  
**Scope:** `route.ts`, `llm-anthropic.ts`, `llm-openai.ts`, `agent-tools.ts`  
**Test baseline:** 1615/1616  

This audit applies three lenses to the post-refactor codebase. All ten chat-refactor sprints (R-01–R-10) are complete. The code is in notably better shape than the pre-refactor baseline. The findings below represent the next layer of quality work.

---

## Lens 1 — Uncle Bob Martin (Clean Code / DRY / SRP)

### Finding UB-1 · `capturedValues` extraction is copy-pasted three times
**Severity: High**

The block that checks `toolUse.name === "submit_intake"` and `toolUse.name === "create_booking"` and writes into `capturedValues` appears verbatim in three separate functions:

| File | Function |
|---|---|
| `src/lib/llm-anthropic.ts` | `runClaudeAgentLoop` (~line 278) |
| `src/lib/llm-anthropic.ts` | `runClaudeAgentLoopStream` (~line 443) |
| `src/lib/llm-openai.ts` | `runOpenAIAgentLoopStream` (~line 182) |

Adding a third capturable tool (e.g. `create_invoice`) requires editing three files. Renaming `submit_intake` requires a grep hunt. The logic should live in a single `extractCapturedValues(toolName, result, capturedValues)` helper. **Tracked as R-11.**

---

### Finding UB-2 · Tool name strings are magic literals scattered across 3 files
**Severity: Medium**

`"submit_intake"` and `"create_booking"` are first-class strings in the `TOOL_REGISTRY` (keys and `name` fields), but the registry never exports them as constants. Downstream modules (`llm-anthropic.ts`, `llm-openai.ts`) conjure these strings from memory.

Result: TypeScript cannot catch a typo like `"submit_intakee"` at these call sites. The registry should export:
```ts
export const TOOL_NAMES = {
  SUBMIT_INTAKE: "submit_intake",
  CREATE_BOOKING: "create_booking",
  // ...
} as const;
```
**Tracked as R-11.**

---

### Finding UB-3 · `buildClaudeStreamingResponse` and `buildOAIStreamingResponse` are ~90% identical
**Severity: High**

Both functions contain all of the following, character-for-character identical:

- `const encoder = new TextEncoder()`
- `new ReadableStream<Uint8Array>({ async start(controller) { ... } })`  
- `let assistantText = ""`
- `onDelta`, `onToolCall`, `onToolResult` callback wiring (18 identical lines)
- `persistAssistantMessage(db, conversation, messages, assistantText, intakeRequestId)`
- `sseChunk({ done: true, conversation_id: ..., intake_submitted: ... })`
- `controller.close()`
- `catch { controller.error(new Error("stream failed")) }`
- `finally { db.close() }`
- Response constructor with identical headers

The only differences are: (1) how the message array is built (Anthropic vs OpenAI format), (2) which loop function is called, (3) the Claude path passes extra parameters (attachments, anthropicKey).

These should be unified into a single `buildStreamingResponse(loopFn, buildMessages, extraParams)` factory or a shared `runStreamingLoop` inner function. **Tracked as R-12.**

---

### Finding UB-4 · `MAX_AGENT_TOKENS` values are undocumented and asymmetric
**Severity: Low-Medium**

```ts
// llm-anthropic.ts
const MAX_AGENT_TOKENS = 2048;   // ← 2 048

// llm-openai.ts
const MAX_AGENT_TOKENS = 4096;   // ← 4 096
```

The 2× difference is undocumented. A maintainer cannot tell if this is intentional (e.g. "Claude sonnet responses are shorter by design") or a copy-paste error. A shared `MODEL_LIMITS` constant or a comment explaining the asymmetry is required. **Tracked as R-14.**

---

### Finding UB-5 · `buildOAIStreamingResponse` contains inline message-mapping logic
**Severity: Low**

```ts
const oaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = params.messages.map((m) => {
  if (m.role === "tool") {
    return { role: "tool", content: m.content, tool_call_id: m.tool_call_id ?? "" };
  }
  // ...
});
```

This 9-line mapping block sits inline in the route builder. It should be extracted as `toOAIMessages(messages: ConversationMessage[]): ChatCompletionMessageParam[]` in a shared location. The `?? ""` fallback (see Correctness below) is also buried here invisibly. **Tracked as R-12 cleanup subtask.**

---

## Lens 2 — Grady Booch (Architecture / Decomposition / Responsibility)

### Finding GB-1 · `resolveConversationContext` is data-access logic embedded in the route
**Severity: Medium**

`resolveConversationContext(db, request)` executes two SQL queries (referral lookup, user display_name lookup) and returns a `ConversationContext` struct. This function has no routing responsibility. It belongs in `src/lib/api/conversation-store.ts` alongside the other conversation-scoped DB operations (`loadOrCreateConversation`, `persistAssistantMessage`).

The route file should be an orchestrator — it should call `getConversationContext(db, request)` from the store, not own the SQL. **Tracked as R-13.**

---

### Finding GB-2 · `runClaudeAgentLoop` (batch) is dead code
**Severity: Medium**

`route.ts` exclusively calls `runClaudeAgentLoopStream`. The batch `runClaudeAgentLoop` exported from `llm-anthropic.ts` is 120 lines that are not called from any production path. Its continued presence:

- Creates a false impression that there's a non-streaming code path
- Forces both functions to each duplicate the `capturedValues` extraction block (UB-1)
- Must be maintained whenever the interface changes

Per the single-responsibility principle: a module should not contain what is not needed. This function should be deleted or moved to a test-utility file if it's genuinely used in tests. **Tracked as R-13.**

---

### Finding GB-3 · `getOpenAIClient()` module-level singleton impedes testability
**Severity: Medium**

```ts
let _openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}
```

The `_openaiClient` is module-level shared state. Tests must use class-based `vi.mock('openai')` (replacing the constructor globally) to avoid touching the real API. There is no way to inject a test double without module-level mocking.

A factory pattern (`createOpenAIClient(apiKey)`) passed via the `OAIAgentLoopOptions`, or simply passing `client` as an optional parameter to `runOpenAIAgentLoopStream`, would allow tests to inject a mock directly: `runOpenAIAgentLoopStream({ ..., client: mockClient })`. **Tracked as R-13.**

---

### Finding GB-4 · `AGENT_TOOL_DEFINITIONS_OPENAI` re-derives what `AgentToolDefinition` already expresses
**Severity: Low**

`AgentToolDefinition` has the shape:
```ts
{ type: "function"; function: { name, description, parameters } }
```

`OpenAI.Chat.ChatCompletionTool` has the shape:
```ts
{ type: "function"; function: { name, description, parameters } }
```

They are structurally identical. `AGENT_TOOL_DEFINITIONS_OPENAI` only exists to carry the OpenAI type annotation. The `runOpenAIAgentLoopStream` function then re-maps them _again_ locally (lines 95-102). One of these mappings is redundant.

Either: (1) make `AgentToolDefinition` extend/implement the OpenAI type, or (2) use `AgentToolDefinition[]` directly where OpenAI tools are expected and let TypeScript's structural typing handle it. The intermediate derived export + local re-map are architecture noise. **Tracked as R-13.**

---

## Lens 3 — Don Knuth (Algorithmic Correctness / Precision)

### Finding DK-1 · `booking_id` is captured but never forwarded to the client
**Severity: High**

Both streaming builders emit the final SSE `done` frame as:
```ts
sseChunk({
  done: true,
  conversation_id: conversation.id,
  intake_submitted: intakeRequestId !== null,
})
```

`capturedValues.booking_id` is collected during tool execution, stored in `streamResult.capturedValues`, and then discarded. The client has no way to know whether a booking was confirmed, which booking ID was created, or whether the booking step succeeded or conflicted.

The `done` frame should include:
```ts
{
  done: true,
  conversation_id: conversation.id,
  intake_submitted: intakeRequestId !== null,
  booking_confirmed: typeof streamResult.capturedValues.booking_id === "string",
  booking_id: streamResult.capturedValues.booking_id ?? null,
}
```
**Tracked as R-14.**

---

### Finding DK-2 · `tool_call_id: m.tool_call_id ?? ""` is an invalid fallback
**Severity: Medium**

In `buildOAIStreamingResponse`:
```ts
if (m.role === "tool") {
  return { role: "tool", content: m.content, tool_call_id: m.tool_call_id ?? "" };
}
```

The OpenAI API requires `tool_call_id` to be a non-empty string that matches a `tool_calls[].id` from a prior assistant message. Sending `tool_call_id: ""` will cause a 422/400 from the API.

This fallback is never triggered in the current prod path (conversation-store persists `tool_call_id` when role is `"tool"`). But it's a silent trap: if a `ConversationMessage` is ever created with a missing `tool_call_id`, the error will manifest as an opaque OpenAI API failure rather than a clear local assertion.

Instead: `if (!m.tool_call_id) throw new Error("tool message is missing tool_call_id")`. **Tracked as R-14.**

---

### Finding DK-3 · Silent catch swallows the original error
**Severity: Medium**

Both streaming builders (and any future ones that follow the same pattern):
```ts
} catch {
  controller.error(new Error("stream failed"));
}
```

The original exception — which may contain API error details, rate limit information, or tool execution context — is discarded. In production, this produces `"stream failed"` with no stack and no cause. Debugging requires correlating server logs (if any) with a client-visible stream error.

Minimum fix:
```ts
} catch (err) {
  console.error("[ChatStream] stream error:", err);
  controller.error(err instanceof Error ? err : new Error(String(err)));
}
```
**Tracked as R-14.**

---

### Finding DK-4 · `stream.finalMessage()` after exhausted iterator — undocumented assumption
**Severity: Low**

In `runOpenAIAgentLoopStream`:
```ts
for await (const chunk of stream) {
  // exhausts the async iterator
}
const final = await stream.finalMessage();  // called on already-consumed stream
```

This works because the OpenAI SDK's streaming wrapper accumulates chunks in `stream._messageSnapshot` and resolves `finalMessage()` from that accumulated state regardless of whether the iterator was consumed. This is internal SDK behaviour, not a documented contract.

A comment is required:
```ts
// stream.finalMessage() is safe here even after for-await exhaustion: the OpenAI
// SDK's stream wrapper accumulates chunks internally and returns the final message
// from its internal snapshot, not by re-reading the network connection.
```
**Tracked as R-14.**

---

## Summary Table

| ID | Lens | Severity | Sprint | Title |
|---|---|---|---|---|
| UB-1 | Uncle Bob | High | R-11 | Extract `extractCapturedValues` helper |
| UB-2 | Uncle Bob | Medium | R-11 | Export `TOOL_NAMES` constants from registry |
| UB-3 | Uncle Bob | High | R-12 | Unify `buildClaudeStreamingResponse` + `buildOAIStreamingResponse` |
| UB-4 | Uncle Bob | Low-Med | R-14 | Document / reconcile `MAX_AGENT_TOKENS` asymmetry |
| UB-5 | Uncle Bob | Low | R-12 | Extract `toOAIMessages()` helper |
| GB-1 | Booch | Medium | R-13 | Move `resolveConversationContext` to `conversation-store.ts` |
| GB-2 | Booch | Medium | R-13 | Delete dead `runClaudeAgentLoop` batch function |
| GB-3 | Booch | Medium | R-13 | OpenAI client injectable / factory pattern |
| GB-4 | Booch | Low | R-13 | Remove redundant `AGENT_TOOL_DEFINITIONS_OPENAI` re-mapping |
| DK-1 | Knuth | High | R-14 | Forward `booking_id` in SSE `done` frame |
| DK-2 | Knuth | Medium | R-14 | Fix invalid `tool_call_id: ""` fallback |
| DK-3 | Knuth | Medium | R-14 | Preserve original error in stream catch |
| DK-4 | Knuth | Low | R-14 | Document `stream.finalMessage()` post-exhaust assumption |

---

## What Is Working Well

- **R-09 ToolRegistry**: Compile-time `ToolName` union + Zod validation is clean. Single source of truth for tool definitions is well-executed.
- **DB ownership model**: The transfer-to-stream pattern with `finally { db.close() }` is correct and consistently applied.
- **`chat-widget.tsx`**: Clean compositor pattern, correct `useCallback` deps, no React anti-patterns.
- **`rate-limiter.ts`, `chat-body-parser.ts`, `attachment-builder.ts`**: R-07 helpers are focused, single-purpose, and well-tested.
- **`buildSystemPrompt`**: Pure function, no side effects, good composition.
- **Zod 4 integration**: `safeParse` in `executeAgentTool` with detailed error reporting is correct.
