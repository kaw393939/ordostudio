/**
 * Platform-layer audit helpers.
 *
 * Low-level functions that write rows into the `audit_log` table.
 * These are used by both CLI commands and HTTP route handlers.
 */
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export const appendServiceAudit = (
  db: Database.Database,
  args: {
    action: string;
    requestId: string;
    targetType: "system" | "event" | "registration";
    metadata?: Record<string, unknown>;
  },
): void => {
  const metadataActorId = args.metadata?.actorId;
  const actorId =
    typeof metadataActorId === "string" && metadataActorId.trim().length > 0
      ? metadataActorId
      : null;
  const actorType: "USER" | "SERVICE" = actorId ? "USER" : "SERVICE";

  db.prepare(
    `
INSERT INTO audit_log (
  id,
  actor_type,
  actor_id,
  action,
  target_type,
  target_id,
  metadata,
  created_at,
  request_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
  ).run(
    randomUUID(),
    actorType,
    actorId,
    args.action,
    args.targetType,
    null,
    args.metadata ? JSON.stringify(args.metadata) : null,
    new Date().toISOString(),
    args.requestId,
  );
};

export const appendAuditLog = (
  db: Database.Database,
  args: {
    actorType: "USER" | "SERVICE";
    actorId: string | null;
    action: string;
    targetType: string;
    requestId: string;
    metadata?: Record<string, unknown>;
  },
): void => {
  db.prepare(
    `
INSERT INTO audit_log (
  id,
  actor_type,
  actor_id,
  action,
  target_type,
  target_id,
  metadata,
  created_at,
  request_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
  ).run(
    randomUUID(),
    args.actorType,
    args.actorId,
    args.action,
    args.targetType,
    null,
    args.metadata ? JSON.stringify(args.metadata) : null,
    new Date().toISOString(),
    args.requestId,
  );
};
