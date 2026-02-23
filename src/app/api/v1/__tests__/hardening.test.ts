import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postRegister } from "../auth/register/route";
import { POST as postLogin } from "../auth/login/route";
import { GET as getUsers } from "../users/route";
import { GET as getExport } from "../events/[slug]/export/route";
import { POST as postEvents } from "../events/route";
import { POST as postRegistration } from "../events/[slug]/registrations/route";
import { runCli } from "../../../../cli/run-cli";
import { CliIo } from "../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-hardening-test-"));
  tempDirs.push(directory);
  return join(directory, "app.db");
};

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

const runWithDb = async (argv: string[], dbPath: string): Promise<number> => {
  const { io } = createIo();
  const previousDbPath = process.env.APPCTL_DB_FILE;

  process.env.APPCTL_DB_FILE = dbPath;
  const exitCode = await runCli(argv, io);

  if (previousDbPath === undefined) {
    delete process.env.APPCTL_DB_FILE;
  } else {
    process.env.APPCTL_DB_FILE = previousDbPath;
  }

  return exitCode;
};

const setupBase = async (dbPath: string): Promise<void> => {
  await runWithDb(["db", "migrate"], dbPath);
  await runWithDb(["db", "seed"], dbPath);
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api hardening", () => {
  it("applies rate limit to register/login/export endpoints", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    for (let index = 0; index < 5; index += 1) {
      const registerResponse = await postRegister(
        new Request("http://localhost:3000/api/v1/auth/register", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "10.0.0.1",
          },
          body: JSON.stringify({
            email: `limit${index}@example.com`,
            password: "Password123!",
          }),
        }),
      );
      expect(registerResponse.status).toBe(201);
    }

    const blockedRegister = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "10.0.0.1",
        },
        body: JSON.stringify({
          email: "limit-block@example.com",
          password: "Password123!",
        }),
      }),
    );
    expect(blockedRegister.status).toBe(429);

    const loginAllowed = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "10.0.0.2",
        },
        body: JSON.stringify({
          email: "limit0@example.com",
          password: "Password123!",
        }),
      }),
    );
    expect(loginAllowed.status).toBe(200);

    for (let index = 0; index < 4; index += 1) {
      await postLogin(
        new Request("http://localhost:3000/api/v1/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "10.0.0.2",
          },
          body: JSON.stringify({
            email: "limit0@example.com",
            password: "Password123!",
          }),
        }),
      );
    }

    const blockedLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "10.0.0.2",
        },
        body: JSON.stringify({
          email: "limit0@example.com",
          password: "Password123!",
        }),
      }),
    );
    expect(blockedLogin.status).toBe(429);
  });

  it("sets no-store cache headers on auth and users endpoints", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const register = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "cache-admin@example.com",
          password: "Password123!",
        }),
      }),
    );
    expect(register.headers.get("cache-control")).toBe("no-store");

    const db = new Database(dbPath);
    const user = db.prepare("SELECT id FROM users WHERE email = 'cache-admin@example.com'").get() as { id: string };
    const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
    db.close();

    const login = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "cache-admin@example.com",
          password: "Password123!",
        }),
      }),
    );

    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
    const users = await getUsers(
      new Request("http://localhost:3000/api/v1/users", {
        headers: { cookie },
      }),
    );

    expect(login.headers.get("cache-control")).toBe("no-store");
    expect(users.headers.get("cache-control")).toBe("no-store");
  });

  it("rate limits export endpoint independently", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "export-limit-admin@example.com",
          password: "Password123!",
        }),
      }),
    );

    const db = new Database(dbPath);
    const admin = db
      .prepare("SELECT id FROM users WHERE email = 'export-limit-admin@example.com'")
      .get() as { id: string };
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(admin.id, adminRole.id);
    db.close();

    const login = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "export-limit-admin@example.com",
          password: "Password123!",
        }),
      }),
    );
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "export-limit-user@example.com",
          password: "Password123!",
        }),
      }),
    );

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie,
        },
        body: JSON.stringify({
          slug: "rate-export-event",
          title: "Rate Export Event",
          start: "2026-05-01T10:00:00.000Z",
          end: "2026-05-01T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );

    const dbAfter = new Database(dbPath);
    const user = dbAfter
      .prepare("SELECT id FROM users WHERE email = 'export-limit-user@example.com'")
      .get() as { id: string };
    dbAfter.close();

    await postRegistration(
      new Request("http://localhost:3000/api/v1/events/rate-export-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie,
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
      { params: Promise.resolve({ slug: "rate-export-event" }) },
    );

    for (let index = 0; index < 5; index += 1) {
      const allowed = await getExport(
        new Request("http://localhost:3000/api/v1/events/rate-export-event/export?format=json", {
          headers: {
            cookie,
            "x-forwarded-for": "10.0.0.3",
          },
        }),
        { params: Promise.resolve({ slug: "rate-export-event" }) },
      );
      expect(allowed.status).toBe(200);
    }

    const blocked = await getExport(
      new Request("http://localhost:3000/api/v1/events/rate-export-event/export?format=json", {
        headers: {
          cookie,
          "x-forwarded-for": "10.0.0.3",
        },
      }),
      { params: Promise.resolve({ slug: "rate-export-event" }) },
    );

    expect(blocked.status).toBe(429);
  });
});
