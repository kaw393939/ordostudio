/**
 * rate-limiter.ts
 *
 * Per-conversation turn-count limiter.
 * Returns an SSE streaming Response when the cap is reached so the caller can
 * return it directly without touching the database.
 */

import type { ConversationMessage } from "@/lib/api/conversation-store";

const RATE_LIMIT_DELTA =
  "We've reached the end of our conversation. Based on what you've shared, " +
  "we'll follow up within 1 business day.";

function sseChunk(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export type RateLimitResult =
  | { limited: false }
  | { limited: true; response: Response };

/**
 * Check whether the conversation has exceeded `maxTurns` user turns.
 * If so, returns an SSE streaming Response containing a polite closing
 * message; otherwise returns `{ limited: false }`.
 */
export function checkRateLimit(
  messages: ConversationMessage[],
  maxTurns: number,
  conversationId: string,
): RateLimitResult {
  const userTurns = messages.filter((m) => m.role === "user").length;

  if (userTurns < maxTurns) {
    return { limited: false };
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseChunk({ delta: RATE_LIMIT_DELTA })));
      controller.enqueue(
        encoder.encode(sseChunk({ done: true, conversation_id: conversationId })),
      );
      controller.close();
    },
  });

  return {
    limited: true,
    response: new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }),
  };
}
