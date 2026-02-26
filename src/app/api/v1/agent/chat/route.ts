/**
 * POST /api/v1/agent/chat
 *
 * Conversational intake agent endpoint (Server-Sent Events streaming).
 * No authentication required — tracked by browser session_id.
 *
 * DB lifecycle:
 *  - All non-streaming paths close `db` before returning their Response.
 *  - Both the Claude and OpenAI streaming paths transfer db ownership to the
 *    ReadableStream; db.close() happens inside the stream's start() finally block.
 *  - The outer POST handler only closes db on unexpected throws.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { runOpenAIAgentLoopStream } from "@/lib/llm-openai";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { AGENT_TOOL_DEFINITIONS, executeAgentTool } from "@/lib/api/agent-tools";
import { runClaudeAgentLoopStream } from "@/lib/llm-anthropic";
import { AGENT_SYSTEM_PROMPT as BASE_SYSTEM_PROMPT } from "@/lib/api/agent-system-prompt";
import { parseAndValidateChatBody } from "@/lib/api/chat-body-parser";
import {
  loadOrCreateConversation,
  persistAssistantMessage,
  resolveConversationContext,
  type ConversationContext,
  type ConversationMessage,
  type ConversationRow,
} from "@/lib/api/conversation-store";
import { checkRateLimit } from "@/lib/api/rate-limiter";
import { buildAnthropicContentBlocks } from "@/lib/api/attachment-builder";
import { toOAIMessages } from "@/lib/api/message-adapters";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TURNS = 20;
const MAX_TOOL_ROUNDS = 4;

// ---------------------------------------------------------------------------
// System prompt builder (pure) — uses ConversationContext from conversation-store
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: ConversationContext): string {
  const lines: string[] = [];

  if (ctx.referrerName) {
    lines.push(
      `Referred by: ${ctx.referrerName} — this person was referred by someone they know. ` +
        `Mention ${ctx.referrerName} early and warmly (e.g. "${ctx.referrerName} mentioned you might be a good fit"). ` +
        `This social connection is a trust signal — use it naturally, once, near the start.`,
    );
  }

  if (ctx.userName || ctx.userEmail) {
    const identity = ctx.userName
      ? `${ctx.userName} (${ctx.userEmail ?? "no email"})`
      : ctx.userEmail ?? "unknown";
    lines.push(
      `Logged-in user: ${identity} — they already have an account. ` +
        `Address them by first name if their name is known. Do not ask for their name or email in the intake form — you already have it.`,
    );
  } else if (!ctx.isAuthenticated) {
    lines.push(
      `Anonymous visitor — not logged in, identity unknown. ` +
        `Ask for their first name early (within the first two exchanges) and use it throughout the conversation. ` +
        `Collect their email before submitting the intake form. ` +
        `Once you have their name, address them by it for the rest of the conversation.`,
    );
  }

  if (lines.length === 0) return BASE_SYSTEM_PROMPT;

  return (
    BASE_SYSTEM_PROMPT +
    "\n\nCONTEXT FOR THIS CONVERSATION:\n" +
    lines.map((l) => `- ${l}`).join("\n")
  );
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseChunk(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    return await handleChatPost(request, db);
  } catch (err) {
    // Unexpected error — ensure db is closed even if handleChatPost throws.
    db.close();
    throw err;
  }
}

async function handleChatPost(
  request: NextRequest,
  db: ReturnType<typeof openCliDb>,
): Promise<Response> {
  // -- Parse + validate body (no DB needed) --
  const parseResult = await parseAndValidateChatBody(request);
  if (!parseResult.ok) {
    db.close();
    return parseResult.response;
  }
  const { sessionId, userMessage, conversationId, attachments } = parseResult.data;

  // -- Load or create conversation --
  let conversation: ConversationRow;
  let messages: ConversationMessage[];
  try {
    const loaded = loadOrCreateConversation(db, sessionId, conversationId);
    conversation = loaded.conversation;
    messages = loaded.messages;
  } catch (err) {
    db.close();
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: "database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // -- Rate limit --
  const rateCheck = checkRateLimit(messages, MAX_TURNS, conversation.id);
  if (rateCheck.limited) {
    db.close();
    return rateCheck.response;
  }

  // -- Append user message to history --
  const attachmentDescriptions = attachments.map((a) =>
    a.type === "image"
      ? `[Image: ${a.name || "attached image"}]`
      : `[File: ${a.name || "attached file"}]`,
  );
  const dbContent = [userMessage, ...attachmentDescriptions].filter(Boolean).join(" ");
  messages.push({ role: "user", content: dbContent, created_at: new Date().toISOString() });

  const userContentBlocks = buildAnthropicContentBlocks(attachments);
  const systemPrompt = buildSystemPrompt(resolveConversationContext(db, request));

  const anthropicKey =
    process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY;

  if (anthropicKey) {
    // Claude path — true token streaming. Transfers db ownership to the stream.
    // db.close() happens inside the ReadableStream.start() finally block.
    return buildClaudeStreamingResponse({
      db,
      conversation,
      messages,
      userMessage,
      userContentBlocks,
      systemPrompt,
      anthropicKey,
    });
  }

  // OpenAI streaming — transfers db ownership to ReadableStream (same pattern as Claude)
  return buildOAIStreamingResponse({ db, conversation, messages, systemPrompt });
}

// ---------------------------------------------------------------------------
// Shared streaming core — R-12
// ---------------------------------------------------------------------------

/**
 * A function that runs an agent loop and returns `{ capturedValues }`.
 * Receives injected SSE callbacks so it can fire events into the stream.
 */
type AgentLoopFn = (callbacks: {
  onDelta: (text: string) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => void;
  onToolResult: (name: string, result: unknown) => void;
}) => Promise<{ capturedValues: Record<string, unknown> }>;

/**
 * Build a streaming SSE Response that runs an agent loop.
 *
 * This is the single implementation of the streaming SSE protocol.
 * Both the Claude and OpenAI paths delegate here — the only difference
 * between them is the `runLoop` function they supply.
 *
 * DB ownership: db.close() is called in the finally block.
 * Error handling: the original error is preserved and logged (not swallowed).
 * Done frame: includes booking_id and booking_confirmed in addition to
 *             intake_submitted so the client knows about both milestones.
 */
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

        controller.enqueue(
          encoder.encode(
            sseChunk({
              done: true,
              conversation_id: conversation.id,
              intake_submitted: intakeRequestId !== null,
              booking_confirmed: typeof result.capturedValues.booking_id === "string",
              booking_id: result.capturedValues.booking_id ?? null,
            }),
          ),
        );
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

// ---------------------------------------------------------------------------
// Claude: true token streaming
// ---------------------------------------------------------------------------

function buildClaudeStreamingResponse(params: {
  db: ReturnType<typeof openCliDb>;
  conversation: ConversationRow;
  messages: ConversationMessage[];
  userMessage: string;
  userContentBlocks: Anthropic.ContentBlockParam[];
  systemPrompt: string;
  anthropicKey: string;
}): Response {
  // Build history for Claude from all stored messages *except* the
  // current user turn (which is appended inside runClaudeAgentLoopStream).
  // • Skip tool-call records (role="tool") — Claude manages those internally.
  // • Drop any leading assistant message (e.g. the stored opening greeting)
  //   because the Anthropic API requires the first history message to be "user".
  const allPriorText = params.messages
    .slice(0, -1)
    .filter((m) => m.role !== "tool")
    .map((m) => ({ role: m.role as "user" | "assistant", text: m.content }));
  const firstUserIdx = allPriorText.findIndex((m) => m.role === "user");
  const priorTextMessages = firstUserIdx >= 0 ? allPriorText.slice(firstUserIdx) : [];

  return buildStreamingResponse({
    db: params.db,
    conversation: params.conversation,
    messages: params.messages,
    runLoop: (callbacks) =>
      runClaudeAgentLoopStream({
        apiKey: params.anthropicKey,
        systemPrompt: params.systemPrompt,
        history: priorTextMessages,
        userMessage: params.userMessage,
        userContentBlocks:
          params.userContentBlocks.length > 0 ? params.userContentBlocks : undefined,
        tools: AGENT_TOOL_DEFINITIONS,
        executeToolFn: async (name, args) => executeAgentTool(name, args, params.db),
        maxToolRounds: MAX_TOOL_ROUNDS,
        callbacks,
      }),
  });
}

// ---------------------------------------------------------------------------
// OpenAI: real token streaming (R-10)
// ---------------------------------------------------------------------------

function buildOAIStreamingResponse(params: {
  db: ReturnType<typeof openCliDb>;
  conversation: ConversationRow;
  messages: ConversationMessage[];
  systemPrompt: string;
}): Response {
  const oaiMessages = toOAIMessages(params.messages);

  return buildStreamingResponse({
    db: params.db,
    conversation: params.conversation,
    messages: params.messages,
    runLoop: (callbacks) =>
      runOpenAIAgentLoopStream({
        systemPrompt: params.systemPrompt,
        messages: oaiMessages,
        tools: AGENT_TOOL_DEFINITIONS,
        executeToolFn: async (name, args) => executeAgentTool(name, args, params.db),
        maxToolRounds: MAX_TOOL_ROUNDS,
        callbacks,
      }),
  });
}
