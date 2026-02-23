import { randomUUID } from "node:crypto";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";

export type ApprenticeProfileStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export type ApprenticeProfileRecord = {
  user_id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  tags: string;
  status: ApprenticeProfileStatus;
  approved_at: string | null;
  approved_by: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
};

export class ApprenticeProfileNotFoundError extends Error {
  constructor() {
    super("apprentice_profile_not_found");
    this.name = "ApprenticeProfileNotFoundError";
  }
}

export class ApprenticeHandleConflictError extends Error {
  constructor(public readonly handle: string) {
    super(`handle_conflict:${handle}`);
    this.name = "ApprenticeHandleConflictError";
  }
}

const normalizeText = (value: string | undefined | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const normalizeHandle = (value: string): string => {
  const raw = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return raw;
};

const ensureValidHandle = (handle: string): string => {
  const normalized = normalizeHandle(handle);
  if (!normalized || normalized.length < 3) {
    throw new Error("invalid_handle");
  }
  return normalized;
};

const rowByUserId = (db: ReturnType<typeof openCliDb>, userId: string): ApprenticeProfileRecord | null => {
  const row = db
    .prepare(
      `
SELECT user_id, handle, display_name, headline, bio, location, website_url, tags, status,
       approved_at, approved_by, suspended_at, suspended_by, suspension_reason,
       created_at, updated_at
FROM apprentice_profiles
WHERE user_id = ?
`,
    )
    .get(userId) as ApprenticeProfileRecord | undefined;
  return row ?? null;
};

const rowByHandle = (db: ReturnType<typeof openCliDb>, handle: string): ApprenticeProfileRecord | null => {
  const row = db
    .prepare(
      `
SELECT user_id, handle, display_name, headline, bio, location, website_url, tags, status,
       approved_at, approved_by, suspended_at, suspended_by, suspension_reason,
       created_at, updated_at
FROM apprentice_profiles
WHERE handle = ?
`,
    )
    .get(handle) as ApprenticeProfileRecord | undefined;
  return row ?? null;
};

export const getMyApprenticeProfile = (userId: string): ApprenticeProfileRecord | null => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    return rowByUserId(db, userId);
  } finally {
    db.close();
  }
};

export const upsertMyApprenticeProfile = (input: {
  userId: string;
  handle: string;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  tags?: string | null;
  requestId: string;
}): ApprenticeProfileRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();
    const displayName = input.displayName.trim();
    if (displayName.length === 0) {
      throw new Error("display_name_required");
    }

    const handle = ensureValidHandle(input.handle);

    const existing = rowByUserId(db, input.userId);

    try {
      if (!existing) {
        db.prepare(
          `
INSERT INTO apprentice_profiles (
  user_id, handle, display_name, headline, bio, location, website_url, tags, status,
  approved_at, approved_by, suspended_at, suspended_by, suspension_reason,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, NULL, NULL, NULL, NULL, ?, ?)
`,
        ).run(
          input.userId,
          handle,
          displayName,
          normalizeText(input.headline),
          normalizeText(input.bio),
          normalizeText(input.location),
          normalizeText(input.websiteUrl),
          normalizeText(input.tags) ?? "",
          now,
          now,
        );

        appendAuditLog(db, {
          actorType: "USER",
          actorId: input.userId,
          action: "api.apprentice_profile.create",
          targetType: "apprentice_profile",
          requestId: input.requestId,
          metadata: { handle },
        });
      } else {
        db.prepare(
          `
UPDATE apprentice_profiles
SET handle = ?, display_name = ?, headline = ?, bio = ?, location = ?, website_url = ?, tags = ?, updated_at = ?
WHERE user_id = ?
`,
        ).run(
          handle,
          displayName,
          normalizeText(input.headline),
          normalizeText(input.bio),
          normalizeText(input.location),
          normalizeText(input.websiteUrl),
          normalizeText(input.tags) ?? "",
          now,
          input.userId,
        );

        appendAuditLog(db, {
          actorType: "USER",
          actorId: input.userId,
          action: "api.apprentice_profile.update",
          targetType: "apprentice_profile",
          requestId: input.requestId,
          metadata: { handle },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("UNIQUE") && message.includes("handle")) {
        throw new ApprenticeHandleConflictError(handle);
      }
      throw error;
    }

    const profile = rowByUserId(db, input.userId);
    if (!profile) {
      throw new ApprenticeProfileNotFoundError();
    }

    return profile;
  } finally {
    db.close();
  }
};

export const listApprovedApprentices = (): ApprenticeProfileRecord[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    return db
      .prepare(
        `
SELECT user_id, handle, display_name, headline, bio, location, website_url, tags, status,
       approved_at, approved_by, suspended_at, suspended_by, suspension_reason,
       created_at, updated_at
FROM apprentice_profiles
WHERE status = 'APPROVED'
ORDER BY display_name ASC
`,
      )
      .all() as ApprenticeProfileRecord[];
  } finally {
    db.close();
  }
};

export const getPublicApprenticeByHandle = (handle: string): ApprenticeProfileRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const normalized = ensureValidHandle(handle);
    const profile = rowByHandle(db, normalized);
    if (!profile || profile.status !== "APPROVED") {
      throw new ApprenticeProfileNotFoundError();
    }
    return profile;
  } finally {
    db.close();
  }
};

export const listApprenticeProfilesAdmin = (status?: ApprenticeProfileStatus): ApprenticeProfileRecord[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const where = status ? "WHERE status = ?" : "";
    const stmt = db.prepare(
      `
SELECT user_id, handle, display_name, headline, bio, location, website_url, tags, status,
       approved_at, approved_by, suspended_at, suspended_by, suspension_reason,
       created_at, updated_at
FROM apprentice_profiles
${where}
ORDER BY created_at DESC
`,
    );

    return (status ? stmt.all(status) : stmt.all()) as ApprenticeProfileRecord[];
  } finally {
    db.close();
  }
};

export const setApprenticeProfileStatusAdmin = (input: {
  userId: string;
  status: ApprenticeProfileStatus;
  reason?: string | null;
  actorId: string;
  requestId: string;
}): ApprenticeProfileRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const existing = rowByUserId(db, input.userId);
    if (!existing) {
      throw new ApprenticeProfileNotFoundError();
    }

    const now = new Date().toISOString();

    if (input.status === "APPROVED") {
      db.prepare(
        `
UPDATE apprentice_profiles
SET status = 'APPROVED', approved_at = ?, approved_by = ?, suspended_at = NULL, suspended_by = NULL, suspension_reason = NULL, updated_at = ?
WHERE user_id = ?
`,
      ).run(now, input.actorId, now, input.userId);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: input.actorId,
        action: "api.apprentice_profile.approve",
        targetType: "apprentice_profile",
        requestId: input.requestId,
        metadata: { userId: input.userId },
      });
    }

    if (input.status === "SUSPENDED") {
      db.prepare(
        `
UPDATE apprentice_profiles
SET status = 'SUSPENDED', suspended_at = ?, suspended_by = ?, suspension_reason = ?, updated_at = ?
WHERE user_id = ?
`,
      ).run(now, input.actorId, normalizeText(input.reason), now, input.userId);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: input.actorId,
        action: "api.apprentice_profile.suspend",
        targetType: "apprentice_profile",
        requestId: input.requestId,
        metadata: { userId: input.userId, reason: normalizeText(input.reason) },
      });
    }

    if (input.status === "PENDING") {
      db.prepare(
        `
UPDATE apprentice_profiles
SET status = 'PENDING', updated_at = ?
WHERE user_id = ?
`,
      ).run(now, input.userId);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: input.actorId,
        action: "api.apprentice_profile.pending",
        targetType: "apprentice_profile",
        requestId: input.requestId,
        metadata: { userId: input.userId },
      });
    }

    const updated = rowByUserId(db, input.userId);
    if (!updated) {
      throw new ApprenticeProfileNotFoundError();
    }

    return updated;
  } finally {
    db.close();
  }
};

export const suggestHandleFromDisplayName = (displayName: string): string => {
  const base = normalizeHandle(displayName);
  if (base.length >= 3) {
    return base;
  }
  return `apprentice-${randomUUID().slice(0, 8)}`;
};
