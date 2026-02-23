import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../run-cli";
import { CliIo } from "../types";

const createIo = (): { io: CliIo; stdout: string[]; stderr: string[] } => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      writeStdout: (message: string) => {
        stdout.push(message);
      },
      writeStderr: (message: string) => {
        stderr.push(message);
      },
    },
    stdout,
    stderr,
  };
};

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-event-test-"));
  tempDirs.push(directory);
  return join(directory, "app.db");
};

const runWithDb = async (
  argv: string[],
  dbPath: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const { io, stdout, stderr } = createIo();
  const previousDbPath = process.env.APPCTL_DB_FILE;

  process.env.APPCTL_DB_FILE = dbPath;
  const exitCode = await runCli(argv, io);

  if (previousDbPath === undefined) {
    delete process.env.APPCTL_DB_FILE;
  } else {
    process.env.APPCTL_DB_FILE = previousDbPath;
  }

  return {
    exitCode,
    stdout: stdout.join(""),
    stderr: stderr.join(""),
  };
};

const setupBase = async (dbPath: string): Promise<void> => {
  await runWithDb(["db", "migrate"], dbPath);
  await runWithDb(["db", "seed"], dbPath);
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("appctl event lifecycle", () => {
  it("event create validates ISO inputs and enforces unique slug", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    const bad = await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "spring-launch",
        "--title",
        "Spring Launch",
        "--start",
        "invalid-date",
        "--end",
        "2026-04-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );

    const first = await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "spring-launch",
        "--title",
        "Spring Launch",
        "--start",
        "2026-04-01T14:00:00Z",
        "--end",
        "2026-04-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );

    const duplicate = await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "spring-launch",
        "--title",
        "Duplicate",
        "--start",
        "2026-04-01T14:00:00Z",
        "--end",
        "2026-04-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );

    expect(bad.exitCode).toBe(2);
    expect(first.exitCode).toBe(0);
    expect(duplicate.exitCode).toBe(5);
  });

  it("event update changes only provided fields", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "update-test",
        "--title",
        "Before",
        "--start",
        "2026-04-01T14:00:00Z",
        "--end",
        "2026-04-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );

    const update = await runWithDb(
      ["--json", "event", "update", "--slug", "update-test", "--title", "After"],
      dbPath,
    );

    expect(update.exitCode).toBe(0);
    const payload = JSON.parse(update.stdout);
    expect(payload.data.title).toBe("After");
    expect(payload.data.start_at).toBe("2026-04-01T14:00:00.000Z");
    expect(payload.data.end_at).toBe("2026-04-01T15:00:00.000Z");
  });

  it("event publish is idempotent and audited", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "publish-test",
        "--title",
        "Publish Test",
        "--start",
        "2026-04-01T14:00:00Z",
        "--end",
        "2026-04-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );

    const first = await runWithDb(["event", "publish", "--slug", "publish-test"], dbPath);
    const second = await runWithDb(["event", "publish", "--slug", "publish-test"], dbPath);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);

    const db = new Database(dbPath);
    const eventRow = db.prepare("SELECT status FROM events WHERE slug = 'publish-test'").get() as {
      status: string;
    };
    const auditCount = db
      .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'event.publish'")
      .get() as { count: number };
    db.close();

    expect(eventRow.status).toBe("PUBLISHED");
    expect(auditCount.count).toBe(2);
  });

  it("event cancel sets CANCELLED and stores reason metadata", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "cancel-test",
        "--title",
        "Cancel Test",
        "--start",
        "2026-04-01T14:00:00Z",
        "--end",
        "2026-04-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );

    const cancel = await runWithDb(
      ["event", "cancel", "--slug", "cancel-test", "--reason", "verification"],
      dbPath,
    );

    expect(cancel.exitCode).toBe(0);

    const db = new Database(dbPath);
    const eventRow = db.prepare("SELECT status FROM events WHERE slug = 'cancel-test'").get() as {
      status: string;
    };
    const auditMeta = db
      .prepare("SELECT metadata FROM audit_log WHERE action = 'event.cancel' ORDER BY created_at DESC LIMIT 1")
      .get() as { metadata: string };
    db.close();

    expect(eventRow.status).toBe("CANCELLED");
    expect(JSON.parse(auditMeta.metadata).reason).toBe("verification");
  });

  it("event list supports status and date filters", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "list-one",
        "--title",
        "List One",
        "--start",
        "2026-04-01T14:00:00Z",
        "--end",
        "2026-04-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );
    await runWithDb(
      [
        "event",
        "create",
        "--slug",
        "list-two",
        "--title",
        "List Two",
        "--start",
        "2026-05-01T14:00:00Z",
        "--end",
        "2026-05-01T15:00:00Z",
        "--tz",
        "UTC",
      ],
      dbPath,
    );

    await runWithDb(["event", "cancel", "--slug", "list-two", "--reason", "verification"], dbPath);

    const filtered = await runWithDb(
      ["--json", "event", "list", "--status", "CANCELLED", "--from", "2026-04-15T00:00:00Z"],
      dbPath,
    );

    expect(filtered.exitCode).toBe(0);
    const payload = JSON.parse(filtered.stdout);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].slug).toBe("list-two");
    expect(payload.data[0].status).toBe("CANCELLED");
  });
});
