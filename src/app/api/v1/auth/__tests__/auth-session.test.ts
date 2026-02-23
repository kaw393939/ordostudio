import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getMe } from "../../me/route";
import { POST as postLogin } from "../login/route";
import { POST as postLogout } from "../logout/route";
import { POST as postRegister } from "../register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-auth-test-"));
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

describe("api/v1 auth/session", () => {
  it("registers user and logs in with secure session cookie semantics", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const registerResponse = await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "sprint8@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(registerResponse.status).toBe(201);

    const loginResponse = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "sprint8@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(loginResponse.status).toBe(200);
    const setCookie = loginResponse.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("lms_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).not.toContain("Secure");
  });

  it("sets Secure cookie in prod", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "prod";

    await postRegister(
      new Request("https://example.com/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://example.com",
        },
        body: JSON.stringify({
          email: "prod@example.com",
          password: "Password123!",
        }),
      }),
    );

    const loginResponse = await postLogin(
      new Request("https://example.com/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://example.com",
        },
        body: JSON.stringify({
          email: "prod@example.com",
          password: "Password123!",
        }),
      }),
    );

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers.get("set-cookie")).toContain("Secure");
  });

  it("returns me profile with role-aware links from active session", async () => {
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
          email: "adminish@example.com",
          password: "Password123!",
        }),
      }),
    );

    const db = new Database(dbPath);
    const user = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get("adminish@example.com") as { id: string };
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, adminRole.id);
    db.close();

    const loginResponse = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "adminish@example.com",
          password: "Password123!",
        }),
      }),
    );

    const cookieHeader = loginResponse.headers.get("set-cookie") ?? "";
    const sessionCookie = cookieHeader.split(";")[0];

    const meResponse = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        method: "GET",
        headers: {
          cookie: sessionCookie,
        },
      }),
    );

    expect(meResponse.status).toBe(200);
    const meBody = await meResponse.json();
    expect(meBody.email).toBe("adminish@example.com");
    expect(meBody.roles).toContain("ADMIN");
    expect(meBody._links).toMatchObject({
      self: { href: "/api/v1/me" },
      logout: { href: "/api/v1/auth/logout" },
    });
  });

  it("rejects missing session and supports logout invalidation", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const anonymousMe = await getMe(new Request("http://localhost:3000/api/v1/me"));
    expect(anonymousMe.status).toBe(401);
    const errorBody = await anonymousMe.json();
    expect(errorBody).toMatchObject({
      title: "Unauthorized",
      status: 401,
    });
    expect(errorBody.request_id).toBeTruthy();

    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "logout@example.com",
          password: "Password123!",
        }),
      }),
    );

    const loginResponse = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "logout@example.com",
          password: "Password123!",
        }),
      }),
    );
    const sessionCookie = (loginResponse.headers.get("set-cookie") ?? "").split(";")[0];

    const logoutResponse = await postLogout(
      new Request("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: sessionCookie,
        },
      }),
    );

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get("set-cookie")).toContain("Max-Age=0");

    const afterLogout = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        headers: {
          cookie: sessionCookie,
        },
      }),
    );
    expect(afterLogout.status).toBe(401);
  });
});
