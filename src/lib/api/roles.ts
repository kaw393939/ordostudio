import { randomUUID } from "node:crypto";
import { openCliDb } from "../../platform/runtime";
import { resolveConfig } from "../../platform/config";

export interface RoleRequest {
  id: string;
  user_id: string;
  requested_role_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  context: any;
  created_at: string;
  updated_at: string;
}

export interface RoleRequestWithDetails extends RoleRequest {
  user_email: string;
  requested_role_name: string;
}

export function createRoleRequest(
  userId: string,
  requestedRoleId: string,
  context: any
): RoleRequest {
  const db = openCliDb(resolveConfig({ envVars: process.env }));
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO role_requests (id, user_id, requested_role_id, status, context, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, requestedRoleId, "PENDING", JSON.stringify(context), now, now);

  return {
    id,
    user_id: userId,
    requested_role_id: requestedRoleId,
    status: "PENDING",
    context,
    created_at: now,
    updated_at: now,
  };
}

export function getRoleByName(name: string): { id: string; name: string } | undefined {
  const db = openCliDb(resolveConfig({ envVars: process.env }));
  return db.prepare("SELECT id, name FROM roles WHERE name = ?").get(name) as any;
}

export function getPendingRoleRequest(userId: string, requestedRoleId: string): RoleRequest | undefined {
  const db = openCliDb(resolveConfig({ envVars: process.env }));
  const row = db.prepare(
    "SELECT * FROM role_requests WHERE user_id = ? AND requested_role_id = ? AND status = 'PENDING'"
  ).get(userId, requestedRoleId) as any;

  if (!row) return undefined;

  return {
    ...row,
    context: row.context ? JSON.parse(row.context) : null,
  };
}

export function listRoleRequests(options: {
  limit?: number;
  offset?: number;
}): { items: RoleRequestWithDetails[]; count: number; limit: number; offset: number } {
  const db = openCliDb(resolveConfig({ envVars: process.env }));
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const countRow = db.prepare("SELECT COUNT(*) as count FROM role_requests").get() as { count: number };
  const count = countRow.count;

  const rows = db.prepare(`
    SELECT rr.*, u.email as user_email, r.name as requested_role_name
    FROM role_requests rr
    JOIN users u ON rr.user_id = u.id
    JOIN roles r ON rr.requested_role_id = r.id
    ORDER BY rr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];

  const items = rows.map((row) => ({
    ...row,
    context: row.context ? JSON.parse(row.context) : null,
  }));

  return { items, count, limit, offset };
}

export function updateRoleRequestStatus(
  id: string,
  status: "APPROVED" | "REJECTED"
): RoleRequest | undefined {
  const db = openCliDb(resolveConfig({ envVars: process.env }));
  const now = new Date().toISOString();

  const run = db.transaction(() => {
    const request = db.prepare("SELECT * FROM role_requests WHERE id = ?").get(id) as any;
    if (!request) return undefined;

    db.prepare("UPDATE role_requests SET status = ?, updated_at = ? WHERE id = ?").run(status, now, id);

    if (status === "APPROVED") {
      db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(
        request.user_id,
        request.requested_role_id
      );
    }

    return {
      ...request,
      status,
      updated_at: now,
      context: request.context ? JSON.parse(request.context) : null,
    };
  });

  return run();
}
