# R-12 · DRY: Unified Streaming Builder + `toOAIMessages` Extraction

**Status:** Not started  
**Audit refs:** UB-3, UB-5  
**Severity:** High (UB-3), Low (UB-5)  
**Estimated effort:** ~2 hours  
**Depends on:** R-11 (pass `extractCapturedValues` through; not strictly blocking but cleaner after R-11)

---

## Problem

### UB-3 — `buildClaudeStreamingResponse` and `buildOAIStreamingResponse` are ~90% identical

The two functions in `route.ts` share all of the following:

```ts
const encoder = new TextEncoder()
new ReadableStream<Uint8Array>({ async start(controller) {
  let assistantText = ""
  // ...
  onDelta(text) { assistantText += text; controller.enqueue(...sseChunk({delta})) }
  onToolCall(name, args) { controller.enqueue(...sseChunk({tool_call})) }
  onToolResult(name, result) { controller.enqueue(...sseChunk({tool_result})) }
  // ...
  persistAssistantMessage(db, conversation, messages, assistantText, intakeRequestId)
  controller.enqueue(...sseChunk({ done: true, conversation_id: ..., intake_submitted: ... }))
  controller.close()
} catch { controller.error(new Error("stream failed")) }
  finally { db.close() }
})
return new Response(responseStream, { headers: { "Content-Type": "text/event-stream", ... } })
```

The only functional differences:
1. Extra parameters on the Claude path: `userMessage`, `userContentBlocks`, `anthropicKey`
2. Which loop function is called: `runClaudeAgentLoopStream` vs `runOpenAIAgentLoopStream`
3. The Claude path passes `AgentToolDefinition[]`; OpenAI needs the same (no difference post-R-11/R-13)

### UB-5 — Inline OAI message mapping

The 9-line `oaiMessages` mapping block in `buildOAIStreamingResponse` is embedded inline with a silent `?? ""` fallback on `tool_call_id` (correctness issue addressed in R-14). It should be a named function.

---

## Solution

### 1. Extract `toOAIMessages()` helper

In `src/lib/api/conversation-store.ts` (or a new `src/lib/api/message-adapters.ts`):

```ts
import type OpenAI from "openai";
import type { ConversationMessage } from "./conversation-store";

export function toOAIMessages(
  messages: ConversationMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      if (!m.tool_call_id) {
        throw new Error(
          `[toOAIMessages] tool message is missing tool_call_id (content: ${m.content.slice(0, 40)})`,
        );
      }
      return { role: "tool", content: m.content, tool_call_id: m.tool_call_id };
    }
    if (m.role === "assistant") return { role: "assistant", content: m.content };
    return { role: "user", content: m.content };
  });
}
```

Note: the `?? ""` silent fallback is intentionally replaced with a throw here (R-14 correctness fix applied together).

### 2. Extract shared streaming core into `runStreamingLoop()`

Define a private function in `route.ts`:

```ts
type AgentLoopFn = (callbacks: {
  onDelta: (text: string) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => void;
  onToolResult: (name: string, result: unknown) => void;
}) => Promise<{ capturedValues: Record<string, unknown> }>;

function buildStreamingResponse(params: {
  db: ReturnType<typeof openCliDb>;
  conversation: ConversationRow;
  messages: ConversationMessage[];
  runLoop: AgentLoopFn;
}): Response {
  const { db, conversation, messages } = params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      try {
        const result = await params.runLoop({
          onDelta(text) {
            assistantText += text;
            controller.enqueue(encoder.encode(sseChunk({ delta: text })));
          },
          onToolCall(name, args) {
            controller.enqueue(encoder.encode(sseChunk({ tool_call: { name, args } })));
          },
          onToolResult(name, result) {
            controller.enqueue(encoder.encode(sseChunk({ tool_result: { name, result } })));
          },
        });

        const intakeRequestId =
          typeof result.capturedValues.intake_request_id === "string"
            ? result.capturedValues.intake_request_id
            : (conversation.intake_request_id ?? null);

        persistAssistantMessage(db, conversation, messages, assistantText, intakeRequestId);

        controller.enqueue(encoder.encode(sseChunk({
          done: true,
          conversation_id: conversation.id,
          intake_submitted: intakeRequestId !== null,
          booking_confirmed: typeof result.capturedValues.booking_id === "string",
          booking_id: result.capturedValues.booking_id ?? null,
        })));
        controller.close();
      } catch (err) {
        console.error("[ChatStream] stream error:", err);
        controller.error(err instanceof Error ? err : new Error(String(err)));
      } finally {
        db.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Conversation-Id": conversation.id,
    },
  });
}
```

### 3. Rewrite `buildClaudeStreamingResponse` and `buildOAIStreamingResponse` as thin wrappers

```ts
function buildClaudeStreamingResponse(params: { ... }): Response {
  const priorTextMessages = /* ... same as now ... */;
  return buildStreamingResponse({
    db: params.db,
    conversation: params.conversation,
    messages: params.messages,
    runLoop: (callbacks) => runClaudeAgentLoopStream({
      apiKey: params.anthropicKey,
      systemPrompt: params.systemPrompt,
      history: priorTextMessages,
      userMessage: params.userMessage,
      userContentBlocks: params.userContentBlocks.length > 0 ? params.userContentBlocks : undefined,
      tools: AGENT_TOOL_DEFINITIONS,
      executeToolFn: async (name, args) => executeAgentTool(name, args, params.db),
      maxToolRounds: MAX_TOOL_ROUNDS,
      callbacks,
    }),
  });
}

function buildOAIStreamingResponse(params: { ... }): Response {
  const oaiMessages = toOAIMessages(params.messages);
  return buildStreamingResponse({
    db: params.db,
    conversation: params.conversation,
    messages: params.messages,
    runLoop: (callbacks) => runOpenAIAgentLoopStream({
      systemPrompt: params.systemPrompt,
      messages: oaiMessages,
      tools: AGENT_TOOL_DEFINITIONS,
      executeToolFn: async (name, args) => executeAgentTool(name, args, params.db),
      maxToolRounds: MAX_TOOL_ROUNDS,
      callbacks,
    }),
  });
}
```

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/api/message-adapters.ts` | **Create**: `toOAIMessages()` |
| `src/app/api/v1/agent/chat/route.ts` | Extract `buildStreamingResponse`, rewrite two builder functions as thin wrappers |

---

## Tests to Add / Update

- `src/lib/api/__tests__/message-adapters.test.ts` — **Create**
  - `toOAIMessages` with user/assistant/tool messages → correct format
  - `toOAIMessages` with tool message missing `tool_call_id` → throws
- `route.ts` integration tests — existing should pass (behaviour-preserving)
- Note: `buildStreamingResponse` and `booking_id` forwarding overlap with R-14 — implement together

---

## Acceptance Criteria

- [ ] `buildStreamingResponse` exists; both builder functions delegate to it
- [ ] `toOAIMessages` is a named exported function (not inline in route)
- [ ] No `?? ""` fallback on `tool_call_id` anywhere
- [ ] `done` frame forwarding updated (coordinate with R-14 DK-1 fix)
- [ ] All existing tests pass
- [ ] `message-adapters.test.ts` passes
