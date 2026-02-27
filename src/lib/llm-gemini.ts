/**
 * llm-gemini.ts — Gemini streaming agent loop
 *
 * Mirrors the shape of `runOpenAIAgentLoopStream` in llm-openai.ts:
 *   - Module-level client singleton
 *   - Real token streaming via `ai.models.generateContentStream()`
 *   - Captures `intake_request_id` and `booking_id` from tool results
 *   - Returns `{ toolEvents, capturedValues }` — caller accumulates streamed text
 */

import {
  GoogleGenAI,
  createPartFromFunctionCall,
  createPartFromFunctionResponse,
  type Content,
  type FunctionDeclaration,
  type Part,
  FunctionCallingConfigMode,
} from "@google/genai";
import type { AgentToolDefinition } from "@/lib/api/agent-tools";
import type { ToolEvent } from "@/lib/llm-anthropic";
import { extractCapturedValues } from "@/lib/api/agent-capture";

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
    _geminiClient = new GoogleGenAI({ apiKey });
  }
  return _geminiClient;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeminiStreamCallbacks {
  onDelta: (text: string) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: unknown) => void;
}

export interface GeminiAgentLoopOptions {
  systemPrompt: string;
  /** Full message history in Gemini Content[] format. */
  messages: Content[];
  tools: AgentToolDefinition[];
  executeToolFn: (name: string, args: unknown) => Promise<unknown>;
  maxToolRounds?: number;
  callbacks: GeminiStreamCallbacks;
  /** Optional: inject a client for testing. */
  client?: GoogleGenAI;
}

export interface GeminiAgentLoopStreamResult {
  toolEvents: ToolEvent[];
  capturedValues: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tool conversion
// ---------------------------------------------------------------------------

function toGeminiFunctionDeclarations(
  tools: AgentToolDefinition[],
): FunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters as FunctionDeclaration["parameters"],
  }));
}

// ---------------------------------------------------------------------------
// Streaming agent loop
// ---------------------------------------------------------------------------

const MAX_AGENT_TOKENS = 4096;

export async function runGeminiAgentLoopStream(
  options: GeminiAgentLoopOptions,
): Promise<GeminiAgentLoopStreamResult> {
  const {
    systemPrompt,
    messages,
    tools,
    executeToolFn,
    maxToolRounds = 4,
    callbacks,
  } = options;

  const client = options.client ?? getGeminiClient();
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  const functionDeclarations = toGeminiFunctionDeclarations(tools);

  const history: Content[] = [...messages];

  const toolEvents: ToolEvent[] = [];
  const capturedValues: Record<string, unknown> = {};
  let round = 0;

  while (round < maxToolRounds) {
    round++;

    const stream = await client.models.generateContentStream({
      model,
      contents: history,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: MAX_AGENT_TOKENS,
        tools: [{ functionDeclarations }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
      },
    });

    // Collect all parts from the streamed response
    const responseParts: Part[] = [];

    for await (const chunk of stream) {
      const candidate = chunk.candidates?.[0];
      if (!candidate?.content?.parts) continue;

      for (const part of candidate.content.parts) {
        responseParts.push(part);
        if (part.text) {
          callbacks.onDelta(part.text);
        }
      }
    }

    // Check for function calls
    const functionCalls = responseParts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      // No tool calls — done
      break;
    }

    // Append assistant turn to history
    history.push({ role: "model", parts: responseParts });

    // Execute each function call and build response parts
    const functionResponseParts: Part[] = [];

    for (const part of functionCalls) {
      const fc = part.functionCall!;
      const name = fc.name ?? "unknown";
      const args = (fc.args ?? {}) as Record<string, unknown>;

      toolEvents.push({ type: "tool_call", name, args });
      callbacks.onToolCall?.(name, args);

      let toolResult: unknown;
      try {
        toolResult = await executeToolFn(name, args);
      } catch (err) {
        toolResult = { error: err instanceof Error ? err.message : String(err) };
      }

      toolEvents.push({ type: "tool_result", name, result: toolResult });
      callbacks.onToolResult?.(name, toolResult);

      extractCapturedValues(name, toolResult, capturedValues);

      // Build function response part
      const resultObj =
        typeof toolResult === "object" && toolResult !== null
          ? (toolResult as Record<string, unknown>)
          : { result: toolResult };

      functionResponseParts.push(
        createPartFromFunctionResponse(fc.id ?? name, name, resultObj),
      );
    }

    // Append function responses as a user turn
    history.push({ role: "user", parts: functionResponseParts });
  }

  return { toolEvents, capturedValues };
}
