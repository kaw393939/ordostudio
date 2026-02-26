/**
 * agent-capture.ts — R-11 shared helper for extracting tool result values
 *
 * Centralises the logic that watches tool results for well-known keys
 * (intake_request_id, booking_id) and writes them into `capturedValues`.
 *
 * Previously this block was copy-pasted in three agent loop functions:
 *   - runClaudeAgentLoop (llm-anthropic.ts) — used by evals/runner.ts
 *   - runClaudeAgentLoopStream (llm-anthropic.ts)
 *   - runOpenAIAgentLoopStream (llm-openai.ts)
 *
 * To expose a new value, add a single entry here. The three loop functions
 * all call this one helper.
 */

import { TOOL_NAMES } from "@/lib/api/agent-tools";

/**
 * Inspect a tool result and copy well-known values into `capturedValues`.
 *
 * Called after every tool execution in both the Claude and OpenAI agent loops.
 *
 * @param toolName     - The name of the tool that was just executed.
 * @param result       - The raw value returned by the tool executor.
 * @param capturedValues - Mutable accumulator that persists across tool rounds.
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
