/**
 * Conversation sweep — processes abandoned intake conversations.
 *
 * An ACTIVE conversation is considered abandoned when:
 * - It has been idle (updated_at) for longer than ABANDON_THRESHOLD_MINUTES
 * - It has no linked intake_request_id (the prospect never qualified)
 * - It has at least one user message (they engaged, then left)
 *
 * For each abandoned conversation we:
 * 1. Mark it ABANDONED
 * 2. Extract any partial signal from the messages (name, email, goal)
 * 3. Create or update a CRM contact if an email was found
 * 4. Write a feed event to every ADMIN user so Maestro can follow up
 * 5. Append an audit entry
 */

import { randomUUID } from "node:crypto";
import { openCliDb, appendAuditLog } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { upsertContact } from "@/lib/api/contacts";
import { writeFeedEvent } from "@/lib/api/feed-events";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Conversations idle longer than this are eligible for abandonment. */
export const ABANDON_THRESHOLD_MINUTES = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AbandonedSignal {
  firstName: string | null;
  email: string | null;
  partialGoal: string | null;
}

export interface SweepResult {
  swept: number;
  contactsCreated: number;
}

// ---------------------------------------------------------------------------
// Message signal extraction
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

/** Pull the first email address found anywhere in a message array. */
function extractEmail(messages: Array<{ role: string; content: string }>): string | null {
  for (const msg of messages) {
    const match = msg.content.match(EMAIL_RE);
    if (match) return match[0];
  }
  return null;
}

/**
 * Heuristic: use the first user message as the partial goal (their opening
 * intent), trimmed to 200 chars to keep feed events readable.
 */
function extractPartialGoal(messages: Array<{ role: string; content: string }>): string | null {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return null;
  const text = firstUser.content.trim();
  return text.length > 200 ? text.slice(0, 197) + "…" : text;
}

/**
 * Very light name extraction: look for a message that, after an assistant
 * "what's your name?" exchange, contains a short (≤4-word) user response
 * that looks like a name. Falls back to null rather than guessing badly.
 */
function extractFirstName(messages: Array<{ role: string; content: string }>): string | null {
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (
      prev.role === "assistant" &&
      /\bname\b/i.test(prev.content) &&
      curr.role === "user"
    ) {
      const candidate = curr.content.trim();
      // Accept only short values that don't look like a full sentence.
      const words = candidate.split(/\s+/);
      if (words.length <= 4 && candidate.length < 50 && !/[.?!,]$/.test(candidate)) {
        return words[0] ?? null; // take first word (first name)
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core sweep
// ---------------------------------------------------------------------------

export const sweepAbandonedConversations = (requestId?: string): SweepResult => {
  const reqId = requestId ?? randomUUID();
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const thresholdIso = new Date(
      Date.now() - ABANDON_THRESHOLD_MINUTES * 60 * 1000,
    ).toISOString();

    // Find eligible conversations.
    const stale = db
      .prepare(
        `SELECT id, session_id, messages
         FROM intake_conversations
         WHERE status = 'ACTIVE'
           AND intake_request_id IS NULL
           AND updated_at < ?
           AND json_array_length(messages) > 1`,  // at least 1 user turn beyond opening
      )
      .all(thresholdIso) as Array<{ id: string; session_id: string; messages: string }>;

    if (stale.length === 0) {
      return { swept: 0, contactsCreated: 0 };
    }

    // Load all ADMIN user ids once for feed events.
    const adminUsers = db
      .prepare(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE r.name IN ('ADMIN', 'SUPER_ADMIN')`,
      )
      .all() as Array<{ id: string }>;

    const now = new Date().toISOString();
    let contactsCreated = 0;

    const doSweep = db.transaction(() => {
      for (const row of stale) {
        let messages: Array<{ role: string; content: string }> = [];
        try {
          messages = JSON.parse(row.messages) as typeof messages;
        } catch {
          messages = [];
        }

        const signal: AbandonedSignal = {
          firstName: extractFirstName(messages),
          email: extractEmail(messages),
          partialGoal: extractPartialGoal(messages),
        };

        // Mark abandoned.
        db.prepare(
          `UPDATE intake_conversations SET status = 'ABANDONED', updated_at = ? WHERE id = ?`,
        ).run(now, row.id);

        // Create CRM contact if we have an email.
        if (signal.email) {
          upsertContact(db, {
            email: signal.email,
            fullName: signal.firstName,
            source: "AGENT",
          });
          contactsCreated++;
        }

        // Notify each admin via feed event.
        const goalSnippet = signal.partialGoal
          ? ` They said: "${signal.partialGoal}"`
          : "";
        const nameLabel = signal.firstName ?? signal.email ?? "Unknown visitor";

        for (const admin of adminUsers) {
          writeFeedEvent(db, {
            userId: admin.id,
            type: "IntakeAbandoned",
            title: `Abandoned conversation — ${nameLabel}`,
            description:
              `A prospect started a conversation but left before qualifying.${goalSnippet} ` +
              `Consider a manual follow-up${signal.email ? ` at ${signal.email}` : ""}.`,
          });
        }

        // Audit entry.
        appendAuditLog(db, {
          actorType: "SERVICE",
          actorId: null,
          action: "conversation.abandoned",
          targetType: "intake_conversation",
          requestId: reqId,
          metadata: {
            conversationId: row.id,
            sessionId: row.session_id,
            hadEmail: !!signal.email,
            hadName: !!signal.firstName,
            hadGoal: !!signal.partialGoal,
          },
        });
      }
    });

    doSweep();

    return { swept: stale.length, contactsCreated };
  } finally {
    db.close();
  }
};
