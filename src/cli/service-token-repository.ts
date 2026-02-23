import { openCliDb } from "@/platform/db";
import { AppConfig } from "./types";

export const createServiceToken = (
  config: AppConfig,
  args: {
    id: string;
    name: string;
    tokenHash: string;
    createdAt: string;
  },
): void => {
  const db = openCliDb(config);
  try {
    db.prepare(
      "INSERT INTO service_tokens (id, name, token_hash, created_at, revoked_at, last_used_at) VALUES (?, ?, ?, ?, NULL, NULL)",
    ).run(args.id, args.name, args.tokenHash, args.createdAt);
  } finally {
    db.close();
  }
};

export const revokeServiceToken = (
  config: AppConfig,
  args: {
    id: string;
    revokedAt: string;
  },
): boolean => {
  const db = openCliDb(config);
  try {
    const result = db
      .prepare("UPDATE service_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
      .run(args.revokedAt, args.id);
    return result.changes > 0;
  } finally {
    db.close();
  }
};

export const findActiveServiceTokenByHash = (
  config: AppConfig,
  tokenHash: string,
): { id: string } | undefined => {
  const db = openCliDb(config);
  try {
    return db
      .prepare("SELECT id FROM service_tokens WHERE token_hash = ? AND revoked_at IS NULL")
      .get(tokenHash) as { id: string } | undefined;
  } finally {
    db.close();
  }
};

export const touchServiceTokenLastUsed = (
  config: AppConfig,
  args: {
    id: string;
    usedAt: string;
  },
): void => {
  const db = openCliDb(config);
  try {
    db.prepare("UPDATE service_tokens SET last_used_at = ? WHERE id = ?").run(args.usedAt, args.id);
  } finally {
    db.close();
  }
};

