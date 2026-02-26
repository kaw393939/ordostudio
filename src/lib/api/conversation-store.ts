/**
 * conversation-store.ts
 *
 * SQLite helpers for the chat intake conversation lifecycle.
 * Owns all `db.prepare` calls related to intake_conversations.
 */

import { randomUUID } from "crypto";
import { openCliDb } from "@/platform/runtime";
import { AGENT_OPENING_MESSAGE } from "@/lib/api/agent-system-prompt";

type Db = ReturnType<typeof openCliDb>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  created_at: string;
  tool_call_id?: string;
  name?: string;
}

export interface ConversationRow {
  id: string;
  session_id: string;
  messages: string; // JSON-serialized ConversationMessage[]
  status: string;
  intake_request_id: string | null;
}

export interface LoadedConversation {
  conversation: ConversationRow;
  messages: ConversationMessage[];
}

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

export function loadConversation(db: Db, conversationId: string): ConversationRow | null {
  return (
    (db
      .prepare(
        `SELECT id, session_id, messages, status, intake_request_id
         FROM intake_conversations WHERE id = ?`,
      )
      .get(conversationId) as ConversationRow | undefined) ?? null
  );
}

export function createConversation(db: Db, sessionId: string): ConversationRow {
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
  return {
    id,
    session_id: sessionId,
    messages,
    status: "ACTIVE",
    intake_request_id: null,
  };
}

export function saveConversation(
  db: Db,
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
// Composite helpers
// ---------------------------------------------------------------------------

/**
 * Load an existing conversation by ID, or create a fresh one for the session.
 * Throws a Response (404/500) on failure so callers can return it directly.
 */
export function loadOrCreateConversation(
  db: Db,
  sessionId: string,
  conversationId: string | null,
): LoadedConversation {
  let conversation: ConversationRow;

  try {
    if (conversationId) {
      const existing = loadConversation(db, conversationId);
      if (!existing) {
        throw Object.assign(
          new Response(JSON.stringify({ error: "conversation not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }),
          { isHttpResponse: true },
        );
      }
      conversation = existing;
    } else {
      conversation = createConversation(db, sessionId);
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    if (err && typeof err === "object" && (err as { isHttpResponse?: boolean }).isHttpResponse) {
      throw err;
    }
    throw new Response(
      JSON.stringify({ error: "failed to load or create conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let messages: ConversationMessage[] = [];
  try {
    messages = JSON.parse(conversation.messages) as ConversationMessage[];
  } catch {
    messages = [];
  }

  return { conversation, messages };
}

/**
 * Append the assistant reply to the conversation and persist to DB.
 * If an intakeRequestId is provided, marks the conversation as COMPLETED.
 */
export function persistAssistantMessage(
  db: Db,
  conversation: ConversationRow,
  messages: ConversationMessage[],
  assistantContent: string,
  intakeRequestId: string | null,
): void {
  const assistantMsg: ConversationMessage = {
    role: "assistant",
    content: assistantContent,
    created_at: new Date().toISOString(),
  };
  messages.push(assistantMsg);
  saveConversation(db, conversation.id, messages, intakeRequestId ?? undefined);
}
