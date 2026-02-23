import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

export interface SessionUserRow {
  id: string;
  email: string;
  status: string;
}

export interface ActiveSessionDetailRow {
  session_id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SessionWithUserRow extends SessionUserRow {
  session_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string | null;
}

export interface PasswordResetRow {
  id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
}

export interface EmailVerificationRow {
  id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
}

export interface UserStatusRow {
  id: string;
  status: string;
}

export interface LoginCredentialRow {
  id: string;
  email: string;
  status: string;
  password_hash: string;
}

export const ensureRoleByName = (db: Database.Database, role: "USER" | "ADMIN" | "SUPER_ADMIN"): string => {
  const found = db.prepare("SELECT id FROM roles WHERE name = ?").get(role) as { id: string } | undefined;
  if (found) {
    return found.id;
  }

  const id = randomUUID();
  db.prepare("INSERT INTO roles (id, name) VALUES (?, ?)").run(id, role);
  return id;
};

export const insertUserAccount = (
  db: Database.Database,
  args: {
    id: string;
    email: string;
    status: string;
    createdAtIso: string;
    updatedAtIso: string;
  },
): void => {
  db.prepare("INSERT INTO users (id, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    args.id,
    args.email,
    args.status,
    args.createdAtIso,
    args.updatedAtIso,
  );
};

export const tryInsertUserAccount = (
  db: Database.Database,
  args: {
    id: string;
    email: string;
    status: string;
    createdAtIso: string;
    updatedAtIso: string;
  },
): boolean => {
  try {
    insertUserAccount(db, args);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: users.email")) {
      return false;
    }
    throw error;
  }
};

export const insertApiCredential = (
  db: Database.Database,
  args: { userId: string; passwordHash: string; createdAtIso: string; updatedAtIso: string },
): void => {
  db.prepare("INSERT INTO api_credentials (user_id, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
    args.userId,
    args.passwordHash,
    args.createdAtIso,
    args.updatedAtIso,
  );
};

export const assignUserRole = (db: Database.Database, args: { userId: string; roleId: string }): void => {
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(args.userId, args.roleId);
};

export const insertPolicyConsent = (
  db: Database.Database,
  args: {
    id: string;
    userId: string;
    policy: string;
    acceptedAtIso: string;
    policyVersion: string;
  },
): void => {
  db.prepare(
    "INSERT INTO api_policy_consents (id, user_id, policy, accepted_at, policy_version) VALUES (?, ?, ?, ?, ?)",
  ).run(args.id, args.userId, args.policy, args.acceptedAtIso, args.policyVersion);
};

export const insertApiSession = (
  db: Database.Database,
  args: {
    id: string;
    userId: string;
    sessionTokenHash: string;
    createdAtIso: string;
    expiresAtIso: string;
    lastSeenAtIso: string;
    ipAddress?: string;
    userAgent?: string;
  },
): void => {
  db.prepare(
    `
INSERT INTO api_sessions (
  id,
  user_id,
  session_token_hash,
  created_at,
  expires_at,
  last_seen_at,
  revoked_at,
  ip_address,
  user_agent
) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
`,
  ).run(
    args.id,
    args.userId,
    args.sessionTokenHash,
    args.createdAtIso,
    args.expiresAtIso,
    args.lastSeenAtIso,
    args.ipAddress ?? null,
    args.userAgent ?? null,
  );
};

export const listUserRoleNames = (db: Database.Database, userId: string): string[] => {
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

export const findActiveSessionUserByTokenHash = (
  db: Database.Database,
  args: { tokenHash: string; nowIso: string },
): SessionUserRow | undefined => {
  return db
    .prepare(
      `
SELECT u.id, u.email, u.status
FROM api_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.session_token_hash = ?
  AND s.revoked_at IS NULL
  AND s.expires_at > ?
`,
    )
    .get(args.tokenHash, args.nowIso) as SessionUserRow | undefined;
};

export const revokeActiveSessionByTokenHash = (
  db: Database.Database,
  args: { tokenHash: string; revokedAtIso: string },
): number => {
  return db
    .prepare("UPDATE api_sessions SET revoked_at = ? WHERE session_token_hash = ? AND revoked_at IS NULL")
    .run(args.revokedAtIso, args.tokenHash).changes;
};

export const findActiveSessionWithUserByTokenHash = (
  db: Database.Database,
  args: { tokenHash: string; nowIso: string },
): SessionWithUserRow | undefined => {
  return db
    .prepare(
      `
SELECT u.id, u.email, u.status, s.id AS session_id, s.created_at, s.expires_at, s.last_seen_at
FROM api_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.session_token_hash = ?
  AND s.revoked_at IS NULL
  AND s.expires_at > ?
`,
    )
    .get(args.tokenHash, args.nowIso) as SessionWithUserRow | undefined;
};

export const updateSessionActivity = (
  db: Database.Database,
  args: { sessionId: string; lastSeenAtIso: string; expiresAtIso: string },
): void => {
  db.prepare(
    "UPDATE api_sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?",
  ).run(args.lastSeenAtIso, args.expiresAtIso, args.sessionId);
};

export const listActiveSessionsForUser = (
  db: Database.Database,
  args: { userId: string; nowIso: string },
): ActiveSessionDetailRow[] => {
  return db
    .prepare(
      `
SELECT id AS session_id, user_id, created_at, expires_at, last_seen_at, ip_address, user_agent
FROM api_sessions
WHERE user_id = ?
  AND revoked_at IS NULL
  AND expires_at > ?
ORDER BY created_at DESC
`,
    )
    .all(args.userId, args.nowIso) as ActiveSessionDetailRow[];
};

export const revokeSessionById = (
  db: Database.Database,
  args: { sessionId: string; userId: string; revokedAtIso: string },
): number => {
  return db
    .prepare(
      "UPDATE api_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
    )
    .run(args.revokedAtIso, args.sessionId, args.userId).changes;
};

export const revokeAllSessionsForUser = (
  db: Database.Database,
  args: { userId: string; revokedAtIso: string },
): number => {
  return db
    .prepare(
      "UPDATE api_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    )
    .run(args.revokedAtIso, args.userId).changes;
};

export const revokeAllSessionsExceptCurrent = (
  db: Database.Database,
  args: { userId: string; currentSessionId: string; revokedAtIso: string },
): number => {
  return db
    .prepare(
      "UPDATE api_sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL",
    )
    .run(args.revokedAtIso, args.userId, args.currentSessionId).changes;
};

export const hasUserById = (db: Database.Database, userId: string): boolean => {
  const found = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
  return Boolean(found);
};

export const applyAccountDeletion = (
  db: Database.Database,
  args: { userId: string; nowIso: string; retentionUntilIso: string; deletionId: string },
): void => {
  db.prepare("UPDATE users SET status = 'DISABLED', email = ?, updated_at = ? WHERE id = ?").run(
    `deleted+${args.userId}@deleted.local`,
    args.nowIso,
    args.userId,
  );

  db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(args.userId);

  db.prepare("UPDATE api_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(
    args.nowIso,
    args.userId,
  );

  db.prepare(
    "UPDATE event_registrations SET status = 'CANCELLED' WHERE user_id = ? AND status IN ('REGISTERED', 'WAITLISTED', 'CHECKED_IN')",
  ).run(args.userId);

  db.prepare(
    "INSERT INTO api_account_deletions (id, user_id, deleted_at, retention_until) VALUES (?, ?, ?, ?)",
  ).run(args.deletionId, args.userId, args.nowIso, args.retentionUntilIso);
};

export const findUserIdByEmail = (db: Database.Database, email: string): string | undefined => {
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
  return row?.id;
};

export const findLoginCredentialByEmail = (
  db: Database.Database,
  email: string,
): LoginCredentialRow | undefined => {
  return db
    .prepare(
      `
SELECT u.id, u.email, u.status, ac.password_hash
FROM users u
JOIN api_credentials ac ON ac.user_id = u.id
WHERE u.email = ?
`,
    )
    .get(email) as LoginCredentialRow | undefined;
};

export const markUnusedPasswordResetsUsed = (
  db: Database.Database,
  args: { userId: string; usedAtIso: string },
): void => {
  db.prepare("UPDATE api_password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(
    args.usedAtIso,
    args.userId,
  );
};

export const insertPasswordReset = (
  db: Database.Database,
  args: {
    id: string;
    userId: string;
    tokenHash: string;
    createdAtIso: string;
    expiresAtIso: string;
  },
): void => {
  db.prepare(
    `
INSERT INTO api_password_resets (
  id,
  user_id,
  token_hash,
  created_at,
  expires_at,
  used_at
) VALUES (?, ?, ?, ?, ?, NULL)
`,
  ).run(args.id, args.userId, args.tokenHash, args.createdAtIso, args.expiresAtIso);
};

export const findPasswordResetByTokenHash = (
  db: Database.Database,
  tokenHash: string,
): PasswordResetRow | undefined => {
  return db
    .prepare(
      `
SELECT id, user_id, expires_at, used_at
FROM api_password_resets
WHERE token_hash = ?
`,
    )
    .get(tokenHash) as PasswordResetRow | undefined;
};

export const updateCredentialPasswordHash = (
  db: Database.Database,
  args: { userId: string; passwordHash: string; updatedAtIso: string },
): void => {
  db.prepare("UPDATE api_credentials SET password_hash = ?, updated_at = ? WHERE user_id = ?").run(
    args.passwordHash,
    args.updatedAtIso,
    args.userId,
  );
};

export const markPasswordResetUsedById = (
  db: Database.Database,
  args: { id: string; usedAtIso: string },
): void => {
  db.prepare("UPDATE api_password_resets SET used_at = ? WHERE id = ?").run(args.usedAtIso, args.id);
};

export const findLatestPasswordResetIdForUser = (db: Database.Database, userId: string): string | undefined => {
  const row = db
    .prepare(
      `
SELECT id
FROM api_password_resets
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 1
`,
    )
    .get(userId) as { id: string } | undefined;
  return row?.id;
};

export const findUserStatusByEmail = (db: Database.Database, email: string): UserStatusRow | undefined => {
  return db.prepare("SELECT id, status FROM users WHERE email = ?").get(email) as UserStatusRow | undefined;
};

export const markUnusedEmailVerificationsUsed = (
  db: Database.Database,
  args: { userId: string; usedAtIso: string },
): void => {
  db.prepare("UPDATE api_email_verifications SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(
    args.usedAtIso,
    args.userId,
  );
};

export const insertEmailVerification = (
  db: Database.Database,
  args: {
    id: string;
    userId: string;
    tokenHash: string;
    createdAtIso: string;
    expiresAtIso: string;
  },
): void => {
  db.prepare(
    `
INSERT INTO api_email_verifications (
  id,
  user_id,
  token_hash,
  created_at,
  expires_at,
  used_at
) VALUES (?, ?, ?, ?, ?, NULL)
`,
  ).run(args.id, args.userId, args.tokenHash, args.createdAtIso, args.expiresAtIso);
};

export const findEmailVerificationByTokenHash = (
  db: Database.Database,
  tokenHash: string,
): EmailVerificationRow | undefined => {
  return db
    .prepare(
      `
SELECT id, user_id, expires_at, used_at
FROM api_email_verifications
WHERE token_hash = ?
`,
    )
    .get(tokenHash) as EmailVerificationRow | undefined;
};

export const activateUserAndMarkEmailVerificationUsed = (
  db: Database.Database,
  args: { userId: string; verificationId: string; updatedAtIso: string },
): void => {
  db.prepare("UPDATE users SET status = 'ACTIVE', updated_at = ? WHERE id = ?").run(args.updatedAtIso, args.userId);
  db.prepare("UPDATE api_email_verifications SET used_at = ? WHERE id = ?").run(args.updatedAtIso, args.verificationId);
};
