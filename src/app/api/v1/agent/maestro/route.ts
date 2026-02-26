/**
 * POST /api/v1/agent/maestro
 *
 * Admin/maestro ops agent endpoint (Server-Sent Events streaming).
 * Requires an authenticated session with ADMIN, SUPER_ADMIN, or MAESTRO role.
 *
 * Request body:
 *   { message: string; history?: Array<{ role: "user" | "assistant"; text: string }> }
 *
 * Stream events:
 *   data: { delta: string }          — streaming text token
 *   data: { done: true }             — conversation turn complete
 *   data: { error: string }          — error (stream terminates)
 *
 * DB lifecycle:
 *   The db is opened in the POST handler and ownership transferred to the
 *   ReadableStream. db.close() happens in the stream's finally block.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { runClaudeAgentLoopStream } from "@/lib/llm-anthropic";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { problem } from "@/lib/api/response";
import { MAESTRO_SYSTEM_PROMPT } from "@/lib/api/maestro-system-prompt";
import { MAESTRO_TOOLS, executeMaestroTool } from "@/lib/api/maestro-tools";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

const OPS_ROLES = ["ADMIN", "SUPER_ADMIN", "MAESTRO"] as const;

function requireOpsAccess(request: NextRequest) {
  const user = getSessionUserFromRequest(request);

  if (!user) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Active session required.",
        },
        request,
      ),
    };
  }

  const hasRole = OPS_ROLES.some((r) => user.roles.includes(r));
  if (!hasRole) {
    return {
      error: problem(
        {
          type: "https://lms-219.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin or maestro role required.",
        },
        request,
      ),
    };
  }

  return { user };
}

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(historyItemSchema).max(40).optional(),
});

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseData(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const auth = requireOpsAccess(request);
  if (auth.error) return auth.error;

  // Parse body
  let parsed: z.infer<typeof bodySchema>;
  try {
    const body = await request.json();
    parsed = bodySchema.parse(body);
  } catch {
    return problem(
      {
        type: "https://lms-219.dev/problems/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid request body.",
      },
      request,
    );
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY ?? process.env.API__ANTHROPIC_API_KEY ?? "";

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runClaudeAgentLoopStream({
          apiKey,
          systemPrompt: MAESTRO_SYSTEM_PROMPT,
          history: parsed.history ?? [],
          userMessage: parsed.message,
          tools: MAESTRO_TOOLS,
          executeToolFn: async (name, args) =>
            executeMaestroTool(name, args, db),
          callbacks: {
            onDelta(text) {
              controller.enqueue(sseData({ delta: text }));
            },
          },
        });

        controller.enqueue(sseData({ done: true }));
        controller.close();
      } catch (err) {
        controller.enqueue(
          sseData({
            error:
              err instanceof Error ? err.message : "Unexpected error",
          }),
        );
        controller.close();
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
    },
  });
}
