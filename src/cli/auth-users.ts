import { randomUUID } from "node:crypto";
import {
  findUserByEmail,
  findUserById,
  listUsers,
  UserRecord,
} from "./user-read-repository";
import { createServiceToken, revokeServiceToken } from "./service-token-repository";
import { recordSystemAudit } from "./audit";
import { createAuditedUserRepository } from "./audited-repository-factories";
import { conflictError, notFoundError, usageError } from "./errors";
import { InvalidInputError, UserAlreadyExistsError } from "../core/domain/errors";
import { registerUser } from "../core/use-cases/register-user";
import {
  UserAdminService,
  UserNotFoundAppError,
  InvalidStatusAppError,
  RoleForbiddenAppError,
  RoleNotFoundAppError,
} from "../core/use-cases/user-admin-service";
import { SqliteUserAdminAdapter } from "../adapters/sqlite/user-admin-adapter";
import { openCliDb } from "@/platform/db";
import { requireSchemaCurrent } from "./schema-guard";
import { AppConfig } from "./types";
import { hashToken, requireWriteAuth } from "./write-auth";

export interface CreateTokenResult {
  id: string;
  name: string;
  token: string;
}

export const authTokenCreate = (
  config: AppConfig,
  requestId: string,
  name: string,
  ttlDays?: number,
): CreateTokenResult => {
  requireSchemaCurrent(config);

  if (!name.trim()) {
    throw usageError("Token name is required.");
  }

  const token = `sat_${randomUUID().replace(/-/g, "")}`;
  const tokenHash = hashToken(token);
  const id = randomUUID();
  createServiceToken(config, {
    id,
    name,
    tokenHash,
    createdAt: new Date().toISOString(),
  });

  recordSystemAudit(config, {
    action: "auth.token.create",
    requestId,
    metadata: {
      tokenId: id,
      name,
      ttlDays: ttlDays ?? null,
    },
  });

  return {
    id,
    name,
    token,
  };
};

export interface RevokeTokenResult {
  id: string;
  revoked: boolean;
}

export const authTokenRevoke = (config: AppConfig, requestId: string, id: string): RevokeTokenResult => {
  requireSchemaCurrent(config);

  const revoked = revokeServiceToken(config, {
    id,
    revokedAt: new Date().toISOString(),
  });

  if (!revoked) {
    throw notFoundError(`Token not found or already revoked: ${id}`);
  }

  recordSystemAudit(config, {
    action: "auth.token.revoke",
    requestId,
    metadata: {
      tokenId: id,
    },
  });

  return {
    id,
    revoked: true,
  };
};

const normalizeStatus = (status?: string): string => {
  if (!status) {
    return "PENDING";
  }

  const upper = status.toUpperCase();
  if (!["ACTIVE", "DISABLED", "PENDING"].includes(upper)) {
    throw usageError("Invalid status. Allowed: PENDING, ACTIVE, DISABLED.");
  }

  return upper;
};

export const userCreate = (
  config: AppConfig,
  requestId: string,
  email: string,
  status: string | undefined,
  token?: string,
): UserRecord => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  const normalizedStatus = normalizeStatus(status);
  const users = createAuditedUserRepository(config, {
    action: "user.create",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      userId: args.user.id,
      email: args.user.email,
    }),
  });

  try {
    const created = registerUser(
      {
        email,
        status: normalizedStatus,
      },
      {
        users,
        now: () => new Date().toISOString(),
        id: () => randomUUID(),
      },
    );

    return created;
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      throw conflictError(`User already exists for email: ${error.email}`);
    }
    if (error instanceof InvalidInputError) {
      throw usageError("Email is required.");
    }
    throw error;
  }
};

export const userList = (
  config: AppConfig,
  filters: { role?: string; status?: string; search?: string },
): UserRecord[] => {
  requireSchemaCurrent(config);
  return listUsers(config, filters);
};

export const userShow = (config: AppConfig, options: { id?: string; email?: string }): UserRecord => {
  requireSchemaCurrent(config);

  if (!options.id && !options.email) {
    throw usageError("Provide --id or --email.");
  }

  const row = options.id ? findUserById(config, options.id) : findUserByEmail(config, options.email!.toLowerCase());

  if (!row) {
    throw notFoundError("User not found.");
  }

  return row;
};

const buildUserAdminService = (config: AppConfig): UserAdminService => {
  const db = openCliDb(config);
  const adapter = new SqliteUserAdminAdapter(db);
  return new UserAdminService(adapter);
};

const setUserStatus = (
  config: AppConfig,
  requestId: string,
  id: string,
  status: "ACTIVE" | "DISABLED",
  action: "user.enable" | "user.disable",
  token?: string,
  reason?: string,
): UserRecord => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  try {
    const svc = buildUserAdminService(config);
    svc.setStatus({ userId: id, status });
  } catch (err) {
    if (err instanceof UserNotFoundAppError) {
      throw notFoundError(`User not found: ${id}`);
    }
    if (err instanceof InvalidStatusAppError) {
      throw usageError(`Invalid status: ${status}`);
    }
    throw err;
  }

  const updated = findUserById(config, id);
  if (!updated) {
    throw notFoundError(`User not found: ${id}`);
  }

  recordSystemAudit(config, {
    action,
    requestId,
    metadata: {
      userId: id,
      reason: reason ?? null,
    },
  });

  return updated;
};

export const userDisable = (
  config: AppConfig,
  requestId: string,
  id: string,
  token?: string,
  reason?: string,
): UserRecord => setUserStatus(config, requestId, id, "DISABLED", "user.disable", token, reason);

export const userEnable = (
  config: AppConfig,
  requestId: string,
  id: string,
  token?: string,
): UserRecord => setUserStatus(config, requestId, id, "ACTIVE", "user.enable", token);

export interface UserRoleMutationResult {
  userId: string;
  role: string;
}

export const userRoleAdd = (
  config: AppConfig,
  requestId: string,
  id: string,
  role: string,
  token?: string,
): UserRoleMutationResult => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  let result: { changed: boolean; role: string };
  try {
    const svc = buildUserAdminService(config);
    result = svc.addRole({ userId: id, role });
  } catch (err) {
    if (err instanceof UserNotFoundAppError) {
      throw notFoundError(`User not found: ${id}`);
    }
    if (err instanceof RoleNotFoundAppError) {
      throw notFoundError(`Role not found: ${err.role}`);
    }
    if (err instanceof RoleForbiddenAppError) {
      throw usageError(`Cannot mutate protected role: ${err.role}`);
    }
    throw err;
  }

  recordSystemAudit(config, {
    action: "user.role.add",
    requestId,
    metadata: {
      userId: id,
      role: result.role,
    },
  });

  return {
    userId: id,
    role: result.role,
  };
};

export const userRoleRemove = (
  config: AppConfig,
  requestId: string,
  id: string,
  role: string,
  token?: string,
): UserRoleMutationResult => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  let result: { changed: boolean; role: string };
  try {
    const svc = buildUserAdminService(config);
    result = svc.removeRole({ userId: id, role });
  } catch (err) {
    if (err instanceof UserNotFoundAppError) {
      throw notFoundError(`User not found: ${id}`);
    }
    if (err instanceof RoleForbiddenAppError) {
      throw usageError(`Cannot mutate protected role: ${err.role}`);
    }
    throw err;
  }

  recordSystemAudit(config, {
    action: "user.role.remove",
    requestId,
    metadata: {
      userId: id,
      role: result.role,
    },
  });

  return {
    userId: id,
    role: result.role,
  };
};
