import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  const directory = await mkdtemp(join(tmpdir(), "appctl-backup-restore-test-"));
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

describe("appctl backup/restore", () => {
  it("creates backup artifact and restores round-trip locally", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    await runWithDb(["user", "create", "--email", "first@example.com", "--status", "ACTIVE"], dbPath);

    const outDir = await mkdtemp(join(tmpdir(), "appctl-backup-out-"));
    tempDirs.push(outDir);
    const backupPath = join(outDir, "backup.db");

    const backup = await runWithDb(["db", "backup", "--out", backupPath], dbPath);
    expect(backup.exitCode).toBe(0);

    const backupStat = await stat(backupPath);
    expect(backupStat.size).toBeGreaterThan(0);

    await runWithDb(["user", "create", "--email", "second@example.com", "--status", "ACTIVE"], dbPath);

    const restoreWithoutYes = await runWithDb(["db", "restore", "--from", backupPath], dbPath);
    expect(restoreWithoutYes.exitCode).toBe(6);

    const restore = await runWithDb(["db", "restore", "--from", backupPath, "--yes"], dbPath);
    expect(restore.exitCode).toBe(0);

    const users = await runWithDb(["--json", "user", "list"], dbPath);
    const payload = JSON.parse(users.stdout);
    const emails = payload.data.map((user: { email: string }) => user.email);

    expect(emails).toContain("first@example.com");
    expect(emails).not.toContain("second@example.com");
  });

  it("enforces prod dangerous-op guardrails for backup and restore", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    const outDir = await mkdtemp(join(tmpdir(), "appctl-prod-guard-"));
    tempDirs.push(outDir);
    const backupPath = join(outDir, "backup.db");

    const prodBackupNoForce = await runWithDb(
      ["db", "backup", "--out", backupPath, "--env", "prod", "--yes"],
      dbPath,
    );
    expect(prodBackupNoForce.exitCode).toBe(6);

    const prodBackupNoToken = await runWithDb(
      ["db", "backup", "--out", backupPath, "--env", "prod", "--yes", "--force-prod"],
      dbPath,
    );
    expect(prodBackupNoToken.exitCode).toBe(3);

    const tokenCreate = await runWithDb(["--json", "auth", "token", "create", "--name", "prod-guard"], dbPath);
    const token = JSON.parse(tokenCreate.stdout).data.token as string;

    const prodBackupWithToken = await runWithDb(
      [
        "db",
        "backup",
        "--out",
        backupPath,
        "--env",
        "prod",
        "--yes",
        "--force-prod",
        "--token",
        token,
      ],
      dbPath,
    );
    expect(prodBackupWithToken.exitCode).toBe(0);

    const prodRestoreNoForce = await runWithDb(
      ["db", "restore", "--from", backupPath, "--env", "prod", "--yes", "--token", token],
      dbPath,
    );
    expect(prodRestoreNoForce.exitCode).toBe(6);

    const prodRestoreNoToken = await runWithDb(
      ["db", "restore", "--from", backupPath, "--env", "prod", "--yes", "--force-prod"],
      dbPath,
    );
    expect(prodRestoreNoToken.exitCode).toBe(3);

    const prodRestoreWithToken = await runWithDb(
      [
        "db",
        "restore",
        "--from",
        backupPath,
        "--env",
        "prod",
        "--yes",
        "--force-prod",
        "--token",
        token,
      ],
      dbPath,
    );
    expect(prodRestoreWithToken.exitCode).toBe(0);
  });
});
