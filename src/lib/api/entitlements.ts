import { randomUUID } from "node:crypto";

import { openCliDb, appendAuditLog } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";

export type EntitlementStatus = "GRANTED" | "REVOKED";

export type EntitlementRecord = {
  id: string;
  user_id: string;
  entitlement_key: string;
  status: EntitlementStatus;
  granted_by: string | null;
  granted_at: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type UserDiscordAccount = {
  user_id: string;
  discord_user_id: string;
  created_at: string;
  updated_at: string;
};

export class EntitlementNotFoundError extends Error {
  constructor(public readonly userId: string, public readonly entitlementKey: string) {
    super(`Entitlement not found: user=${userId} key=${entitlementKey}`);
    this.name = "EntitlementNotFoundError";
  }
}

export class EntitlementInputError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid entitlement input: ${reason}`);
    this.name = "EntitlementInputError";
  }
}

const normalizeKey = (input: string): string => input.trim().toUpperCase();

const requireKey = (input: string): string => {
  const key = normalizeKey(input);
  if (key.length === 0) {
    throw new EntitlementInputError("entitlement_key_required");
  }
  if (key.length > 64) {
    throw new EntitlementInputError("entitlement_key_too_long");
  }
  return key;
};

const optionalReason = (input: string | null | undefined): string | null => {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, 500);
};

export const listEntitlementsAdmin = (filters?: { userId?: string; key?: string; status?: EntitlementStatus }) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters?.userId) {
      where.push("user_id = ?");
      params.push(filters.userId);
    }

    if (filters?.key) {
      where.push("entitlement_key = ?");
      params.push(requireKey(filters.key));
    }

    if (filters?.status) {
      where.push("status = ?");
      params.push(filters.status);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
SELECT id, user_id, entitlement_key, status, granted_by, granted_at, revoked_by, revoked_at, reason, created_at, updated_at
FROM entitlements
${whereSql}
ORDER BY updated_at DESC
LIMIT 200
`,
      )
      .all(...params) as EntitlementRecord[];

    return {
      count: rows.length,
      items: rows,
    };
  } finally {
    db.close();
  }
};

export const grantEntitlementAdmin = (input: {
  userId: string;
  entitlementKey: string;
  actorId: string;
  requestId: string;
  reason?: string | null;
}): EntitlementRecord => {
  const key = requireKey(input.entitlementKey);
  if (!input.userId || input.userId.trim().length === 0) {
    throw new EntitlementInputError("user_id_required");
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();

    const existing = db
      .prepare(
        "SELECT id, user_id, entitlement_key, status, granted_by, granted_at, revoked_by, revoked_at, reason, created_at, updated_at FROM entitlements WHERE user_id = ? AND entitlement_key = ?",
      )
      .get(input.userId, key) as EntitlementRecord | undefined;

    if (!existing) {
      const id = randomUUID();
      db.prepare(
        `
INSERT INTO entitlements (
  id, user_id, entitlement_key, status, granted_by, granted_at, revoked_by, revoked_at, reason, created_at, updated_at
) VALUES (?, ?, ?, 'GRANTED', ?, ?, NULL, NULL, ?, ?, ?)
`,
      ).run(id, input.userId, key, input.actorId, now, optionalReason(input.reason), now, now);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: input.actorId,
        action: "admin.entitlement.grant",
        targetType: "entitlement",
        requestId: input.requestId,
        metadata: { userId: input.userId, entitlementKey: key },
      });

      return db
        .prepare(
          "SELECT id, user_id, entitlement_key, status, granted_by, granted_at, revoked_by, revoked_at, reason, created_at, updated_at FROM entitlements WHERE id = ?",
        )
        .get(id) as EntitlementRecord;
    }

    if (existing.status === "GRANTED") {
      return existing;
    }

    db.prepare(
      "UPDATE entitlements SET status = 'GRANTED', granted_by = ?, granted_at = ?, revoked_by = NULL, revoked_at = NULL, reason = ?, updated_at = ? WHERE id = ?",
    ).run(input.actorId, now, optionalReason(input.reason), now, existing.id);

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "admin.entitlement.grant",
      targetType: "entitlement",
      requestId: input.requestId,
      metadata: { userId: input.userId, entitlementKey: key },
    });

    return db
      .prepare(
        "SELECT id, user_id, entitlement_key, status, granted_by, granted_at, revoked_by, revoked_at, reason, created_at, updated_at FROM entitlements WHERE id = ?",
      )
      .get(existing.id) as EntitlementRecord;
  } finally {
    db.close();
  }
};

export const revokeEntitlementAdmin = (input: {
  userId: string;
  entitlementKey: string;
  actorId: string;
  requestId: string;
  reason?: string | null;
}): EntitlementRecord => {
  const key = requireKey(input.entitlementKey);
  if (!input.userId || input.userId.trim().length === 0) {
    throw new EntitlementInputError("user_id_required");
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const found = db
      .prepare(
        "SELECT id, user_id, entitlement_key, status, granted_by, granted_at, revoked_by, revoked_at, reason, created_at, updated_at FROM entitlements WHERE user_id = ? AND entitlement_key = ?",
      )
      .get(input.userId, key) as EntitlementRecord | undefined;

    if (!found) {
      throw new EntitlementNotFoundError(input.userId, key);
    }

    if (found.status === "REVOKED") {
      return found;
    }

    const now = new Date().toISOString();

    db.prepare(
      "UPDATE entitlements SET status = 'REVOKED', revoked_by = ?, revoked_at = ?, reason = ?, updated_at = ? WHERE id = ?",
    ).run(input.actorId, now, optionalReason(input.reason), now, found.id);

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "admin.entitlement.revoke",
      targetType: "entitlement",
      requestId: input.requestId,
      metadata: { userId: input.userId, entitlementKey: key },
    });

    return db
      .prepare(
        "SELECT id, user_id, entitlement_key, status, granted_by, granted_at, revoked_by, revoked_at, reason, created_at, updated_at FROM entitlements WHERE id = ?",
      )
      .get(found.id) as EntitlementRecord;
  } finally {
    db.close();
  }
};

export const upsertUserDiscordAccountAdmin = (input: {
  userId: string;
  discordUserId: string;
  actorId: string;
  requestId: string;
}): UserDiscordAccount => {
  const userId = input.userId.trim();
  const discordUserId = input.discordUserId.trim();

  if (userId.length === 0) {
    throw new EntitlementInputError("user_id_required");
  }
  if (discordUserId.length === 0) {
    throw new EntitlementInputError("discord_user_id_required");
  }
  if (!/^\d{6,32}$/.test(discordUserId)) {
    throw new EntitlementInputError("discord_user_id_invalid");
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();

    const existing = db
      .prepare("SELECT user_id, discord_user_id, created_at, updated_at FROM user_discord_accounts WHERE user_id = ?")
      .get(userId) as UserDiscordAccount | undefined;

    if (!existing) {
      db.prepare(
        "INSERT INTO user_discord_accounts (user_id, discord_user_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ).run(userId, discordUserId, now, now);
    } else {
      db.prepare("UPDATE user_discord_accounts SET discord_user_id = ?, updated_at = ? WHERE user_id = ?").run(
        discordUserId,
        now,
        userId,
      );
    }

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "admin.discord.link",
      targetType: "user_discord_account",
      requestId: input.requestId,
      metadata: { userId, discordUserId },
    });

    return db
      .prepare("SELECT user_id, discord_user_id, created_at, updated_at FROM user_discord_accounts WHERE user_id = ?")
      .get(userId) as UserDiscordAccount;
  } finally {
    db.close();
  }
};
