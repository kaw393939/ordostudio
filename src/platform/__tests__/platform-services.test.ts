/**
 * Platform layer unit tests.
 *
 * TDD-12: Verify config resolution, DB open, audit write shape,
 * clock/id seams, and transaction helpers.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

// ── Config tests ─────────────────────────────────────────────────────

import { resolveConfig, defaultConfig, mergeConfig, type ConfigFileShape } from "@/platform/config";
import type { AppConfig } from "@/platform/types";

describe("platform/config — resolveConfig", () => {
  it("returns defaults when called with empty input", () => {
    const config = resolveConfig({ envVars: {} });
    expect(config).toEqual(defaultConfig);
  });

  it("merges file config over defaults", () => {
    const fileConfig: ConfigFileShape = {
      env: "staging",
      db: { file: "/tmp/custom.db" },
    };
    const config = resolveConfig({ fileConfig, envVars: {} });
    expect(config.env).toBe("staging");
    expect(config.db.file).toBe("/tmp/custom.db");
    expect(config.db.mode).toBe("sqlite"); // default preserved
  });

  it("merges env vars over file config", () => {
    const fileConfig: ConfigFileShape = { env: "staging" };
    const envVars = { APPCTL_ENV: "prod" } as NodeJS.ProcessEnv;
    const config = resolveConfig({ fileConfig, envVars });
    expect(config.env).toBe("prod");
  });

  it("handles boolean env vars", () => {
    const envVars = {
      APPCTL_AUDIT_STRICT: "false",
    } as NodeJS.ProcessEnv;
    const config = resolveConfig({ envVars });
    expect(config.audit.strict).toBe(false);
  });
});

describe("platform/config — mergeConfig", () => {
  it("preserves base values when incoming is empty", () => {
    const merged = mergeConfig(defaultConfig, {});
    expect(merged).toEqual(defaultConfig);
  });

  it("overrides only specified fields", () => {
    const merged = mergeConfig(defaultConfig, { env: "prod" });
    expect(merged.env).toBe("prod");
    expect(merged.db).toEqual(defaultConfig.db);
  });
});

// ── DB tests ─────────────────────────────────────────────────────────

import { openDb } from "@/platform/db";

describe("platform/db — openDb", () => {
  const tmpDir = join(__dirname, `../../tmp/test-platform-db-${randomUUID()}`);
  const dbFile = join(tmpDir, "test.db");

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("creates directory and opens a database", () => {
    const config: AppConfig = {
      ...defaultConfig,
      db: { ...defaultConfig.db, file: dbFile },
    };
    const db = openDb(config);
    try {
      expect(db).toBeDefined();
      // Verify pragmas are set
      const fk = db.pragma("foreign_keys") as Array<{ foreign_keys: number }>;
      expect(fk[0].foreign_keys).toBe(1);
      const jm = db.pragma("journal_mode") as Array<{ journal_mode: string }>;
      expect(jm[0].journal_mode).toBe("wal");
    } finally {
      db.close();
    }
  });
});

// ── Transaction helper tests ─────────────────────────────────────────

import { withTransaction } from "@/platform/db";

describe("platform/db — withTransaction", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)");
  });

  afterEach(() => {
    db.close();
  });

  it("commits on success", () => {
    const result = withTransaction(db, () => {
      db.prepare("INSERT INTO t (val) VALUES (?)").run("hello");
      return "ok";
    });
    expect(result).toBe("ok");
    const row = db.prepare("SELECT val FROM t").get() as { val: string };
    expect(row.val).toBe("hello");
  });

  it("rolls back on error and re-throws", () => {
    expect(() =>
      withTransaction(db, () => {
        db.prepare("INSERT INTO t (val) VALUES (?)").run("fail");
        throw new Error("boom");
      }),
    ).toThrow("boom");
    const count = db.prepare("SELECT count(*) as c FROM t").get() as { c: number };
    expect(count.c).toBe(0);
  });
});

// ── Audit tests ──────────────────────────────────────────────────────

import { appendAuditLog, appendServiceAudit } from "@/platform/audit";

describe("platform/audit — appendAuditLog", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  request_id TEXT NOT NULL
)
`);
  });

  afterEach(() => {
    db.close();
  });

  it("inserts a USER audit row", () => {
    appendAuditLog(db, {
      actorType: "USER",
      actorId: "u-1",
      action: "test.action",
      targetType: "event",
      requestId: "req-1",
      metadata: { foo: "bar" },
    });
    const row = db.prepare("SELECT * FROM audit_log").get() as Record<string, unknown>;
    expect(row.actor_type).toBe("USER");
    expect(row.actor_id).toBe("u-1");
    expect(row.action).toBe("test.action");
    expect(row.target_type).toBe("event");
    expect(row.request_id).toBe("req-1");
    expect(JSON.parse(row.metadata as string)).toEqual({ foo: "bar" });
  });

  it("inserts a SERVICE audit row with null actor_id", () => {
    appendAuditLog(db, {
      actorType: "SERVICE",
      actorId: null,
      action: "system.task",
      targetType: "system",
      requestId: "req-2",
    });
    const row = db.prepare("SELECT * FROM audit_log").get() as Record<string, unknown>;
    expect(row.actor_type).toBe("SERVICE");
    expect(row.actor_id).toBeNull();
  });
});

describe("platform/audit — appendServiceAudit", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  request_id TEXT NOT NULL
)
`);
  });

  afterEach(() => {
    db.close();
  });

  it("defaults to SERVICE actor type", () => {
    appendServiceAudit(db, {
      action: "system.boot",
      requestId: "req-3",
      targetType: "system",
    });
    const row = db.prepare("SELECT * FROM audit_log").get() as Record<string, unknown>;
    expect(row.actor_type).toBe("SERVICE");
    expect(row.actor_id).toBeNull();
  });

  it("extracts actorId from metadata.actorId", () => {
    appendServiceAudit(db, {
      action: "manual.op",
      requestId: "req-4",
      targetType: "event",
      metadata: { actorId: "u-99" },
    });
    const row = db.prepare("SELECT * FROM audit_log").get() as Record<string, unknown>;
    expect(row.actor_type).toBe("USER");
    expect(row.actor_id).toBe("u-99");
  });
});

// ── Date-time tests ──────────────────────────────────────────────────

import { parseISO, nowISO, isValidISO } from "@/platform/date-time";

describe("platform/date-time", () => {
  it("nowISO returns a valid ISO string", () => {
    const iso = nowISO();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("parseISO parses a valid date", () => {
    const d = parseISO("2025-06-15T12:00:00.000Z");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // 0-indexed
  });

  it("parseISO throws on invalid date", () => {
    expect(() => parseISO("not-a-date")).toThrow("Invalid date");
  });

  it("parseISO throws on empty string", () => {
    expect(() => parseISO("")).toThrow("Empty date string");
  });

  it("isValidISO returns true for valid dates", () => {
    expect(isValidISO("2025-01-01T00:00:00.000Z")).toBe(true);
  });

  it("isValidISO returns false for invalid dates", () => {
    expect(isValidISO("nope")).toBe(false);
  });
});

// ── Clock + ID seams ─────────────────────────────────────────────────

import { clock, ids, setClock, setIds, resetSeams } from "@/platform/seams";

describe("platform/seams — clock", () => {
  afterEach(() => resetSeams());

  it("clock.now() returns a valid ISO string", () => {
    const iso = clock.now();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("setClock replaces the implementation", () => {
    setClock({ now: () => "2025-01-01T00:00:00.000Z" });
    expect(clock.now()).toBe("2025-01-01T00:00:00.000Z");
  });
});

describe("platform/seams — ids", () => {
  afterEach(() => resetSeams());

  it("ids.uuid() returns a UUID-shaped string", () => {
    const id = ids.uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("ids.uuid() returns unique values", () => {
    const a = ids.uuid();
    const b = ids.uuid();
    expect(a).not.toBe(b);
  });

  it("setIds replaces the implementation", () => {
    let counter = 0;
    setIds({ uuid: () => `test-id-${++counter}` });
    expect(ids.uuid()).toBe("test-id-1");
    expect(ids.uuid()).toBe("test-id-2");
  });

  it("resetSeams restores defaults", () => {
    setIds({ uuid: () => "fixed" });
    expect(ids.uuid()).toBe("fixed");
    resetSeams();
    expect(ids.uuid()).toMatch(/^[0-9a-f]{8}-/);
  });
});
