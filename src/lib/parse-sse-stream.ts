/**
 * parseSSEStream — pure SSE decoder for the Studio Ordo chat stream.
 *
 * Zero React / Next.js imports. Testable in any JS runtime (Node, JSDOM, Edge).
 *
 * Protocol emitted by /api/v1/agent/chat:
 *   data: {"delta":"Hello"}\n\n
 *   data: {"toolCall":{"name":"...","args":{}}}\n\n
 *   data: {"toolResult":{"name":"...","content":"..."}}\n\n
 *   data: {"done":true,"conversationId":"abc","sessionId":"xyz"}\n\n
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SSEHandlers {
  /** Called for each text token — append to the current assistant message. */
  onDelta: (delta: string) => void;

  /** Called when the stream is complete. */
  onDone: (meta: {
    conversationId: string | null;
    sessionId: string | null;
    intakeSubmitted?: boolean;
  }) => void;

  /** Called when a tool call starts. */
  onToolCall: (call: { name: string; args: unknown }) => void;

  /** Called when a tool result arrives. */
  onToolResult: (result: { name: string; content: string }) => void;

  /** Called on any parse error or unrecoverable network error. */
  onError: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Reads an SSE stream from a ReadableStreamDefaultReader<Uint8Array> and
 * dispatches events to the provided handlers. Returns when the stream ends.
 *
 * Frames are separated by double newlines (`\n\n`). Each frame must begin with
 * `data:` per the SSE spec. The `[DONE]` sentinel (used by some providers) is
 * silently ignored.
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: SSEHandlers,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by double newlines
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? ""; // last item may be incomplete

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data:")) continue;

        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          handlers.onError(new Error(`SSE parse error: ${raw}`));
          continue;
        }

        if (!parsed || typeof parsed !== "object") continue;
        const msg = parsed as Record<string, unknown>;

        if (typeof msg.delta === "string") {
          handlers.onDelta(msg.delta);
        } else if (msg.toolCall) {
          handlers.onToolCall(
            msg.toolCall as { name: string; args: unknown },
          );
        } else if (msg.toolResult) {
          handlers.onToolResult(
            msg.toolResult as { name: string; content: string },
          );
        } else if (msg.done) {
          handlers.onDone({
            conversationId:
              typeof msg.conversationId === "string"
                ? msg.conversationId
                : null,
            sessionId:
              typeof msg.sessionId === "string" ? msg.sessionId : null,
            intakeSubmitted: msg.intake_submitted === true || msg.intakeSubmitted === true,
          });
        }
      }
    }
  } catch (err) {
    handlers.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
