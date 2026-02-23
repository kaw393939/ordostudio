import { createHash, randomUUID } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import Database from "better-sqlite3";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import type { TransactionalEmailPort } from "@/core/ports/transactional-email";
import { sendEmailAsync } from "@/platform/email-queue-bridge";
import {
  buildPasswordResetEmail,
  buildEmailVerificationEmail,
  buildWelcomeEmail,
} from "@/core/use-cases/email-templates";
import {
  activateUserAndMarkEmailVerificationUsed,
  assignUserRole,
  applyAccountDeletion,
  ensureRoleByName,
  findActiveSessionWithUserByTokenHash,
  findEmailVerificationByTokenHash,
  findLatestPasswordResetIdForUser,
  findLoginCredentialByEmail,
  findPasswordResetByTokenHash,
  findUserIdByEmail,
  findUserStatusByEmail,
  hasUserById,
  insertApiCredential,
  insertApiSession,
  insertEmailVerification,
  insertPolicyConsent,
  insertPasswordReset,
  listActiveSessionsForUser,
  tryInsertUserAccount,
  listUserRoleNames,
  markPasswordResetUsedById,
  markUnusedEmailVerificationsUsed,
  markUnusedPasswordResetsUsed,
  revokeActiveSessionByTokenHash,
  revokeAllSessionsExceptCurrent,
  revokeAllSessionsForUser,
  revokeSessionById,
  updateCredentialPasswordHash,
  updateSessionActivity,
} from "@/adapters/sqlite/auth-queries";
import { ensureAuthSchema } from "@/adapters/sqlite/auth-schema";
import { AppConfig, RuntimeEnv } from "@/platform/types";

const SESSION_COOKIE = "lms_session";
const SESSION_DAYS = 7;
const ABSOLUTE_MAX_DAYS = 30;
const SESSION_ACTIVITY_THROTTLE_MS = 60 * 60 * 1000; // 1 hour

export interface SessionUser {
  id: string;
  email: string;
  status: string;
  roles: string[];
}

interface AuthContext {
  config: AppConfig;
  env: RuntimeEnv;
}

export class InvalidRegisterPayloadError extends Error {
  constructor() {
    super("invalid_register_payload");
    this.name = "InvalidRegisterPayloadError";
  }
}

export class InvalidTermsAcknowledgmentError extends Error {
  constructor() {
    super("invalid_terms_ack");
    this.name = "InvalidTermsAcknowledgmentError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("email_already_registered");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid_credentials");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailUnverifiedError extends Error {
  constructor() {
    super("email_unverified");
    this.name = "EmailUnverifiedError";
  }
}

export class InvalidPasswordResetPayloadError extends Error {
  constructor() {
    super("invalid_reset_payload");
    this.name = "InvalidPasswordResetPayloadError";
  }
}

export class ResetTokenInvalidError extends Error {
  constructor() {
    super("reset_token_invalid");
    this.name = "ResetTokenInvalidError";
  }
}

export class ResetTokenUsedError extends Error {
  constructor() {
    super("reset_token_used");
    this.name = "ResetTokenUsedError";
  }
}

export class ResetTokenExpiredError extends Error {
  constructor() {
    super("reset_token_expired");
    this.name = "ResetTokenExpiredError";
  }
}

export class InvalidVerifyTokenError extends Error {
  constructor() {
    super("invalid_verify_token");
    this.name = "InvalidVerifyTokenError";
  }
}

export class VerifyTokenInvalidError extends Error {
  constructor() {
    super("verify_token_invalid");
    this.name = "VerifyTokenInvalidError";
  }
}

export class VerifyTokenUsedError extends Error {
  constructor() {
    super("verify_token_used");
    this.name = "VerifyTokenUsedError";
  }
}

export class VerifyTokenExpiredError extends Error {
  constructor() {
    super("verify_token_expired");
    this.name = "VerifyTokenExpiredError";
  }
}

export class AccountDeletionUserNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super("account_deletion_user_not_found");
    this.name = "AccountDeletionUserNotFoundError";
  }
}

const appendAudit = (
  db: Database.Database,
  action: string,
  requestId: string,
  metadata?: Record<string, unknown>,
  actorId?: string | null,
): void => {
  appendAuditLog(db, {
    actorType: "USER",
    actorId: actorId ?? null,
    action,
    targetType: "api",
    requestId,
    metadata,
  });
};

const hashSessionToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const hashPasswordResetToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const hashEmailVerificationToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const isEmailVerificationRequired = (): boolean => {
  const value = process.env.APPCTL_REQUIRE_EMAIL_VERIFICATION;
  return value === "1" || value === "true" || value === "yes";
};

export const getAuthContext = (): AuthContext => {
  const config = resolveConfig({ envVars: process.env });
  return {
    config,
    env: config.env,
  };
};

export const parseSessionTokenFromCookie = (cookieHeader: string | null): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const segments = cookieHeader.split(";").map((segment) => segment.trim());
  for (const segment of segments) {
    if (segment.startsWith(`${SESSION_COOKIE}=`)) {
      return segment.substring(`${SESSION_COOKIE}=`.length);
    }
  }

  return null;
};

export const buildSessionCookie = (token: string, env: RuntimeEnv): string => {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];

  if (env === "prod") {
    parts.push("Secure");
  }

  return parts.join("; ");
};

export const buildSessionClearCookie = (env: RuntimeEnv): string => {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (env === "prod") {
    parts.push("Secure");
  }
  return parts.join("; ");
};

export const isSameOriginMutation = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
};

const siteBaseUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const registerUser = async (
  email: string,
  password: string,
  termsAccepted = true,
  requestId: string,
  emailPort?: TransactionalEmailPort,
): Promise<SessionUser & { verification_token?: string }> => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new InvalidRegisterPayloadError();
    }

    if (!termsAccepted) {
      throw new InvalidTermsAcknowledgmentError();
    }

    const passwordHash = await hash(password, {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const id = randomUUID();
    const now = new Date().toISOString();
    let verificationTokenForEmail: string | undefined;

    const run = db.transaction(() => {
      const requireVerification = isEmailVerificationRequired();
      const accountStatus = requireVerification ? "PENDING" : "ACTIVE";
      let verificationToken: string | undefined;

      const inserted = tryInsertUserAccount(db, {
        id,
        email: normalizedEmail,
        status: accountStatus,
        createdAtIso: now,
        updatedAtIso: now,
      });
      if (!inserted) {
        throw new EmailAlreadyRegisteredError();
      }

      insertApiCredential(db, {
        userId: id,
        passwordHash,
        createdAtIso: now,
        updatedAtIso: now,
      });

      const userRoleId = ensureRoleByName(db, "USER");
      assignUserRole(db, {
        userId: id,
        roleId: userRoleId,
      });

      appendAudit(
        db,
        "api.auth.register",
        requestId,
        {
          userId: id,
          email: normalizedEmail,
          verificationRequired: requireVerification,
        },
        id,
      );

      insertPolicyConsent(db, {
        id: randomUUID(),
        userId: id,
        policy: "TERMS",
        acceptedAtIso: now,
        policyVersion: "2026-02-17",
      });

      insertPolicyConsent(db, {
        id: randomUUID(),
        userId: id,
        policy: "PRIVACY",
        acceptedAtIso: now,
        policyVersion: "2026-02-17",
      });

      if (requireVerification) {
        verificationToken = `verify_${randomUUID().replace(/-/g, "")}`;
        verificationTokenForEmail = verificationToken;
        insertEmailVerification(db, {
          id: randomUUID(),
          userId: id,
          tokenHash: hashEmailVerificationToken(verificationToken),
          createdAtIso: now,
          expiresAtIso: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        });

        appendAudit(
          db,
          "api.auth.email_verification.issue",
          requestId,
          {
            userId: id,
            reason: "register",
          },
          id,
        );
      }

      return {
        id,
        email: normalizedEmail,
        status: accountStatus,
        roles: ["USER"],
        verification_token: config.env === "local" ? verificationToken : undefined,
      };
    });

    const result = run();

    // Non-blocking email sends — routed through job queue when available, direct otherwise
    if (emailPort) {
      const base = siteBaseUrl();
      sendEmailAsync(emailPort, buildWelcomeEmail(result.email, base));
      if (verificationTokenForEmail) {
        sendEmailAsync(emailPort, buildEmailVerificationEmail(result.email, verificationTokenForEmail, base));
      }
    }

    return result;
  } finally {
    db.close();
  }
};

export const loginUser = async (
  email: string,
  password: string,
  requestId: string,
  request?: Request,
): Promise<{ sessionToken: string; user: SessionUser }> => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    const normalizedEmail = email.trim().toLowerCase();
    const row = findLoginCredentialByEmail(db, normalizedEmail);

    if (!row) {
      throw new InvalidCredentialsError();
    }

    const verified = await verify(row.password_hash, password);
    if (!verified) {
      throw new InvalidCredentialsError();
    }

    if (row.status === "PENDING") {
      throw new EmailUnverifiedError();
    }

    if (row.status !== "ACTIVE") {
      throw new InvalidCredentialsError();
    }

    const result = db.transaction(() => {
      const sessionToken = `sess_${randomUUID().replace(/-/g, "")}`;
      const sessionId = randomUUID();
      const now = new Date();
      const expires = new Date(now);
      expires.setDate(expires.getDate() + SESSION_DAYS);
      const ipAddress = request?.headers.get("x-forwarded-for") ?? request?.headers.get("x-real-ip") ?? "unknown";
      const userAgent = request?.headers.get("user-agent") ?? "unknown";
      insertApiSession(db, {
        id: sessionId,
        userId: row.id,
        sessionTokenHash: hashSessionToken(sessionToken),
        createdAtIso: now.toISOString(),
        expiresAtIso: expires.toISOString(),
        lastSeenAtIso: now.toISOString(),
        ipAddress,
        userAgent,
      });
      appendAudit(
        db,
        "api.auth.login",
        requestId,
        {
          userId: row.id,
          sessionId,
        },
        row.id,
      );
      const roles = listUserRoleNames(db, row.id);
      return {
        session: {
          token: sessionToken,
          expiresAt: expires.toISOString(),
        },
        user: {
          id: row.id,
          email: row.email,
          status: row.status,
          roles,
        },
      };
    })();

    return {
      sessionToken: result.session.token,
      user: result.user,
    };
  } finally {
    db.close();
  }
};

export const logoutUser = (sessionToken: string, requestId: string): void => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    db.transaction(() => {
      revokeActiveSessionByTokenHash(db, {
        revokedAtIso: new Date().toISOString(),
        tokenHash: hashSessionToken(sessionToken),
      });

      appendAudit(db, "api.auth.logout", requestId, {
        revoked: true,
      });
    })();
  } finally {
    db.close();
  }
};

export interface SessionUserWithSessionId extends SessionUser {
  sessionId: string;
}

export const getUserFromSession = (sessionToken: string): SessionUserWithSessionId | null => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);
    const now = new Date();
    const nowIso = now.toISOString();

    const row = findActiveSessionWithUserByTokenHash(db, {
      tokenHash: hashSessionToken(sessionToken),
      nowIso,
    });

    if (!row || row.status !== "ACTIVE") {
      return null;
    }

    // Absolute max lifetime check: reject sessions older than ABSOLUTE_MAX_DAYS
    const createdAt = new Date(row.created_at);
    const absoluteMaxMs = ABSOLUTE_MAX_DAYS * 24 * 60 * 60 * 1000;
    if (now.getTime() - createdAt.getTime() > absoluteMaxMs) {
      // Revoke the expired session
      revokeActiveSessionByTokenHash(db, {
        tokenHash: hashSessionToken(sessionToken),
        revokedAtIso: nowIso,
      });
      return null;
    }

    // Sliding expiry: extend session if last_seen_at is > 1 hour old
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
    if (!lastSeen || now.getTime() - lastSeen.getTime() > SESSION_ACTIVITY_THROTTLE_MS) {
      const newExpires = new Date(now);
      newExpires.setDate(newExpires.getDate() + SESSION_DAYS);
      updateSessionActivity(db, {
        sessionId: row.session_id,
        lastSeenAtIso: nowIso,
        expiresAtIso: newExpires.toISOString(),
      });
    }

    const roles = listUserRoleNames(db, row.id);
    return {
      id: row.id,
      email: row.email,
      status: row.status,
      roles,
      sessionId: row.session_id,
    };
  } finally {
    db.close();
  }
};

export const getSessionUserFromRequest = (request: Request): SessionUserWithSessionId | null => {
  const sessionToken = parseSessionTokenFromCookie(request.headers.get("cookie"));
  if (!sessionToken) {
    return null;
  }

  return getUserFromSession(sessionToken);
};

export const deleteOwnAccount = (userId: string, requestId: string): { deleted: true } => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    db.transaction(() => {
      if (!hasUserById(db, userId)) {
        throw new AccountDeletionUserNotFoundError(userId);
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const retentionUntil = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString();

      applyAccountDeletion(db, {
        userId,
        nowIso,
        retentionUntilIso: retentionUntil,
        deletionId: randomUUID(),
      });

      appendAudit(
        db,
        "api.account.delete",
        requestId,
        {
          userId,
          retentionUntil,
        },
        userId,
      );
    })();

    return { deleted: true };
  } finally {
    db.close();
  }
};

export const requestPasswordReset = (
  email: string,
  requestId: string,
  emailPort?: TransactionalEmailPort,
): { accepted: true; token?: string } => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("invalid_reset_email");
    }

    const token = `reset_${randomUUID().replace(/-/g, "")}`;
    const tokenHash = hashPasswordResetToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 30).toISOString();

    db.transaction(() => {
      const userId = findUserIdByEmail(db, normalizedEmail);

      appendAudit(
        db,
        "api.auth.password_reset.request",
        requestId,
        {
          email: normalizedEmail,
          found: Boolean(userId),
        },
        userId ?? null,
      );

      if (!userId) {
        return;
      }

      markUnusedPasswordResetsUsed(db, {
        userId,
        usedAtIso: now.toISOString(),
      });

      insertPasswordReset(db, {
        id: randomUUID(),
        userId,
        tokenHash,
        createdAtIso: now.toISOString(),
        expiresAtIso: expiresAt,
      });
    })();

    // Non-blocking email send — routed through job queue when available
    if (emailPort) {
      sendEmailAsync(emailPort, buildPasswordResetEmail(normalizedEmail, token, siteBaseUrl()));
    }

    if (config.env === "local") {
      return { accepted: true, token };
    }

    return { accepted: true };
  } finally {
    db.close();
  }
};

export const confirmPasswordReset = async (
  token: string,
  password: string,
  requestId: string,
): Promise<{ reset: true }> => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    const normalizedToken = token.trim();
    if (!normalizedToken || !password) {
      throw new InvalidPasswordResetPayloadError();
    }

    const now = new Date().toISOString();
    const found = findPasswordResetByTokenHash(db, hashPasswordResetToken(normalizedToken));

    if (!found) {
      throw new ResetTokenInvalidError();
    }

    if (found.used_at) {
      throw new ResetTokenUsedError();
    }

    if (found.expires_at <= now) {
      throw new ResetTokenExpiredError();
    }

    const passwordHash = await hash(password, {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    db.transaction(() => {
      updateCredentialPasswordHash(db, {
        userId: found.user_id,
        passwordHash,
        updatedAtIso: now,
      });

      markPasswordResetUsedById(db, {
        id: found.id,
        usedAtIso: now,
      });

      // Revoke ALL active sessions on password change
      revokeAllSessionsForUser(db, {
        userId: found.user_id,
        revokedAtIso: now,
      });

      appendAudit(
        db,
        "api.auth.password_reset.confirm",
        requestId,
        {
          userId: found.user_id,
          sessions_revoked: true,
        },
        found.user_id,
      );
    })();

    return { reset: true };
  } finally {
    db.close();
  }
};

export const getLatestPasswordResetTokenForEmail = (email: string): string | null => {
  const { config } = getAuthContext();
  if (config.env !== "local") {
    return null;
  }

  const db = openCliDb(config);
  try {
    ensureAuthSchema(db);

    const userId = findUserIdByEmail(db, email.trim().toLowerCase());

    if (!userId) {
      return null;
    }

    return findLatestPasswordResetIdForUser(db, userId) ?? null;
  } finally {
    db.close();
  }
};

export const requestEmailVerification = (
  email: string,
  requestId: string,
  emailPort?: TransactionalEmailPort,
): { accepted: true; token?: string } => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("invalid_verify_email");
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const token = `verify_${randomUUID().replace(/-/g, "")}`;

    db.transaction(() => {
      const user = findUserStatusByEmail(db, normalizedEmail);

      appendAudit(
        db,
        "api.auth.email_verification.request",
        requestId,
        {
          email: normalizedEmail,
          found: Boolean(user),
        },
        user?.id ?? null,
      );

      if (!user || user.status === "ACTIVE") {
        return;
      }

      markUnusedEmailVerificationsUsed(db, {
        userId: user.id,
        usedAtIso: nowIso,
      });

      insertEmailVerification(db, {
        id: randomUUID(),
        userId: user.id,
        tokenHash: hashEmailVerificationToken(token),
        createdAtIso: nowIso,
        expiresAtIso: new Date(now.getTime() + 1000 * 60 * 30).toISOString(),
      });
    })();

    // Non-blocking email send — routed through job queue when available
    if (emailPort) {
      sendEmailAsync(emailPort, buildEmailVerificationEmail(normalizedEmail, token, siteBaseUrl()));
    }

    if (config.env === "local") {
      return { accepted: true, token };
    }

    return { accepted: true };
  } finally {
    db.close();
  }
};

export const confirmEmailVerification = (
  token: string,
  requestId: string,
): { verified: true } => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);

    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new InvalidVerifyTokenError();
    }

    const now = new Date().toISOString();
    const row = findEmailVerificationByTokenHash(db, hashEmailVerificationToken(normalizedToken));

    if (!row) {
      throw new VerifyTokenInvalidError();
    }

    if (row.used_at) {
      throw new VerifyTokenUsedError();
    }

    if (row.expires_at <= now) {
      throw new VerifyTokenExpiredError();
    }

    db.transaction(() => {
      activateUserAndMarkEmailVerificationUsed(db, {
        userId: row.user_id,
        verificationId: row.id,
        updatedAtIso: now,
      });

      appendAudit(
        db,
        "api.auth.email_verification.confirm",
        requestId,
        {
          userId: row.user_id,
        },
        row.user_id,
      );
    })();

    return { verified: true };
  } finally {
    db.close();
  }
};

// ─── Session Management ─────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  created_at: string;
  last_seen_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_current: boolean;
}

export const listSessionsForUser = (
  userId: string,
  currentSessionId: string,
): SessionInfo[] => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);
    const now = new Date().toISOString();

    const rows = listActiveSessionsForUser(db, { userId, nowIso: now });
    return rows.map((row) => ({
      id: row.session_id,
      created_at: row.created_at,
      last_seen_at: row.last_seen_at,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      is_current: row.session_id === currentSessionId,
    }));
  } finally {
    db.close();
  }
};

export const revokeSpecificSession = (
  userId: string,
  sessionId: string,
  currentSessionId: string,
  requestId: string,
): { revoked: boolean; error?: string } => {
  if (sessionId === currentSessionId) {
    return { revoked: false, error: "cannot_revoke_current" };
  }

  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);
    const now = new Date().toISOString();

    const changes = revokeSessionById(db, {
      sessionId,
      userId,
      revokedAtIso: now,
    });

    if (changes === 0) {
      return { revoked: false, error: "session_not_found" };
    }

    appendAudit(db, "api.session.revoke", requestId, { revokedSessionId: sessionId }, userId);

    return { revoked: true };
  } finally {
    db.close();
  }
};

export const revokeAllOtherSessions = (
  userId: string,
  currentSessionId: string,
  requestId: string,
): { revoked_count: number } => {
  const { config } = getAuthContext();
  const db = openCliDb(config);

  try {
    ensureAuthSchema(db);
    const now = new Date().toISOString();

    const changes = revokeAllSessionsExceptCurrent(db, {
      userId,
      currentSessionId,
      revokedAtIso: now,
    });

    appendAudit(db, "api.session.revoke_all", requestId, { revokedCount: changes }, userId);

    return { revoked_count: changes };
  } finally {
    db.close();
  }
};
