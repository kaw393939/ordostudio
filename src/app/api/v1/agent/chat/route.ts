/**
 * POST /api/v1/agent/chat
 *
 * Conversational intake agent endpoint (Server-Sent Events streaming).
 * No authentication required — tracked by browser session_id.
 *
 * DB lifecycle:
 *  - All non-streaming paths close `db` before returning their Response.
 *  - The Claude streaming path transfers db ownership to the ReadableStream;
 *    db.close() happens inside the stream's start() finally block.
 *  - The outer POST handler only closes db on unexpected throws.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { AGENT_TOOL_DEFINITIONS, executeAgentTool } from "@/lib/api/agent-tools";
import { runClaudeAgentLoopStream } from "@/lib/llm-anthropic";
import { AGENT_SYSTEM_PROMPT as BASE_SYSTEM_PROMPT } from "@/lib/api/agent-system-prompt";
import { parseCookieHeader } from "@/lib/api/referrals";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { parseAndValidateChatBody } from "@/lib/api/chat-body-parser";
import {
  loadOrCreateConversation,
  persistAssistantMessage,
  type ConversationMessage,
  type ConversationRow,
} from "@/lib/api/conversation-store";
import { checkRateLimit } from "@/lib/api/rate-limiter";
import { buildAnthropicContentBlocks } from "@/lib/api/attachment-builder";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TURNS = 20;
const MAX_TOOL_ROUNDS = 4;

// ---------------------------------------------------------------------------
// Conversation context resolution
// ---------------------------------------------------------------------------

interface ConversationContext {
  referrerName: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
}

function resolveConversationContext(
  db: ReturnType<typeof openCliDb>,
  request: NextRequest,
): ConversationContext {
  let referrerName: string | null = null;
  let userName: string | null = null;
  let userEmail: string | null = null;

  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const referralCode = cookies.so_ref;
  if (referralCode && referralCode.trim().length > 0) {
    try {
      const row = db
        .prepare(
          `SELECT u.display_name
           FROM referral_codes rc
           JOIN users u ON u.id = rc.user_id
           WHERE rc.code = ?`,
        )
        .get(referralCode.trim().toUpperCase()) as { display_name: string | null } | undefined;
      referrerName = row?.display_name ?? null;
    } catch {
      // Non-blocking — missing referrer context is fine.
    }
  }

  const sessionUser = getSessionUserFromRequest(request);
  if (sessionUser) {
    userEmail = sessionUser.email;
    try {
      const row = db
        .prepare("SELECT display_name FROM users WHERE id = ?")
        .get(sessionUser.id) as { display_name: string | null } | undefined;
      userName = row?.display_name ?? null;
    } catch {
      // Non-blocking.
    }
  }

  return { referrerName, userName, userEmail, isAuthenticated: sessionUser !== null };
}

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
// LLM dispatch types (OpenAI batch path only — Claude uses streaming)
// ---------------------------------------------------------------------------

interface ToolEvent {
  type: "tool_call" | "tool_result";
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

interface OAIBatchResult {
  assistantFinalContent: string;
  toolEvents: ToolEvent[];
  intakeRequestId: string | null;
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

  // -- OpenAI fallback (batch) — TODO(R-10): upgrade to true streaming --
  let oaiResult: OAIBatchResult | Response;
  try {
    oaiResult = await runOpenAIBatch({
      messages,
      systemPrompt,
      priorIntakeRequestId: conversation.intake_request_id ?? null,
      db,
    });
  } catch {
    db.close();
    return new Response(JSON.stringify({ error: "AI service unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (oaiResult instanceof Response) {
    db.close();
    return oaiResult;
  }

  try {
    persistAssistantMessage(
      db,
      conversation,
      messages,
      oaiResult.assistantFinalContent,
      oaiResult.intakeRequestId,
    );
    return buildBatchSSEResponse(
      oaiResult.toolEvents,
      oaiResult.assistantFinalContent,
      conversation.id,
      oaiResult.intakeRequestId,
    );
  } finally {
    db.close();
  }
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
  const { db, conversation, messages } = params;
  const encoder = new TextEncoder();

  const priorTextMessages = messages
    .slice(0, -1)
    .filter((m) => m.role !== "tool")
    .map((m) => ({ role: m.role as "user" | "assistant", text: m.content }));

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";

      try {
        const streamResult = await runClaudeAgentLoopStream({
          apiKey: params.anthropicKey,
          systemPrompt: params.systemPrompt,
          history: priorTextMessages,
          userMessage: params.userMessage,
          userContentBlocks:
            params.userContentBlocks.length > 0
              ? params.userContentBlocks
              : undefined,
          tools: AGENT_TOOL_DEFINITIONS,
          executeToolFn: async (name, args) => executeAgentTool(name, args, db),
          maxToolRounds: MAX_TOOL_ROUNDS,
          callbacks: {
            onDelta(text) {
              assistantText += text;
              controller.enqueue(encoder.encode(sseChunk({ delta: text })));
            },
            onToolCall(name, args) {
              controller.enqueue(
                encoder.encode(sseChunk({ tool_call: { name, args } })),
              );
            },
            onToolResult(name, result) {
              controller.enqueue(
                encoder.encode(sseChunk({ tool_result: { name, result } })),
              );
            },
          },
        });

        const intakeRequestId =
          typeof streamResult.capturedValues.intake_request_id === "string"
            ? streamResult.capturedValues.intake_request_id
            : (conversation.intake_request_id ?? null);

        persistAssistantMessage(
          db,
          conversation,
          messages,
          assistantText,
          intakeRequestId,
        );

        controller.enqueue(
          encoder.encode(
            sseChunk({
              done: true,
              conversation_id: conversation.id,
              intake_submitted: intakeRequestId !== null,
            }),
          ),
        );
        controller.close();
      } catch {
        controller.error(new Error("stream failed"));
      } finally {
        db.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Conversation-Id": conversation.id,
    },
  });
}

// ---------------------------------------------------------------------------
// OpenAI: batch (TODO R-10 — upgrade to streaming)
// ---------------------------------------------------------------------------

async function runOpenAIBatch(params: {
  messages: ConversationMessage[];
  systemPrompt: string;
  priorIntakeRequestId: string | null;
  db: ReturnType<typeof openCliDb>;
}): Promise<OAIBatchResult | Response> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: params.systemPrompt },
    ...params.messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
      if (m.role === "tool") {
        return { role: "tool", content: m.content, tool_call_id: m.tool_call_id ?? "" };
      }
      if (m.role === "assistant") {
        return { role: "assistant", content: m.content };
      }
      return { role: "user", content: m.content };
    }),
  ];

  const toolEvents: ToolEvent[] = [];
  let intakeRequestId = params.priorIntakeRequestId;
  let assistantFinalContent = "";
  let toolRound = 0;
  const currentMessages = [...openaiMessages];

  while (toolRound < MAX_TOOL_ROUNDS) {
    toolRound++;
    let completion: OpenAI.Chat.ChatCompletion;
    try {
      completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: currentMessages,
        tools: AGENT_TOOL_DEFINITIONS,
        tool_choice: "auto",
      });
    } catch {
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const choice = completion.choices[0];
    const assistantMessage = choice.message;

    if (choice.finish_reason === "tool_calls" && assistantMessage.tool_calls?.length) {
      currentMessages.push({
        role: "assistant",
        content: assistantMessage.content ?? null,
        tool_calls:
          assistantMessage.tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[],
      });

      for (const toolCall of assistantMessage.tool_calls.filter(
        (tc): tc is OpenAI.Chat.ChatCompletionMessageFunctionToolCall =>
          tc.type === "function",
      )) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        } catch {
          toolArgs = {};
        }

        toolEvents.push({ type: "tool_call", name: toolName, args: toolArgs });

        let toolResult: unknown;
        try {
          toolResult = await executeAgentTool(toolName, toolArgs, params.db);
        } catch {
          toolResult = { error: "tool execution failed" };
        }

        toolEvents.push({ type: "tool_result", name: toolName, result: toolResult });

        if (
          toolName === "submit_intake" &&
          toolResult &&
          typeof toolResult === "object" &&
          "intake_request_id" in toolResult
        ) {
          intakeRequestId = (
            toolResult as { intake_request_id: string }
          ).intake_request_id;
        }

        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
      continue;
    }

    assistantFinalContent = assistantMessage.content ?? "";
    break;
  }

  return { assistantFinalContent, toolEvents, intakeRequestId };
}

// ---------------------------------------------------------------------------
// Batch SSE response (OpenAI path — single delta, no fake word-split)
// ---------------------------------------------------------------------------

function buildBatchSSEResponse(
  toolEvents: ToolEvent[],
  assistantFinalContent: string,
  conversationId: string,
  intakeRequestId: string | null,
): Response {
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const evt of toolEvents) {
        const payload =
          evt.type === "tool_call"
            ? { tool_call: { name: evt.name, args: evt.args } }
            : { tool_result: { name: evt.name, result: evt.result } };
        controller.enqueue(encoder.encode(sseChunk(payload)));
      }

      // Emit full content as a single delta (batch — no fake word-split)
      if (assistantFinalContent) {
        controller.enqueue(
          encoder.encode(sseChunk({ delta: assistantFinalContent })),
        );
      }

      controller.enqueue(
        encoder.encode(
          sseChunk({
            done: true,
            conversation_id: conversationId,
            intake_submitted: intakeRequestId !== null,
          }),
        ),
      );
      controller.close();
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Conversation-Id": conversationId,
    },
  });
}
