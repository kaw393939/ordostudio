import { mkdtemp, readFile, rm } from "node:fs/promises";
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
  const directory = await mkdtemp(join(tmpdir(), "appctl-reg-export-test-"));
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

const setupUsersAndEvent = async (dbPath: string): Promise<void> => {
  await runWithDb(["user", "create", "--email", "admin@example.com", "--status", "ACTIVE"], dbPath);
  await runWithDb(["user", "create", "--email", "guest@example.com", "--status", "ACTIVE"], dbPath);
  await runWithDb(
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
      "--capacity",
      "1",
    ],
    dbPath,
  );
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("appctl registration/export", () => {
  it("full events place new registrations in WAITLISTED", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    await setupUsersAndEvent(dbPath);

    const first = await runWithDb(["--json", "reg", "add", "--event", "spring-launch", "--user", "admin@example.com"], dbPath);
    const second = await runWithDb(["--json", "reg", "add", "--event", "spring-launch", "--user", "guest@example.com"], dbPath);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);

    expect(JSON.parse(first.stdout).data.status).toBe("REGISTERED");
    expect(JSON.parse(second.stdout).data.status).toBe("WAITLISTED");
  });

  it("reg remove transitions to CANCELLED without hard delete", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    await setupUsersAndEvent(dbPath);

    await runWithDb(["reg", "add", "--event", "spring-launch", "--user", "admin@example.com"], dbPath);
    const removed = await runWithDb(
      ["--json", "reg", "remove", "--event", "spring-launch", "--user", "admin@example.com", "--reason", "test"],
      dbPath,
    );

    expect(removed.exitCode).toBe(0);
    expect(JSON.parse(removed.stdout).data.status).toBe("CANCELLED");

    const db = new Database(dbPath);
    const count = db.prepare("SELECT COUNT(*) AS count FROM event_registrations").get() as { count: number };
    db.close();

    expect(count.count).toBe(1);
  });

  it("checkin transitions registration to CHECKED_IN", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    await setupUsersAndEvent(dbPath);

    await runWithDb(["reg", "add", "--event", "spring-launch", "--user", "admin@example.com"], dbPath);
    const checkedIn = await runWithDb(
      ["--json", "checkin", "--event", "spring-launch", "--user", "admin@example.com"],
      dbPath,
    );

    expect(checkedIn.exitCode).toBe(0);
    expect(JSON.parse(checkedIn.stdout).data.status).toBe("CHECKED_IN");
  });

  it("event export writes csv and json files", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    await setupUsersAndEvent(dbPath);

    await runWithDb(["reg", "add", "--event", "spring-launch", "--user", "admin@example.com"], dbPath);

    const outDir = await mkdtemp(join(tmpdir(), "appctl-export-out-"));
    tempDirs.push(outDir);
    const csvOut = join(outDir, "spring-launch.csv");
    const jsonOut = join(outDir, "spring-launch.json");

    const csv = await runWithDb(
      ["event", "export", "--slug", "spring-launch", "--format", "csv", "--out", csvOut],
      dbPath,
    );
    const json = await runWithDb(
      ["event", "export", "--slug", "spring-launch", "--format", "json", "--out", jsonOut],
      dbPath,
    );

    expect(csv.exitCode).toBe(0);
    expect(json.exitCode).toBe(0);

    const csvContent = await readFile(csvOut, "utf8");
    const jsonContent = await readFile(jsonOut, "utf8");

    expect(csvContent).toContain("id,status,user_id");
    expect(JSON.parse(jsonContent)).toHaveLength(1);
  });

  it("include-email requires token outside local and mutations are audited", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    await setupUsersAndEvent(dbPath);

    await runWithDb(["reg", "add", "--event", "spring-launch", "--user", "admin@example.com"], dbPath);

    const outDir = await mkdtemp(join(tmpdir(), "appctl-export-sec-"));
    tempDirs.push(outDir);
    const secureOut = join(outDir, "secure.json");

    const withoutToken = await runWithDb(
      [
        "event",
        "export",
        "--slug",
        "spring-launch",
        "--format",
        "json",
        "--out",
        secureOut,
        "--include-email",
        "--env",
        "staging",
      ],
      dbPath,
    );
    expect(withoutToken.exitCode).toBe(3);

    const created = await runWithDb(["--json", "auth", "token", "create", "--name", "exp"], dbPath);
    const token = JSON.parse(created.stdout).data.token as string;

    const withToken = await runWithDb(
      [
        "event",
        "export",
        "--slug",
        "spring-launch",
        "--format",
        "json",
        "--out",
        secureOut,
        "--include-email",
        "--env",
        "staging",
        "--token",
        token,
      ],
      dbPath,
    );

    expect(withToken.exitCode).toBe(0);
    const exported = JSON.parse(await readFile(secureOut, "utf8"));
    expect(exported[0].user_email).toBe("admin@example.com");

    const checkin = await runWithDb(["checkin", "--event", "spring-launch", "--user", "admin@example.com"], dbPath);
    expect(checkin.exitCode).toBe(0);

    const db = new Database(dbPath);
    const addAudit = db
      .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'registration.add'")
      .get() as { count: number };
    const checkinAudit = db
      .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'registration.checkin'")
      .get() as { count: number };
    const exportAudit = db
      .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'event.export'")
      .get() as { count: number };
    db.close();

    expect(addAudit.count).toBeGreaterThan(0);
    expect(checkinAudit.count).toBeGreaterThan(0);
    expect(exportAudit.count).toBeGreaterThan(0);
  });
});
