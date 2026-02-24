/**
 * GET /api/v1/onboarding/stream
 *
 * Server-Sent Events endpoint that streams onboarding progress updates.
 * The client connects once and receives real-time updates as steps complete.
 *
 * Stub implementation: sends current state on connect, then keeps alive
 * with periodic heartbeats. In production this would listen to a pub/sub
 * channel for real onboarding completion events.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      /* ── initial event: send current progress on connect ── */
      const initialData = JSON.stringify({
        type: "connected",
        message: "Onboarding stream connected",
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initialData}\n\n`));

      /* ── heartbeat: keep connection alive every 30 s ── */
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      /* ── clean up when client disconnects ── */
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* stream already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * Helper used by other API handlers to broadcast a step-completion event.
 * (Currently a no-op stub — in production this would publish to Redis/PG
 *  LISTEN/NOTIFY so the SSE stream above picks it up.)
 */
export function broadcastStepComplete(userId: string, stepId: string): void {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[onboarding:sse] step_complete userId=${userId} stepId=${stepId}`);
  }
}
