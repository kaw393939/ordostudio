# R-11 · DRY: `capturedValues` Helper + `TOOL_NAMES` Constants

**Status:** Not started  
**Audit refs:** UB-1, UB-2  
**Severity:** High (UB-1), Medium (UB-2)  
**Estimated effort:** ~1 hour  

---

## Problem

### UB-1 — `capturedValues` extraction appears in 3 places

The block below is copy-pasted verbatim in `runClaudeAgentLoop`, `runClaudeAgentLoopStream` (both in `llm-anthropic.ts`), and `runOpenAIAgentLoopStream` (`llm-openai.ts`):

```ts
if (
  toolUse.name === "submit_intake" &&
  toolResult && typeof toolResult === "object" &&
  "intake_request_id" in (toolResult as Record<string, unknown>)
) {
  capturedValues.intake_request_id = (toolResult as Record<string, unknown>).intake_request_id;
}
if (
  toolUse.name === "create_booking" &&
  toolResult && typeof toolResult === "object" &&
  "booking_id" in (toolResult as Record<string, unknown>)
) {
  capturedValues.booking_id = (toolResult as Record<string, unknown>).booking_id;
}
```

Adding a third capturable tool requires changes in 3 files. Renaming a tool requires a grep hunt.

### UB-2 — Tool name strings are magic literals

`"submit_intake"` and `"create_booking"` appear as unguarded string literals in `llm-anthropic.ts` and `llm-openai.ts`. The registry defines the canonical names but does not export them. TypeScript cannot catch a typo at these downstream call sites.

---

## Solution

### 1. Export `TOOL_NAMES` from `agent-tools.ts`

```ts
// In agent-tools.ts — near the top, after ToolName union
export const TOOL_NAMES = {
  CONTENT_SEARCH:   "content_search",
  GET_SITE_SETTING: "get_site_setting",
  SUBMIT_INTAKE:    "submit_intake",
  GET_AVAILABLE_SLOTS: "get_available_slots",
  CREATE_BOOKING:   "create_booking",
} as const satisfies Record<string, ToolName>;
```

The `satisfies Record<string, ToolName>` constraint ensures the values stay in sync with the `ToolName` union.

### 2. Extract `extractCapturedValues()` into a shared helper

Create `src/lib/api/agent-capture.ts`:

```ts
import { TOOL_NAMES } from "@/lib/api/agent-tools";

/**
 * Extract well-known values from a tool result into `capturedValues`.
 * Called after every tool execution in both the Claude and OpenAI agent loops.
 *
 * Add entries here when a new tool produces values the route needs
 * to forward to the client (via the SSE `done` frame or DB persistence).
 */
export function extractCapturedValues(
  toolName: string,
  result: unknown,
  capturedValues: Record<string, unknown>,
): void {
  if (!result || typeof result !== "object") return;
  const r = result as Record<string, unknown>;

  if (toolName === TOOL_NAMES.SUBMIT_INTAKE && "intake_request_id" in r) {
    capturedValues.intake_request_id = r.intake_request_id;
  }
  if (toolName === TOOL_NAMES.CREATE_BOOKING && "booking_id" in r) {
    capturedValues.booking_id = r.booking_id;
  }
}
```

### 3. Replace all three inline blocks with the helper

In each of the three functions, remove the duplicated block and add:

```ts
extractCapturedValues(toolName, toolResult, capturedValues);
```

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/api/agent-tools.ts` | Add `export const TOOL_NAMES` |
| `src/lib/api/agent-capture.ts` | **Create** with `extractCapturedValues` |
| `src/lib/llm-anthropic.ts` | Replace both inline capture blocks with helper call |
| `src/lib/llm-openai.ts` | Replace inline capture block with helper call |

---

## Tests to Add / Update

- `src/lib/api/__tests__/agent-capture.test.ts` — **Create**: unit tests for `extractCapturedValues`
  - Known tool, matching key → value captured
  - Known tool, missing key → no mutation
  - Unknown tool → no mutation
  - Null/non-object result → no throw
- `src/lib/llm-anthropic.ts` and `src/lib/__tests__/llm-openai.test.ts` — existing tests should continue to pass (behaviour-preserving refactor)

---

## Acceptance Criteria

- [ ] `TOOL_NAMES` exported from `agent-tools.ts`, values type-constrained to `ToolName`
- [ ] `extractCapturedValues` exists in `agent-capture.ts`
- [ ] The 3 inline capture blocks are removed and replaced with single-line helper calls
- [ ] All existing tests pass
- [ ] `agent-capture.test.ts` passes with ≥4 cases
