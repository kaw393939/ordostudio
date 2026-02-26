/**
 * POST /api/v1/agent/chat
 *
 * Conversational intake agent endpoint (Server-Sent Events streaming).
 * No authentication required — tracked by browser session_id.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { AGENT_TOOL_DEFINITIONS, executeAgentTool } from "@/lib/api/agent-tools";
import { runClaudeAgentLoop } from "@/lib/llm-anthropic";
import { AGENT_SYSTEM_PROMPT as BASE_SYSTEM_PROMPT, AGENT_OPENING_MESSAGE } from "@/lib/api/agent-system-prompt";
import { parseCookieHeader } from "@/lib/api/referrals";
import { getSessionUserFromRequest } from "@/lib/api/auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TURNS = 20;

// ---------------------------------------------------------------------------
// Conversation context resolution
// ---------------------------------------------------------------------------

interface ConversationContext {
  referrerName: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
}

/**
 * Resolve referrer and logged-in user context for this request.
 * Used to personalise the system prompt for each conversation.
 */
function resolveConversationContext(
  db: ReturnType<typeof openCliDb>,
  request: NextRequest,
): ConversationContext {
  let referrerName: string | null = null;
  let userName: string | null = null;
  let userEmail: string | null = null;

  // Resolve referrer from so_ref cookie.
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

  // Resolve logged-in user.
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

/**
 * Build the system prompt, optionally appending a context block when
 * referrer or user information is available.
 */
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

  if (lines.length === 0) {
    return BASE_SYSTEM_PROMPT;
  }

  return `${BASE_SYSTEM_PROMPT}

CONTEXT FOR THIS CONVERSATION:
${lines.map((l) => `- ${l}`).join("\n")}`;
}
const MAX_TOOL_ROUNDS = 4;

// Opening message is the canonical export from agent-system-prompt.ts (AGENT_OPENING_MESSAGE)

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseChunk(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

interface ConversationMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  created_at: string;
  tool_call_id?: string;
  name?: string;
}

interface ConversationRow {
  id: string;
  session_id: string;
  messages: string;
  status: string;
  intake_request_id: string | null;
}

function loadConversation(
  db: ReturnType<typeof openCliDb>,
  conversationId: string,
): ConversationRow | null {
  return (
    (db
      .prepare(`SELECT id, session_id, messages, status, intake_request_id FROM intake_conversations WHERE id = ?`)
      .get(conversationId) as ConversationRow | undefined) ?? null
  );
}

function createConversation(
  db: ReturnType<typeof openCliDb>,
  sessionId: string,
): ConversationRow {
  const id = randomUUID();
  const now = new Date().toISOString();
  const messages = JSON.stringify([
    {
      role: "assistant",
      content: AGENT_OPENING_MESSAGE,
      created_at: now,
    } satisfies ConversationMessage,
  ]);
  db.prepare(
    `INSERT INTO intake_conversations (id, session_id, messages, status, created_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
  ).run(id, sessionId, messages, now, now);
  return { id, session_id: sessionId, messages, status: "ACTIVE", intake_request_id: null };
}

function saveConversation(
  db: ReturnType<typeof openCliDb>,
  id: string,
  messages: ConversationMessage[],
  intakeRequestId?: string | null,
): void {
  const now = new Date().toISOString();
  if (intakeRequestId !== undefined) {
    db.prepare(
      `UPDATE intake_conversations
       SET messages = ?, updated_at = ?, intake_request_id = ?, status = 'COMPLETED'
       WHERE id = ?`,
    ).run(JSON.stringify(messages), now, intakeRequestId, id);
  } else {
    db.prepare(
      `UPDATE intake_conversations SET messages = ?, updated_at = ? WHERE id = ?`,
    ).run(JSON.stringify(messages), now, id);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Parse body
  interface AttachmentInput {
    type: "image" | "document" | "text";
    mediaType: string;
    name: string;
    data: string; // base64
  }
  let body: { session_id?: unknown; message?: unknown; conversation_id?: unknown; attachments?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  const userMessage = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId =
    typeof body.conversation_id === "string" ? body.conversation_id.trim() : null;
  const attachments: AttachmentInput[] = Array.isArray(body.attachments)
    ? (body.attachments as AttachmentInput[]).filter(
        (a) => a && typeof a.data === "string" && typeof a.mediaType === "string",
      )
    : [];

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "session_id is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!userMessage && attachments.length === 0) {
    return new Response(
      JSON.stringify({ error: "message or attachments required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // -------------------------------------------------------------------------
  // Load or create conversation
  // -------------------------------------------------------------------------
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  let conversation: ConversationRow;
  try {
    if (conversationId) {
      const existing = loadConversation(db, conversationId);
      if (!existing) {
        db.close();
        return new Response(
          JSON.stringify({ error: "conversation not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }
      conversation = existing;
    } else {
      conversation = createConversation(db, sessionId);
    }
  } catch {
    db.close();
    return new Response(
      JSON.stringify({ error: "failed to load or create conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Parse messages array
  let messages: ConversationMessage[] = [];
  try {
    messages = JSON.parse(conversation.messages) as ConversationMessage[];
  } catch {
    messages = [];
  }

  // Rate limit check
  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns >= MAX_TURNS) {
    // Auto-submit partial and close if we haven't already
    db.close();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            sseChunk({
              delta:
                "We've reached the end of our conversation. Based on what you've shared, we'll follow up within 1 business day.",
            }),
          ),
        );
        controller.enqueue(
          encoder.encode(sseChunk({ done: true, conversation_id: conversation.id })),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Append user message — store text description of attachments for DB record
  const attachmentDescriptions = attachments.map((a) =>
    a.type === "image" ? `[Image: ${a.name || "attached image"}]` : `[File: ${a.name || "attached file"}]`,
  );
  const dbContent = [userMessage, ...attachmentDescriptions].filter(Boolean).join(" ");
  const userMsg: ConversationMessage = {
    role: "user",
    content: dbContent,
    created_at: new Date().toISOString(),
  };
  messages.push(userMsg);

  // Build Claude content blocks for multimodal attachments
  const userContentBlocks: Anthropic.ContentBlockParam[] = attachments
    .map((a): Anthropic.ContentBlockParam | null => {
      if (a.type === "image") {
        const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
        type ImageMediaType = typeof validImageTypes[number];
        const mediaType = (validImageTypes as readonly string[]).includes(a.mediaType)
          ? (a.mediaType as ImageMediaType)
          : "image/jpeg";
        return {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: a.data },
        };
      }
      if (a.type === "document") {
        return {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: a.data },
        } as Anthropic.ContentBlockParam;
      }
      return null;
    })
    .filter((b): b is Anthropic.ContentBlockParam => b !== null);

  // -------------------------------------------------------------------------
  // Resolve per-request context and build system prompt
  // -------------------------------------------------------------------------
  const conversationContext = resolveConversationContext(db, request);
  const SYSTEM_PROMPT = buildSystemPrompt(conversationContext);

  // -------------------------------------------------------------------------
  // LLM dispatch: Anthropic Claude (preferred) or OpenAI (fallback)
  // -------------------------------------------------------------------------

  // Collect tool call events for SSE streaming
  interface ToolEvent {
    type: "tool_call" | "tool_result";
    name: string;
    args?: Record<string, unknown>;
    result?: unknown;
  }
  const toolEvents: ToolEvent[] = [];
  let intakeRequestId: string | null = conversation.intake_request_id ?? null;
  let assistantFinalContent = "";

  const anthropicKey =
    process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY;

  if (anthropicKey) {
    // ── Claude path ────────────────────────────────────────────────────────
    // Build simplified text history (exclude tool messages; exclude the last
    // user message — that's the current turn passed as `userMessage`)
    const priorTextMessages = messages
      .slice(0, -1) // drop the just-appended userMsg
      .filter((m) => m.role !== "tool")
      .map((m) => ({ role: m.role as "user" | "assistant", text: m.content }));

    let claudeResult: Awaited<ReturnType<typeof runClaudeAgentLoop>>;
    try {
      claudeResult = await runClaudeAgentLoop({
        apiKey: anthropicKey,
        systemPrompt: SYSTEM_PROMPT,
        history: priorTextMessages,
        userMessage,
        userContentBlocks: userContentBlocks.length > 0 ? userContentBlocks : undefined,
        tools: AGENT_TOOL_DEFINITIONS,
        executeToolFn: async (name, args) => executeAgentTool(name, args),
        maxToolRounds: MAX_TOOL_ROUNDS,
      });
    } catch {
      db.close();
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    assistantFinalContent = claudeResult.assistantText;
    toolEvents.push(...claudeResult.toolEvents);
    if (typeof claudeResult.capturedValues.intake_request_id === "string") {
      intakeRequestId = claudeResult.capturedValues.intake_request_id;
    }
  } else {
    // ── OpenAI fallback path ───────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
        if (m.role === "tool") {
          return {
            role: "tool",
            content: m.content,
            tool_call_id: m.tool_call_id ?? "",
          };
        }
        if (m.role === "assistant") {
          return { role: "assistant", content: m.content };
        }
        return { role: "user", content: m.content };
      }),
    ];

    let toolRound = 0;
    const currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...openaiMessages];

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
        db.close();
        return new Response(
          JSON.stringify({ error: "AI service unavailable" }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        );
      }

      const choice = completion.choices[0];
      const assistantMessage = choice.message;

      if (choice.finish_reason === "tool_calls" && assistantMessage.tool_calls?.length) {
        currentMessages.push({
          role: "assistant",
          content: assistantMessage.content ?? null,
          tool_calls: assistantMessage.tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[],
        });

        const functionToolCalls = assistantMessage.tool_calls.filter(
          (tc): tc is OpenAI.Chat.ChatCompletionMessageFunctionToolCall =>
            tc.type === "function",
        );

        for (const toolCall of functionToolCalls) {
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
            toolResult = await executeAgentTool(toolName, toolArgs);
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
            intakeRequestId = (toolResult as { intake_request_id: string }).intake_request_id;
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
  }

  // -------------------------------------------------------------------------
  // Persist updated conversation
  // -------------------------------------------------------------------------
  const assistantMsg: ConversationMessage = {
    role: "assistant",
    content: assistantFinalContent,
    created_at: new Date().toISOString(),
  };
  messages.push(assistantMsg);

  try {
    saveConversation(db, conversation.id, messages, intakeRequestId ?? undefined);
  } finally {
    db.close();
  }

  // -------------------------------------------------------------------------
  // Stream response via SSE
  // -------------------------------------------------------------------------
  const conversationIdOut = conversation.id;
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream({
    start(controller) {
      // Emit tool events first
      for (const evt of toolEvents) {
        if (evt.type === "tool_call") {
          controller.enqueue(
            encoder.encode(
              sseChunk({ tool_call: { name: evt.name, args: evt.args } }),
            ),
          );
        } else {
          controller.enqueue(
            encoder.encode(
              sseChunk({ tool_result: { name: evt.name, result: evt.result } }),
            ),
          );
        }
      }

      // Stream text word-by-word for a natural feel
      const words = assistantFinalContent.split(/(\s+)/);
      for (const word of words) {
        if (word.trim()) {
          controller.enqueue(encoder.encode(sseChunk({ delta: word })));
        }
      }

      // Done
      controller.enqueue(
        encoder.encode(
          sseChunk({
            done: true,
            conversation_id: conversationIdOut,
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
      "X-Conversation-Id": conversationIdOut,
    },
  });
}
