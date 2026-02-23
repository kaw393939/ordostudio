import { randomUUID, createHash } from "node:crypto";
import { hash } from "@node-rs/argon2";
import type Database from "better-sqlite3";

import { resolveConfig } from "@/platform/config";
import { openCliDb as openDb } from "@/platform/runtime";

export class InvalidEmailError extends Error {
  constructor() {
    super("invalid_email");
    this.name = "InvalidEmailError";
  }
}

export class ExistingAccountError extends Error {
  constructor() {
    super("existing_account");
    this.name = "ExistingAccountError";
  }
}

export class InvalidInvitationPayloadError extends Error {
  constructor() {
    super("invalid_payload");
    this.name = "InvalidInvitationPayloadError";
  }
}

export class InvitationNotFoundError extends Error {
  constructor() {
    super("invite_not_found");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationUsedError extends Error {
  constructor() {
    super("invite_used");
    this.name = "InvitationUsedError";
  }
}

export class InvitationExpiredError extends Error {
  constructor() {
    super("invite_expired");
    this.name = "InvitationExpiredError";
  }
}


const hashInviteToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const appendAudit = (
  db: Database.Database,
  action: string,
  actorId: string | null,
  requestId: string,
  metadata?: Record<string, unknown>,
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
    "USER",
    actorId,
    action,
    "user",
    null,
    metadata ? JSON.stringify(metadata) : null,
    new Date().toISOString(),
    requestId,
  );
};

const ensureRole = (db: Database.Database, role: string): string => {
  const normalized = role.toUpperCase();
  const row = db.prepare("SELECT id FROM roles WHERE name = ?").get(normalized) as { id: string } | undefined;
  if (row) {
    return row.id;
  }

  const id = randomUUID();
  db.prepare("INSERT INTO roles (id, name) VALUES (?, ?)").run(id, normalized);
  return id;
};

const ensureInvitationTables = (db: Database.Database): void => {
  db.exec(`
CREATE TABLE IF NOT EXISTS api_credentials (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS api_admin_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  cancelled_at TEXT
);
`);
};

export const createAdminInvitation = (
  email: string,
  actorId: string,
  requestId: string,
): { email: string; role: "ADMIN"; token?: string } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openDb(config);

  try {
    ensureInvitationTables(db);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new InvalidEmailError();
    }

    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail) as
      | { id: string }
      | undefined;

    if (existingUser) {
      throw new ExistingAccountError();
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const token = `invite_${randomUUID().replace(/-/g, "")}`;

    db.transaction(() => {
      db.prepare(
        `
UPDATE api_admin_invitations
SET cancelled_at = ?
WHERE email = ? AND accepted_at IS NULL AND cancelled_at IS NULL
`,
      ).run(nowIso, normalizedEmail);

      db.prepare(
        `
INSERT INTO api_admin_invitations (
  id,
  email,
  role,
  token_hash,
  invited_by,
  created_at,
  expires_at,
  accepted_at,
  cancelled_at
) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
`,
      ).run(
        randomUUID(),
        normalizedEmail,
        "ADMIN",
        hashInviteToken(token),
        actorId,
        nowIso,
        new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
      );

      appendAudit(db, "api.admin.invite.create", actorId, requestId, {
        email: normalizedEmail,
        role: "ADMIN",
      });
    })();

    return {
      email: normalizedEmail,
      role: "ADMIN",
      ...(config.env === "local" ? { token } : {}),
    };
  } finally {
    db.close();
  }
};

export const acceptAdminInvitation = async (
  token: string,
  password: string,
  requestId: string,
): Promise<{ id: string; email: string; role: "ADMIN" }> => {
  const config = resolveConfig({ envVars: process.env });
  const db = openDb(config);

  try {
    ensureInvitationTables(db);

    const normalizedToken = token.trim();
    if (!normalizedToken || !password) {
      throw new InvalidInvitationPayloadError();
    }

    const invite = db
      .prepare(
        `
SELECT id, email, role, expires_at, accepted_at, cancelled_at
FROM api_admin_invitations
WHERE token_hash = ?
`,
      )
      .get(hashInviteToken(normalizedToken)) as
      | {
          id: string;
          email: string;
          role: string;
          expires_at: string;
          accepted_at: string | null;
          cancelled_at: string | null;
        }
      | undefined;

    if (!invite) {
      throw new InvitationNotFoundError();
    }

    if (invite.accepted_at || invite.cancelled_at) {
      throw new InvitationUsedError();
    }

    if (invite.expires_at <= new Date().toISOString()) {
      throw new InvitationExpiredError();
    }

    const now = new Date().toISOString();

    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(invite.email) as
      | { id: string }
      | undefined;
    if (existingUser) {
      throw new ExistingAccountError();
    }

    const passwordHash = await hash(password, {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const userId = randomUUID();
    db.transaction(() => {
      db.prepare("INSERT INTO users (id, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
        userId,
        invite.email,
        "ACTIVE",
        now,
        now,
      );

      db.prepare(
        "INSERT INTO api_credentials (user_id, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ).run(userId, passwordHash, now, now);

      const userRole = ensureRole(db, "USER");
      const adminRole = ensureRole(db, "ADMIN");
      db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(userId, userRole);
      db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(userId, adminRole);

      db.prepare("UPDATE api_admin_invitations SET accepted_at = ? WHERE id = ?").run(now, invite.id);

      appendAudit(db, "api.admin.invite.accept", userId, requestId, {
        email: invite.email,
        role: "ADMIN",
      });
    })();

    return {
      id: userId,
      email: invite.email,
      role: "ADMIN",
    };
  } finally {
    db.close();
  }
};
