/**
 * Anthropic / Claude adapter
 *
 * Provides two public surfaces:
 *  1. `triageWithAnthropic()` — LLM triage using Claude
 *  2. `runClaudeAgentLoop()` — single-turn of the HITL conversational agent
 *     with full tool-use support (handles multi-round tool calls internally)
 *
 * Model preference: reads ANTHROPIC_MODEL env var, defaults to "claude-sonnet-4-6".
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  TriageCategory,
  LlmTriageResult,
} from "./triage";
import {
  TRIAGE_CATEGORIES,
  derivePriority,
  isValidCategory,
} from "./triage";
import type { AgentToolDefinition } from "./api/agent-tools";
import { extractCapturedValues } from "./api/agent-capture";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";
const MAX_TRIAGE_TOKENS = 512;
const MAX_AGENT_TOKENS = 2048;

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

const TRIAGE_SYSTEM_PROMPT = `You are a customer service triage agent. Classify the incoming request into exactly one category.

Available categories: ${TRIAGE_CATEGORIES.join(", ")}

Respond ONLY with valid JSON matching this schema:
{
  "category": "<one of the categories above>",
  "confidence": <number 0-1>,
  "summary": "<one-line summary, max 120 chars>",
  "recommended_action": "<brief recommended next step>"
}

Rules:
- "urgent_escalation" is for outages, emergencies, or any request demanding immediate attention.
- "spam" is for obviously irrelevant or fraudulent messages.
- If the request is unclear or doesn't fit well, use "general_inquiry" with a lower confidence.
- Be conservative with confidence: only use >0.8 when the match is unambiguous.`;

/**
 * Classify a support request using Claude.
 */
export async function triageWithAnthropic(
  text: string,
  apiKey: string,
): Promise<LlmTriageResult> {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_CLAUDE_MODEL;

  let raw = "";
  try {
    const response = await client.messages.create({
      model,
      max_tokens: MAX_TRIAGE_TOKENS,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });
    const block = response.content.find((b) => b.type === "text");
    raw = block && block.type === "text" ? block.text : "";
  } catch {
    // Fall through to rule-based fallback (caller handles)
    throw new Error("anthropic_triage_unavailable");
  }

  try {
    const parsed = JSON.parse(raw) as {
      category?: string;
      confidence?: number;
      summary?: string;
      recommended_action?: string;
    };

    const category: TriageCategory = isValidCategory(parsed.category ?? "")
      ? (parsed.category as TriageCategory)
      : "general_inquiry";

    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

    return {
      category,
      confidence,
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary.slice(0, 120)
          : text.slice(0, 120),
      recommended_action:
        typeof parsed.recommended_action === "string"
          ? parsed.recommended_action
          : "Review manually.",
      priority: derivePriority(category, confidence),
    };
  } catch {
    throw new Error("anthropic_triage_parse_failed");
  }
}

// ---------------------------------------------------------------------------
// Agent — tool-use loop
// ---------------------------------------------------------------------------

export interface ToolEvent {
  type: "tool_call" | "tool_result";
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

export interface ClaudeAgentTurnResult {
  /** The final assistant text response for this turn */
  assistantText: string;
  /** All tool calls + results that happened in this turn */
  toolEvents: ToolEvent[];
  /**
   * Key values captured during tool execution.
   * e.g. `{ intake_request_id: "..." }` when submit_intake fires
   */
  capturedValues: Record<string, unknown>;
}

export interface ClaudeAgentLoopOptions {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  /**
   * Simplified prior turns: just the user/assistant text pairs.
   */
  history: Array<{ role: "user" | "assistant"; text: string }>;
  /** The new user message text for this turn */
  userMessage: string;
  /**
   * Optional multimodal content blocks to include with the user message.
   * When provided, these are prepended before the userMessage text block.
   * Supports image and document (PDF) blocks.
   */
  userContentBlocks?: Anthropic.ContentBlockParam[];
  tools: AgentToolDefinition[];
  executeToolFn: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
  maxToolRounds?: number;
}

/**
 * Run a single turn of the conversational intake agent using Claude.
 *
 * Handles the full Anthropic tool-use loop internally:
 * - If Claude returns "tool_use" blocks, executes each tool and replies with results
 * - Repeats until Claude returns "end_turn" (text only) or maxToolRounds exhausted
 *
 * Returns the final text + all tool events + any captured values.
 */
export async function runClaudeAgentLoop(
  options: ClaudeAgentLoopOptions,
): Promise<ClaudeAgentTurnResult> {
  const {
    apiKey,
    model = process.env.ANTHROPIC_MODEL ?? DEFAULT_CLAUDE_MODEL,
    systemPrompt,
    history,
    userMessage,
    userContentBlocks,
    tools,
    executeToolFn,
    maxToolRounds = 4,
  } = options;

  const client = new Anthropic({ apiKey });

  // Convert our tool definitions to Anthropic format
  const anthropicTools: Anthropic.Tool[] = tools.map((def) => ({
    name: def.function.name,
    description: def.function.description,
    input_schema: def.function.parameters as Anthropic.Tool["input_schema"],
  }));

  // Build the user content for this turn — multimodal blocks first, then text
  const currentUserContent: Anthropic.ContentBlockParam[] = [
    ...(userContentBlocks ?? []),
    ...(userMessage ? [{ type: "text" as const, text: userMessage }] : []),
  ];

  // Build Anthropic message array from simplified history + new user message
  const anthropicMessages: Anthropic.MessageParam[] = [
    ...history.map(
      (h): Anthropic.MessageParam => ({
        role: h.role,
        content: h.text,
      }),
    ),
    { role: "user", content: currentUserContent.length === 1 && currentUserContent[0]?.type === "text"
        ? (currentUserContent[0] as Anthropic.TextBlockParam).text
        : currentUserContent },
  ];

  const toolEvents: ToolEvent[] = [];
  const capturedValues: Record<string, unknown> = {};
  let assistantText = "";
  let round = 0;

  while (round < maxToolRounds) {
    round++;

    const response = await client.messages.create({
      model,
      max_tokens: MAX_AGENT_TOKENS,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: anthropicTools,
    });

    // Collect text from this response (accumulate — responses may have multiple text blocks)
    for (const block of response.content) {
      if (block.type === "text") {
        assistantText += block.text;
      }
    }

    if (response.stop_reason !== "tool_use") {
      // No more tool calls — we're done
      break;
    }

    // Extract tool_use blocks
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) break;

    // Append the full assistant message (with tool_use blocks) to history
    anthropicMessages.push({
      role: "assistant",
      content: response.content,
    });

    // Execute each tool and collect results
    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const toolArgs = toolUse.input as Record<string, unknown>;

      toolEvents.push({ type: "tool_call", name: toolUse.name, args: toolArgs });

      let toolResult: unknown;
      try {
        toolResult = await executeToolFn(toolUse.name, toolArgs);
      } catch (err) {
        toolResult = { error: err instanceof Error ? err.message : String(err) };
      }

      toolEvents.push({ type: "tool_result", name: toolUse.name, result: toolResult });

      extractCapturedValues(toolUse.name, toolResult, capturedValues);

      toolResultContents.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(toolResult),
      });
    }

    // Append all tool results as a single user message
    anthropicMessages.push({
      role: "user",
      content: toolResultContents,
    });
  }

  return { assistantText, toolEvents, capturedValues };
}

// ---------------------------------------------------------------------------
// Streaming agent loop — fires onDelta per real Anthropic token
// ---------------------------------------------------------------------------

export interface ClaudeStreamCallbacks {
  /** Called for each streaming text delta from the model. */
  onDelta: (text: string) => void;
  /** Called when a tool is invoked (before execution). */
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  /** Called after a tool finishes executing. */
  onToolResult?: (name: string, result: unknown) => void;
}

export interface ClaudeAgentLoopStreamResult {
  toolEvents: ToolEvent[];
  capturedValues: Record<string, unknown>;
}

/**
 * Stream a single turn of the conversational intake agent using Claude.
 *
 * Identical semantics to `runClaudeAgentLoop` but fires `callbacks.onDelta`
 * for each text token as it arrives from the Anthropic streaming API.
 * Tool calls are still collected synchronously after each streaming round.
 *
 * Returns the same toolEvents + capturedValues as the batch version.
 * The caller must accumulate the streamed text itself (via `onDelta`) to
 * obtain the final assistant message text.
 */
export async function runClaudeAgentLoopStream(
  options: ClaudeAgentLoopOptions & { callbacks: ClaudeStreamCallbacks },
): Promise<ClaudeAgentLoopStreamResult> {
  const {
    apiKey,
    model = process.env.ANTHROPIC_MODEL ?? DEFAULT_CLAUDE_MODEL,
    systemPrompt,
    history,
    userMessage,
    userContentBlocks,
    tools,
    executeToolFn,
    maxToolRounds = 4,
    callbacks,
  } = options;

  const client = new Anthropic({ apiKey });

  const anthropicTools: Anthropic.Tool[] = tools.map((def) => ({
    name: def.function.name,
    description: def.function.description,
    input_schema: def.function.parameters as Anthropic.Tool["input_schema"],
  }));

  const currentUserContent: Anthropic.ContentBlockParam[] = [
    ...(userContentBlocks ?? []),
    ...(userMessage ? [{ type: "text" as const, text: userMessage }] : []),
  ];

  const anthropicMessages: Anthropic.MessageParam[] = [
    ...history.map(
      (h): Anthropic.MessageParam => ({ role: h.role, content: h.text }),
    ),
    {
      role: "user",
      content:
        currentUserContent.length === 1 &&
        currentUserContent[0]?.type === "text"
          ? (currentUserContent[0] as Anthropic.TextBlockParam).text
          : currentUserContent,
    },
  ];

  const toolEvents: ToolEvent[] = [];
  const capturedValues: Record<string, unknown> = {};
  let round = 0;

  while (round < maxToolRounds) {
    round++;

    // Start a streaming request
    const stream = client.messages.stream({
      model,
      max_tokens: MAX_AGENT_TOKENS,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: anthropicTools,
    });

    // Fire onDelta for each text token as it arrives
    stream.on("text", (text) => {
      callbacks.onDelta(text);
    });

    // Await the complete message (includes tool_use blocks if any)
    const response = await stream.finalMessage();

    if (response.stop_reason !== "tool_use") {
      // No tool calls — this round is the final response
      break;
    }

    // Extract tool_use blocks and handle them
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUseBlocks.length === 0) break;

    anthropicMessages.push({ role: "assistant", content: response.content });

    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const toolArgs = toolUse.input as Record<string, unknown>;
      toolEvents.push({ type: "tool_call", name: toolUse.name, args: toolArgs });
      callbacks.onToolCall?.(toolUse.name, toolArgs);

      let toolResult: unknown;
      try {
        toolResult = await executeToolFn(toolUse.name, toolArgs);
      } catch (err) {
        toolResult = { error: err instanceof Error ? err.message : String(err) };
      }

      toolEvents.push({ type: "tool_result", name: toolUse.name, result: toolResult });
      callbacks.onToolResult?.(toolUse.name, toolResult);

      extractCapturedValues(toolUse.name, toolResult, capturedValues);

      toolResultContents.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(toolResult),
      });
    }

    anthropicMessages.push({ role: "user", content: toolResultContents });
  }

  return { toolEvents, capturedValues };
}
