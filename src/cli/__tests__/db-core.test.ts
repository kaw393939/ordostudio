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
  const directory = await mkdtemp(join(tmpdir(), "appctl-db-test-"));
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

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("appctl db core", () => {
  it("migrate is idempotent", async () => {
    const dbPath = await createDbPath();

    const first = await runWithDb(["--json", "db", "migrate"], dbPath);
    const second = await runWithDb(["--json", "db", "migrate"], dbPath);
    const status = await runWithDb(["--json", "db", "status"], dbPath);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);

    const secondPayload = JSON.parse(second.stdout);
    expect(secondPayload.data.applied).toEqual([]);

    const statusPayload = JSON.parse(status.stdout);
    expect(statusPayload.data.pendingCount).toBe(0);
  });

  it("seed is idempotent", async () => {
    const dbPath = await createDbPath();
    await runWithDb(["db", "migrate"], dbPath);

    const first = await runWithDb(["--json", "db", "seed"], dbPath);
    const second = await runWithDb(["--json", "db", "seed"], dbPath);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);

    const db = new Database(dbPath);
    const count = db.prepare("SELECT COUNT(*) AS count FROM roles").get() as { count: number };
    db.close();

    expect(count.count).toBe(5);
  });

  it("seed fails with precondition when migrations are pending", async () => {
    const dbPath = await createDbPath();

    const result = await runWithDb(["db", "seed"], dbPath);

    expect(result.exitCode).toBe(6);
    expect(result.stderr).toContain("Migrations are pending");
  });

  it("doctor fails when schema is not current", async () => {
    const dbPath = await createDbPath();

    const result = await runWithDb(["doctor"], dbPath);

    expect(result.exitCode).toBe(6);
    expect(result.stderr).toContain("Schema is not up to date");
  });

  it("doctor detects invalid sqlite pragmas", async () => {
    const dbPath = await createDbPath();
    await runWithDb(["db", "migrate"], dbPath);

    const db = new Database(dbPath);
    db.pragma("journal_mode = DELETE");
    db.close();

    const result = await runWithDb(["doctor"], dbPath);

    expect(result.exitCode).toBe(6);
    expect(result.stderr).toContain("SQLite pragmas invalid");
  });

  it("seed fails closed when audit insert fails and roles are rolled back", async () => {
    const dbPath = await createDbPath();
    await runWithDb(["db", "migrate"], dbPath);

    const db = new Database(dbPath);
    db.exec("DROP TABLE audit_log");
    db.close();

    const result = await runWithDb(["db", "seed"], dbPath);
    expect(result.exitCode).toBe(1);

    const check = new Database(dbPath);
    const roles = check.prepare("SELECT COUNT(*) AS count FROM roles").get() as { count: number };
    check.close();

    expect(roles.count).toBe(0);
  });
});
