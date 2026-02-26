# R-13 · Architecture: Dead Code Removal + `resolveConversationContext` Relocation + OAI Client Seam

**Status:** Not started  
**Audit refs:** GB-1, GB-2, GB-3, GB-4  
**Severity:** Medium (GB-1, GB-2, GB-3), Low (GB-4)  
**Estimated effort:** ~2 hours  
**Depends on:** None (independent of R-11, R-12, R-14)

---

## Problem

### GB-1 — `resolveConversationContext` is data-access logic embedded in `route.ts`

`resolveConversationContext(db, request)` runs two SQL queries against the DB and returns a context struct for the system prompt. Route files should be orchestrators. SQL belongs in the repository layer (`conversation-store.ts`).

### GB-2 — `runClaudeAgentLoop` is dead code

`route.ts` calls only `runClaudeAgentLoopStream`. The 120-line batch `runClaudeAgentLoop` function is not invoked from any production code path. It is a maintenance liability and a source of the `capturedValues` duplication fixed in R-11.

Verify before deletion: `grep -r "runClaudeAgentLoop[^S]" src/` should return zero production call sites (tests that use it are acceptable — but if none exist, delete entirely).

### GB-3 — `getOpenAIClient()` module-level singleton blocks clean testing

The `_openaiClient` held at module scope requires global constructor mocking in tests. An injectable seam would allow `runOpenAIAgentLoopStream` to accept an optional `client` parameter.

### GB-4 — `AGENT_TOOL_DEFINITIONS_OPENAI` re-derives what structural typing provides for free

`AgentToolDefinition` is structurally identical to `OpenAI.Chat.ChatCompletionTool`. Additionally, `runOpenAIAgentLoopStream` re-maps `AgentToolDefinition[]` to `ChatCompletionTool[]` locally (lines 95-102 of `llm-openai.ts`). This produces two redundant derivations.

---

## Solution

### 1. Move `resolveConversationContext` to `conversation-store.ts`

Move the function and its `ConversationContext` interface from `route.ts` to `src/lib/api/conversation-store.ts`:

```ts
// In conversation-store.ts

export interface ConversationContext {
  referrerName: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
}

export function resolveConversationContext(
  db: ReturnType<typeof openCliDb>,
  request: NextRequest,
): ConversationContext {
  // ... exact same implementation ...
}
```

Update `route.ts` to import it:
```ts
import {
  loadOrCreateConversation,
  persistAssistantMessage,
  resolveConversationContext,
  // ...
} from "@/lib/api/conversation-store";
```

### 2. Delete `runClaudeAgentLoop` (batch)

Before deleting, confirm no production callers:
```bash
grep -rn "runClaudeAgentLoop[^S]" src/ --include="*.ts" --include="*.tsx"
```

If only test files reference it (or zero files), remove the function and its return type interface from `llm-anthropic.ts`. Export only `runClaudeAgentLoopStream`.

If tests do meaningfully use the batch function for unit testing tool execution, move it to `src/lib/__tests__/test-helpers/` rather than deleting.

### 3. Add optional `client` parameter to `runOpenAIAgentLoopStream`

```ts
export interface OAIAgentLoopOptions {
  systemPrompt: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  tools: AgentToolDefinition[];
  executeToolFn: (name: string, args: unknown) => Promise<unknown>;
  maxToolRounds?: number;
  callbacks: OAIStreamCallbacks;
  /** Optional: inject a client for testing. Falls back to getOpenAIClient(). */
  client?: OpenAI;
}

export async function runOpenAIAgentLoopStream(
  options: OAIAgentLoopOptions,
): Promise<OAIAgentLoopStreamResult> {
  const client = options.client ?? getOpenAIClient();
  // ...
}
```

This allows tests to pass a mock client directly instead of using `vi.mock`:
```ts
const result = await runOpenAIAgentLoopStream({
  ...,
  client: mockOpenAIClient,
});
```

The `_openaiClient` singleton and `getOpenAIClient()` can remain for production use (no breaking change).

### 4. Remove local `oaiTools` re-mapping in `runOpenAIAgentLoopStream`

In `llm-openai.ts`, the local mapping:
```ts
const oaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map((def) => ({
  type: "function" as const,
  function: { name: def.function.name, description: def.function.description, parameters: def.function.parameters },
}));
```
...is redundant because `AgentToolDefinition` is structurally compatible with `ChatCompletionTool`.

Change the `tools` parameter type to `AgentToolDefinition[]` and cast inline:
```ts
tools: tools as OpenAI.Chat.ChatCompletionTool[],
```

Or demonstrate the structural compatibility more explicitly:
```ts
// AgentToolDefinition is structurally identical to ChatCompletionTool — direct cast is safe
const oaiTools = tools as unknown as OpenAI.Chat.ChatCompletionTool[];
```

Also remove `AGENT_TOOL_DEFINITIONS_OPENAI` from `agent-tools.ts` if no callers remain after this change. Update import in `route.ts` to use `AGENT_TOOL_DEFINITIONS` for the OAI path as well.

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/api/conversation-store.ts` | Add `ConversationContext` + `resolveConversationContext` |
| `src/app/api/v1/agent/chat/route.ts` | Remove `resolveConversationContext`, remove `ConversationContext`; import from store |
| `src/lib/llm-anthropic.ts` | Delete `runClaudeAgentLoop` + `ClaudeAgentTurnResult` (if no callers) |
| `src/lib/llm-openai.ts` | Add `client?` to options; remove local `oaiTools` re-mapping |
| `src/lib/api/agent-tools.ts` | Remove `AGENT_TOOL_DEFINITIONS_OPENAI` if no callers remain |

---

## Tests to Add / Update

- `resolveConversationContext` — add unit tests in `src/lib/api/__tests__/conversation-store.test.ts` (or keep existing coverage; verify it's exercised)
- `runOpenAIAgentLoopStream` tests — refactor to use `client` injection instead of `vi.mock("openai")`; results in cleaner, more targeted tests
- `llm-anthropic.test.ts` — if `runClaudeAgentLoop` tests exist, evaluate whether they can be re-expressed as `runClaudeAgentLoopStream` tests

---

## Acceptance Criteria

- [ ] `resolveConversationContext` lives in `conversation-store.ts`, not `route.ts`
- [ ] `runClaudeAgentLoop` is deleted (or archived to test-helpers) with zero production callers
- [ ] `runOpenAIAgentLoopStream` accepts optional `client` param; existing tests converted from `vi.mock`
- [ ] Local `oaiTools` re-mapping removed from `llm-openai.ts`
- [ ] `AGENT_TOOL_DEFINITIONS_OPENAI` removed from `agent-tools.ts` if unused
- [ ] All existing tests pass
