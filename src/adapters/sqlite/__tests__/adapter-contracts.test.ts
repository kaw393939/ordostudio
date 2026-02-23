/**
 * Adapter contract tests — SQLite repositories.
 *
 * These tests run REAL SQL against an in-memory SQLite DB with the
 * full schema applied (via dbMigrate).  They verify that the concrete
 * adapters honour their port contracts.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SqliteUserRepository, SqliteEventRepository, SqliteRegistrationRepository } from "@/adapters/sqlite/repositories";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import { SqliteUserAdminAdapter } from "@/adapters/sqlite/user-admin-adapter";
import { dbMigrate } from "@/cli/db";
import type { AppConfig } from "@/platform/types";
import type { Event, User } from "@/core/ports/repositories";

/* ── helper: fresh migrated DB ─────────────────────── */

let tmpDirs: string[] = [];

const createTestConfig = (): AppConfig => {
  const dir = mkdtempSync(join(tmpdir(), "adapter-contract-"));
  tmpDirs.push(dir);
  const dbFile = join(dir, "test.db");

  const config: AppConfig = {
    db: { file: dbFile, busyTimeoutMs: 500 },
    env: "test",
  } as AppConfig;

  // Run full migration to get real schema
  dbMigrate(config, "test-setup");
  return config;
};

const openRawDb = (config: AppConfig): Database.Database => {
  const db = new Database(config.db.file);
  db.pragma("foreign_keys = ON");
  return db;
};

/* ── fixtures ──────────────────────────────────────── */

const now = "2025-01-15T12:00:00.000Z";

const makeUser = (overrides?: Partial<User>): User => ({
  id: "u-1",
  email: "test@example.com",
  status: "ACTIVE",
  created_at: now,
  updated_at: now,
  ...overrides,
});

const makeEvent = (overrides?: Partial<Event>): Event => ({
  id: "e-1",
  slug: "test-event",
  title: "Test Event",
  start_at: "2025-02-01T09:00:00.000Z",
  end_at: "2025-02-01T17:00:00.000Z",
  timezone: "America/Chicago",
  status: "DRAFT",
  capacity: 30,
  created_by: "u-1",
  created_at: now,
  updated_at: now,
  ...overrides,
});

/* ── lifecycle ─────────────────────────────────────── */

afterEach(() => {
  for (const dir of tmpDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
  tmpDirs = [];
});

/* ── UserRepository contract ──────────────────────── */

describe("SqliteUserRepository contract", () => {
  let config: AppConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  it("create + findByEmail round-trips", () => {
    const repo = new SqliteUserRepository(config);
    const user = makeUser();
    repo.create(user);
    const found = repo.findByEmail(user.email);
    expect(found).toBeDefined();
    expect(found!.id).toBe(user.id);
    expect(found!.email).toBe(user.email);
    expect(found!.status).toBe(user.status);
  });

  it("findByEmail returns undefined for missing user", () => {
    const repo = new SqliteUserRepository(config);
    expect(repo.findByEmail("ghost@example.com")).toBeUndefined();
  });

  it("findByIdentifier resolves by email", () => {
    const repo = new SqliteUserRepository(config);
    repo.create(makeUser());
    const found = repo.findByIdentifier("test@example.com");
    expect(found).toBeDefined();
    expect(found!.id).toBe("u-1");
  });

  it("findByIdentifier resolves by id", () => {
    const repo = new SqliteUserRepository(config);
    repo.create(makeUser());
    const found = repo.findByIdentifier("u-1");
    expect(found).toBeDefined();
    expect(found!.email).toBe("test@example.com");
  });

  it("create rejects duplicate email", () => {
    const repo = new SqliteUserRepository(config);
    repo.create(makeUser());
    expect(() => repo.create(makeUser({ id: "u-2" }))).toThrow();
  });
});

/* ── EventRepository contract ─────────────────────── */

describe("SqliteEventRepository contract", () => {
  let config: AppConfig;

  beforeEach(() => {
    config = createTestConfig();
    // EventRepository.create requires created_by user
    new SqliteUserRepository(config).create(makeUser());
  });

  it("create + findBySlug round-trips", () => {
    const repo = new SqliteEventRepository(config);
    const event = makeEvent();
    repo.create(event);
    const found = repo.findBySlug(event.slug);
    expect(found).toBeDefined();
    expect(found!.id).toBe(event.id);
    expect(found!.title).toBe(event.title);
    expect(found!.status).toBe("DRAFT");
  });

  it("findBySlug returns undefined for missing event", () => {
    const repo = new SqliteEventRepository(config);
    expect(repo.findBySlug("no-such-event")).toBeUndefined();
  });

  it("update persists changes", () => {
    const repo = new SqliteEventRepository(config);
    const event = makeEvent();
    repo.create(event);
    repo.update({ ...event, title: "Updated Title", status: "PUBLISHED" });
    const found = repo.findBySlug(event.slug);
    expect(found!.title).toBe("Updated Title");
    expect(found!.status).toBe("PUBLISHED");
  });

  it("countActiveRegistrations returns 0 with no registrations", () => {
    const repo = new SqliteEventRepository(config);
    repo.create(makeEvent());
    expect(repo.countActiveRegistrations("e-1")).toBe(0);
  });
});

/* ── RegistrationRepository contract ──────────────── */

describe("SqliteRegistrationRepository contract", () => {
  let config: AppConfig;

  beforeEach(() => {
    config = createTestConfig();
    new SqliteUserRepository(config).create(makeUser());
    new SqliteEventRepository(config).create(makeEvent());
  });

  it("create + findByEventAndUser round-trips", () => {
    const repo = new SqliteRegistrationRepository(config);
    repo.create({ id: "r-1", event_id: "e-1", user_id: "u-1", status: "REGISTERED" });
    const found = repo.findByEventAndUser("e-1", "u-1");
    expect(found).toBeDefined();
    expect(found!.id).toBe("r-1");
    expect(found!.status).toBe("REGISTERED");
  });

  it("findByEventAndUser returns undefined when not registered", () => {
    const repo = new SqliteRegistrationRepository(config);
    expect(repo.findByEventAndUser("e-1", "u-1")).toBeUndefined();
  });

  it("updateStatus changes registration status", () => {
    const repo = new SqliteRegistrationRepository(config);
    repo.create({ id: "r-1", event_id: "e-1", user_id: "u-1", status: "REGISTERED" });
    repo.updateStatus("r-1", "CANCELLED");
    const found = repo.findByEventAndUser("e-1", "u-1");
    expect(found!.status).toBe("CANCELLED");
  });

  it("countActiveRegistrations increments after create", () => {
    const evRepo = new SqliteEventRepository(config);
    const repo = new SqliteRegistrationRepository(config);
    repo.create({ id: "r-1", event_id: "e-1", user_id: "u-1", status: "REGISTERED" });
    expect(evRepo.countActiveRegistrations("e-1")).toBe(1);
  });
});

/* ── AuditSink contract ──────────────────────────── */

describe("SqliteAuditSink contract", () => {
  let config: AppConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  it("record writes an audit row", () => {
    const sink = new SqliteAuditSink(config);
    sink.record({
      action: "test.action",
      requestId: "req-1",
      targetType: "system",
      metadata: { key: "value" },
    });

    // Verify it was actually persisted
    const db = openRawDb(config);
    try {
      const rows = db.prepare("SELECT * FROM audit_log WHERE action = 'test.action'").all();
      expect(rows.length).toBe(1);
    } finally {
      db.close();
    }
  });
});

/* ── UserAdminAdapter contract ───────────────────── */

describe("SqliteUserAdminAdapter contract", () => {
  let config: AppConfig;

  beforeEach(() => {
    config = createTestConfig();
    // Seed a user
    new SqliteUserRepository(config).create(makeUser());
  });

  it("findUserById returns user", () => {
    const db = openRawDb(config);
    try {
      const adapter = new SqliteUserAdminAdapter(db);
      const found = adapter.findUserById("u-1");
      expect(found).not.toBeNull();
      expect(found!.id).toBe("u-1");
      expect(found!.status).toBe("ACTIVE");
    } finally {
      db.close();
    }
  });

  it("findUserById returns null for missing user", () => {
    const db = openRawDb(config);
    try {
      const adapter = new SqliteUserAdminAdapter(db);
      expect(adapter.findUserById("ghost")).toBeNull();
    } finally {
      db.close();
    }
  });

  it("updateUserStatus changes status", () => {
    const db = openRawDb(config);
    try {
      const adapter = new SqliteUserAdminAdapter(db);
      const changed = adapter.updateUserStatus("u-1", "DISABLED", now);
      expect(changed).toBe(true);
      const found = adapter.findUserById("u-1");
      expect(found!.status).toBe("DISABLED");
    } finally {
      db.close();
    }
  });

  it("findRoleByName returns null for missing role", () => {
    const db = openRawDb(config);
    try {
      const adapter = new SqliteUserAdminAdapter(db);
      expect(adapter.findRoleByName("NONEXISTENT")).toBeNull();
    } finally {
      db.close();
    }
  });

  it("addUserRole + removeUserRole round-trips", () => {
    const db = openRawDb(config);
    try {
      // Seed a role
      db.prepare("INSERT INTO roles (id, name) VALUES ('r-1', 'INSTRUCTOR')").run();

      const adapter = new SqliteUserAdminAdapter(db);

      // Add
      const added = adapter.addUserRole("u-1", "r-1");
      expect(added).toBe(true);

      // Idempotent add
      const addedAgain = adapter.addUserRole("u-1", "r-1");
      expect(addedAgain).toBe(false);

      // Remove
      const removed = adapter.removeUserRole("u-1", "r-1");
      expect(removed).toBe(true);

      // Idempotent remove
      const removedAgain = adapter.removeUserRole("u-1", "r-1");
      expect(removedAgain).toBe(false);
    } finally {
      db.close();
    }
  });
});
