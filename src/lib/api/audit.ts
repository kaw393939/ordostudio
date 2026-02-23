import { resolveConfig } from "@/platform/config";
import { openCliDb as openDb } from "@/platform/runtime";

export type AuditEntry = {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  request_id: string;
};

const sensitiveKey = (key: string) => /(token|password|secret|email)/i.test(key);

const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input)) {
      output[key] = sensitiveKey(key) ? "[REDACTED]" : redactValue(nested);
    }
    return output;
  }

  return value;
};

const parseAndRedactMetadata = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const redacted = redactValue(parsed);
    if (redacted && typeof redacted === "object" && !Array.isArray(redacted)) {
      return redacted as Record<string, unknown>;
    }
    return { value: redacted };
  } catch {
    return null;
  }
};

export const listAuditEntries = (filters: {
  action?: string;
  actor_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): { count: number; limit: number; offset: number; items: AuditEntry[] } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openDb(config);

  try {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.action) {
      clauses.push("action = ?");
      params.push(filters.action);
    }

    if (filters.actor_id) {
      clauses.push("actor_id = ?");
      params.push(filters.actor_id);
    }

    if (filters.from) {
      clauses.push("created_at >= ?");
      params.push(filters.from);
    }

    if (filters.to) {
      clauses.push("created_at <= ?");
      params.push(filters.to);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);

    const rows = db
      .prepare(
        `
SELECT id, actor_type, actor_id, action, target_type, target_id, metadata, created_at, request_id
FROM audit_log
${whereClause}
ORDER BY created_at DESC
LIMIT ? OFFSET ?
`,
      )
      .all(...params, limit, offset) as Array<{
      id: string;
      actor_type: string;
      actor_id: string | null;
      action: string;
      target_type: string;
      target_id: string | null;
      metadata: string | null;
      created_at: string;
      request_id: string;
    }>;

    const items: AuditEntry[] = rows.map((row) => ({
      id: row.id,
      actor_type: row.actor_type,
      actor_id: row.actor_id,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      metadata: parseAndRedactMetadata(row.metadata),
      created_at: row.created_at,
      request_id: row.request_id,
    }));

    return {
      count: items.length,
      limit,
      offset,
      items,
    };
  } finally {
    db.close();
  }
};
