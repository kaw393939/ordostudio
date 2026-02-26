/**
 * llm-openai.ts — R-10 OpenAI streaming agent loop
 *
 * Mirrors the shape of `runClaudeAgentLoopStream` in llm-anthropic.ts:
 *   - Module-level client singleton
 *   - Real token streaming via `client.chat.completions.stream()`
 *   - Captures `intake_request_id` and `booking_id` from tool results
 *   - Returns `{ toolEvents, capturedValues }` — caller accumulates streamed text
 */

import OpenAI from "openai";
import type { AgentToolDefinition } from "@/lib/api/agent-tools";
import type { ToolEvent } from "@/lib/llm-anthropic";
import { extractCapturedValues } from "@/lib/api/agent-capture";

// ---------------------------------------------------------------------------
// Module-level singleton — mirrors getAnthropicClient() pattern from R-08
// ---------------------------------------------------------------------------

let _openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}

// ---------------------------------------------------------------------------
// Callback + options types — parallel to ClaudeStreamCallbacks
// ---------------------------------------------------------------------------

export interface OAIStreamCallbacks {
  /** Called for each streaming text delta from the model. */
  onDelta: (text: string) => void;
  /** Called when a tool is invoked (before execution). */
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  /** Called after a tool finishes executing. */
  onToolResult?: (name: string, result: unknown) => void;
}

export interface OAIAgentLoopOptions {
  systemPrompt: string;
  /** Full message history in OpenAI format, including the latest user turn. */
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  tools: AgentToolDefinition[];
  executeToolFn: (name: string, args: unknown) => Promise<unknown>;
  maxToolRounds?: number;
  callbacks: OAIStreamCallbacks;
  /**
   * Optional: inject an OpenAI client for testing.
   * Falls back to the module-level singleton from getOpenAIClient().
   */
  client?: OpenAI;
}

export interface OAIAgentLoopStreamResult {
  toolEvents: ToolEvent[];
  capturedValues: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Streaming agent loop
// ---------------------------------------------------------------------------

// GPT-4o-mini output cap: 4 096 tokens. Intentionally higher than the Claude cap
// (2 048) because GPT-4o-mini tends toward more verbose tool-use responses and
// the model's default max is 16 384. Align with the Claude cap if response-length
// parity across providers is required.
const MAX_AGENT_TOKENS = 4096;

/**
 * Run the OpenAI conversational agent with real token streaming.
 *
 * Fires `callbacks.onDelta` for each text token as it arrives.
 * Tool calls are collected from `stream.finalMessage()` and executed
 * synchronously between streaming rounds.
 *
 * Returns `{ toolEvents, capturedValues }` — same contract as
 * `runClaudeAgentLoopStream`, so route.ts can call both uniformly.
 */
export async function runOpenAIAgentLoopStream(
  options: OAIAgentLoopOptions,
): Promise<OAIAgentLoopStreamResult> {
  const {
    systemPrompt,
    messages,
    tools,
    executeToolFn,
    maxToolRounds = 4,
    callbacks,
  } = options;

  const client = options.client ?? getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  // AgentToolDefinition is structurally identical to ChatCompletionTool — direct cast is safe.
  // Both shapes are: { type: "function"; function: { name, description, parameters } }
  const oaiTools = tools as unknown as OpenAI.Chat.ChatCompletionTool[];

  const history: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const toolEvents: ToolEvent[] = [];
  const capturedValues: Record<string, unknown> = {};
  let round = 0;

  while (round < maxToolRounds) {
    round++;

    // Start a streaming request
    const stream = client.chat.completions.stream({
      model,
      max_tokens: MAX_AGENT_TOKENS,
      messages: history,
      tools: oaiTools,
      tool_choice: "auto",
    });

    // Fire onDelta for each text token as it arrives
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        callbacks.onDelta(delta.content);
      }
    }

    // finalMessage() is typed as returning ChatCompletionMessage, but the SDK
    // stream accumulator actually returns the full ChatCompletion shape at runtime.
    // The mock in tests also returns { choices: [...] } from finalMessage().
    const final = (await stream.finalMessage()) as unknown as {
      choices: Array<{
        finish_reason: string;
        message: OpenAI.Chat.ChatCompletionMessage & {
          tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
        };
      }>;
    };
    const choice = final.choices[0];
    const assistantMessage = choice.message;

    if (
      choice.finish_reason !== "tool_calls" ||
      !assistantMessage.tool_calls?.length
    ) {
      // No tool calls — this is the final response
      break;
    }

    // Append assistant turn (with tool_calls) to history
    history.push({
      role: "assistant",
      content: assistantMessage.content ?? null,
      tool_calls:
        assistantMessage.tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[],
    });

    // Execute each tool call
    for (const tc of assistantMessage.tool_calls.filter(
      (t): t is OpenAI.Chat.ChatCompletionMessageFunctionToolCall =>
        t.type === "function",
    )) {
      let toolArgs: Record<string, unknown>;
      try {
        toolArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        toolArgs = {};
      }

      toolEvents.push({ type: "tool_call", name: tc.function.name, args: toolArgs });
      callbacks.onToolCall?.(tc.function.name, toolArgs);

      let toolResult: unknown;
      try {
        toolResult = await executeToolFn(tc.function.name, toolArgs);
      } catch (err) {
        toolResult = { error: err instanceof Error ? err.message : String(err) };
      }

      toolEvents.push({ type: "tool_result", name: tc.function.name, result: toolResult });
      callbacks.onToolResult?.(tc.function.name, toolResult);

      extractCapturedValues(tc.function.name, toolResult, capturedValues);

      // Append tool result to history for next round
      history.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return { toolEvents, capturedValues };
}
