import { createHash } from "node:crypto";
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
  const directory = await mkdtemp(join(tmpdir(), "appctl-auth-user-test-"));
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

describe("appctl auth/user", () => {
  it("token create shows token once and stores hash only", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    const create = await runWithDb(["--json", "auth", "token", "create", "--name", "sprint3"], dbPath);
    expect(create.exitCode).toBe(0);

    const payload = JSON.parse(create.stdout);
    const token = payload.data.token as string;
    const tokenId = payload.data.id as string;

    const db = new Database(dbPath);
    const stored = db
      .prepare("SELECT token_hash FROM service_tokens WHERE id = ?")
      .get(tokenId) as { token_hash: string };
    db.close();

    const expectedHash = createHash("sha256").update(token).digest("hex");
    expect(token).not.toBe(stored.token_hash);
    expect(stored.token_hash).toBe(expectedHash);
  });

  it("staging write requires token and revoked token is rejected", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    const unauthorized = await runWithDb(
      ["user", "create", "--email", "no-token@example.com", "--env", "staging"],
      dbPath,
    );
    expect(unauthorized.exitCode).toBe(3);

    const created = await runWithDb(["--json", "auth", "token", "create", "--name", "api"], dbPath);
    const createdPayload = JSON.parse(created.stdout);
    const token = createdPayload.data.token as string;
    const tokenId = createdPayload.data.id as string;

    const withToken = await runWithDb(
      [
        "user",
        "create",
        "--email",
        "with-token@example.com",
        "--status",
        "ACTIVE",
        "--env",
        "staging",
        "--token",
        token,
      ],
      dbPath,
    );
    expect(withToken.exitCode).toBe(0);

    const revoke = await runWithDb(["auth", "token", "revoke", "--id", tokenId], dbPath);
    expect(revoke.exitCode).toBe(0);

    const afterRevoke = await runWithDb(
      ["user", "create", "--email", "revoked@example.com", "--env", "staging", "--token", token],
      dbPath,
    );
    expect(afterRevoke.exitCode).toBe(3);
  });

  it("user create enforces unique email conflict", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    const first = await runWithDb(["user", "create", "--email", "dup@example.com"], dbPath);
    const second = await runWithDb(["user", "create", "--email", "dup@example.com"], dbPath);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(5);
  });

  it("role add/remove are idempotent and audited", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    const createUser = await runWithDb(
      ["--json", "user", "create", "--email", "role-user@example.com", "--status", "ACTIVE"],
      dbPath,
    );
    const userId = JSON.parse(createUser.stdout).data.id as string;

    const addOne = await runWithDb(["user", "role", "add", "--id", userId, "--role", "ADMIN"], dbPath);
    const addTwo = await runWithDb(["user", "role", "add", "--id", userId, "--role", "ADMIN"], dbPath);
    const removeOne = await runWithDb(["user", "role", "remove", "--id", userId, "--role", "ADMIN"], dbPath);
    const removeTwo = await runWithDb(["user", "role", "remove", "--id", userId, "--role", "ADMIN"], dbPath);

    expect(addOne.exitCode).toBe(0);
    expect(addTwo.exitCode).toBe(0);
    expect(removeOne.exitCode).toBe(0);
    expect(removeTwo.exitCode).toBe(0);

    const db = new Database(dbPath);
    const userRoleCount = db
      .prepare("SELECT COUNT(*) AS count FROM user_roles WHERE user_id = ?")
      .get(userId) as { count: number };
    const addAuditCount = db
      .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'user.role.add'")
      .get() as { count: number };
    const removeAuditCount = db
      .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'user.role.remove'")
      .get() as { count: number };
    db.close();

    expect(userRoleCount.count).toBe(0);
    expect(addAuditCount.count).toBe(2);
    expect(removeAuditCount.count).toBe(2);
  });

  it("returns not-found exit code 4 for missing user", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);

    const missing = await runWithDb(["user", "disable", "--id", "missing-user-id"], dbPath);
    expect(missing.exitCode).toBe(4);
  });
});
