import { randomUUID } from "node:crypto";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import type { FeedItem } from "@/lib/api/feed";
import { evaluateWorkflowRules } from "@/lib/api/workflow-engine";

export interface StoredFeedEvent {
  id: string;
  user_id: string;
  type: FeedItem["type"];
  title: string;
  description: string;
  action_url: string | null;
  created_at: string;
}

// Accept a pre-opened DB connection to allow callers to write feed events
// inside the same transaction that records the primary event.
export const writeFeedEvent = (
  db: ReturnType<typeof openCliDb>,
  input: {
    userId: string;
    type: FeedItem["type"];
    title: string;
    description: string;
    actionUrl?: string;
  },
): void => {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO feed_events (id, user_id, type, title, description, action_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    input.userId,
    input.type,
    input.title,
    input.description,
    input.actionUrl ?? null,
    now,
  );

  // Post-write hook — evaluate workflow rules. Never surfaces errors to caller.
  try {
    evaluateWorkflowRules(db, {
      id,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      description: input.description,
      action_url: input.actionUrl ?? null,
      created_at: now,
    });
  } catch {
    // Rule evaluation errors are isolated — never break feed event writes.
  }
};

export const listFeedEventsForUser = (
  userId: string,
  limit = 50,
): StoredFeedEvent[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    return db
      .prepare(
        "SELECT * FROM feed_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(userId, limit) as StoredFeedEvent[];
  } finally {
    db.close();
  }
};
