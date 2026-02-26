/**
 * parseAndValidateChatBody
 *
 * Parses the incoming POST body and returns a typed result or an early
 * Response with the appropriate error code.  No DB access — pure validation.
 */

export interface AttachmentInput {
  type: "image" | "document" | "text";
  mediaType: string;
  name: string;
  data: string; // base64
}

export interface ParsedChatBody {
  sessionId: string;
  userMessage: string;
  conversationId: string | null;
  attachments: AttachmentInput[];
}

type ParseOk = { ok: true; data: ParsedChatBody };
type ParseFail = { ok: false; response: Response };

export async function parseAndValidateChatBody(
  request: Request,
): Promise<ParseOk | ParseFail> {
  let raw: {
    session_id?: unknown;
    message?: unknown;
    conversation_id?: unknown;
    attachments?: unknown;
  };

  try {
    raw = (await request.json()) as typeof raw;
  } catch {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const sessionId = typeof raw.session_id === "string" ? raw.session_id.trim() : "";
  const userMessage = typeof raw.message === "string" ? raw.message.trim() : "";
  const conversationId =
    typeof raw.conversation_id === "string" ? raw.conversation_id.trim() : null;

  const attachments: AttachmentInput[] = Array.isArray(raw.attachments)
    ? (raw.attachments as AttachmentInput[]).filter(
        (a) => a && typeof a.data === "string" && typeof a.mediaType === "string",
      )
    : [];

  if (!sessionId) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  if (!userMessage && attachments.length === 0) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "message or attachments required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }

  return { ok: true, data: { sessionId, userMessage, conversationId, attachments } };
}
