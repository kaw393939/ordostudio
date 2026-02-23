import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { SqliteUserReadRepository } from "@/adapters/sqlite/read-repositories";
import { SqliteUserAdminAdapter } from "@/adapters/sqlite/user-admin-adapter";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import {
  UserAdminService,
  UserNotFoundAppError,
  InvalidStatusAppError,
  RoleForbiddenAppError,
} from "@/core/use-cases/user-admin-service";

export class UserNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`User not found: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

export class InvalidUserStatusError extends Error {
  constructor(public readonly status: string) {
    super(`Invalid user status: ${status}`);
    this.name = "InvalidUserStatusError";
  }
}

export class SuperAdminRoleForbiddenError extends Error {
  constructor() {
    super("SUPER_ADMIN role changes are CLI-only");
    this.name = "SuperAdminRoleForbiddenError";
  }
}

const appendAudit = (
  db: Database.Database,
  action: string,
  actorId: string,
  requestId: string,
  metadata?: Record<string, unknown>,
): void => {
  appendAuditLog(db, {
    actorType: "USER",
    actorId,
    action,
    targetType: "user",
    requestId,
    metadata,
  });
};

const getRolesForUser = (db: Database.Database, userId: string): string[] => {
  const rows = db
    .prepare(
      `
SELECT r.name
FROM roles r
JOIN user_roles ur ON ur.role_id = r.id
WHERE ur.user_id = ?
ORDER BY r.name ASC
`,
    )
    .all(userId) as { name: string }[];
  return rows.map((row) => row.name);
};

const ensureRoleExists = (db: Database.Database, role: string): string => {
  const normalizedRole = role.toUpperCase();
  const found = db.prepare("SELECT id FROM roles WHERE name = ?").get(normalizedRole) as
    | { id: string }
    | undefined;

  if (found) {
    return found.id;
  }

  const id = randomUUID();
  db.prepare("INSERT INTO roles (id, name) VALUES (?, ?)").run(id, normalizedRole);
  return id;
};

const toUserResponse = (
  db: Database.Database,
  row: { id: string; email: string; status: string; created_at: string; updated_at: string },
) => ({
  ...row,
  roles: getRolesForUser(db, row.id),
});

export const listUsers = (filters: {
  role?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const reads = new SqliteUserReadRepository(config);
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const rows = reads.list({
    role: filters.role,
    status: filters.status,
    search: filters.search,
    limit,
    offset,
  });

  return {
    count: rows.length,
    items: rows,
    limit,
    offset,
  };
};

export const getUserById = (id: string) => {
  const config = resolveConfig({ envVars: process.env });
  const reads = new SqliteUserReadRepository(config);
  const found = reads.findById(id);
  if (!found) {
    throw new UserNotFoundError(id);
  }
  return found;
};

export const updateUserStatus = (
  id: string,
  status: string,
  actorId: string,
  requestId: string,
) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const result = db.transaction(() => {
      const adapter = new SqliteUserAdminAdapter(db);
      const svc = new UserAdminService(adapter);

      try {
        svc.setStatus({ userId: id, status });
      } catch (err) {
        if (err instanceof UserNotFoundAppError) throw new UserNotFoundError(id);
        if (err instanceof InvalidStatusAppError) throw new InvalidUserStatusError(status);
        throw err;
      }

      const normalizedStatus = status.trim().toUpperCase();
      appendAudit(db, "api.user.update", actorId, requestId, {
        userId: id,
        status: normalizedStatus,
      });

      const row = db
        .prepare("SELECT id, email, status, created_at, updated_at FROM users WHERE id = ?")
        .get(id) as {
        id: string;
        email: string;
        status: string;
        created_at: string;
        updated_at: string;
      };

      return toUserResponse(db, row);
    })();

    return result;
  } finally {
    db.close();
  }
};

export const addUserRole = (id: string, role: string, actorId: string, requestId: string) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const result = db.transaction(() => {
      // Ensure role row exists (auto-create is HTTP-specific behaviour)
      const normalizedRole = role.toUpperCase();
      ensureRoleExists(db, normalizedRole);

      const adapter = new SqliteUserAdminAdapter(db);
      const svc = new UserAdminService(adapter);

      let svcResult: { changed: boolean; role: string };
      try {
        svcResult = svc.addRole({ userId: id, role });
      } catch (err) {
        if (err instanceof UserNotFoundAppError) throw new UserNotFoundError(id);
        if (err instanceof RoleForbiddenAppError) throw new SuperAdminRoleForbiddenError();
        throw err;
      }

      appendAudit(db, "api.user.role.add", actorId, requestId, {
        userId: id,
        role: svcResult.role,
        changed: svcResult.changed,
      });

      return svcResult;
    })();

    return result;
  } finally {
    db.close();
  }
};

export const removeUserRole = (id: string, role: string, actorId: string, requestId: string) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const result = db.transaction(() => {
      const adapter = new SqliteUserAdminAdapter(db);
      const svc = new UserAdminService(adapter);

      let svcResult: { changed: boolean; role: string };
      try {
        svcResult = svc.removeRole({ userId: id, role });
      } catch (err) {
        if (err instanceof UserNotFoundAppError) throw new UserNotFoundError(id);
        if (err instanceof RoleForbiddenAppError) throw new SuperAdminRoleForbiddenError();
        throw err;
      }

      appendAudit(db, "api.user.role.remove", actorId, requestId, {
        userId: id,
        role: svcResult.role,
        changed: svcResult.changed,
      });

      return svcResult;
    })();

    return result;
  } finally {
    db.close();
  }
};

export const updateUserProfile = (
  id: string,
  profile: { display_name?: string; bio?: string; profile_picture_url?: string },
) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  const updates: string[] = [];
  const params: any[] = [];

  if (profile.display_name !== undefined) {
    updates.push("display_name = ?");
    params.push(profile.display_name);
  }
  if (profile.bio !== undefined) {
    updates.push("bio = ?");
    params.push(profile.bio);
  }
  if (profile.profile_picture_url !== undefined) {
    updates.push("profile_picture_url = ?");
    params.push(profile.profile_picture_url);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  const stmt = db.prepare(`
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = ?
  `);

  stmt.run(...params);
};
