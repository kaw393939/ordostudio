import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getUsers } from "../route";
import { GET as getUserById, PATCH as patchUserById } from "../[id]/route";
import { POST as postUserRole } from "../[id]/roles/route";
import { DELETE as deleteUserRole } from "../[id]/roles/[role]/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";
import { resetRateLimits } from "../../../../../lib/api/rate-limit";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-users-test-"));
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

const registerAndLogin = async (email: string, password: string): Promise<string> => {
  await postRegister(
    new Request("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password }),
    }),
  );

  const login = await postLogin(
    new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password }),
    }),
  );

  return (login.headers.get("set-cookie") ?? "").split(";")[0];
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  resetRateLimits();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 users", () => {
  it("requires ADMIN role for user listing", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const userCookie = await registerAndLogin("basic-user@example.com", "Password123!");
    const denied = await getUsers(
      new Request("http://localhost:3000/api/v1/users", {
        headers: { cookie: userCookie },
      }),
    );

    expect(denied.status).toBe(403);
    expect((await denied.json()).title).toBe("Forbidden");
  });

  it("supports list and detail retrieval for admin session", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("admin@example.com", "Password123!");
    const db = new Database(dbPath);
    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@example.com") as {
      id: string;
    };
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'SUPER_ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(admin.id, adminRole.id);
    db.close();

    const listResponse = await getUsers(
      new Request("http://localhost:3000/api/v1/users", {
        headers: { cookie: adminCookie },
      }),
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.count).toBeGreaterThan(0);
    expect(listBody._links.self.href).toBe("/api/v1/users");

    const detailResponse = await getUserById(
      new Request(`http://localhost:3000/api/v1/users/${admin.id}`, {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ id: admin.id }) },
    );
    const detailBody = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailBody.id).toBe(admin.id);
    expect(detailBody.roles).toContain("SUPER_ADMIN");
  });

  it("updates user status and writes audit entry", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("patch-admin@example.com", "Password123!");
    const targetCookie = await registerAndLogin("target-user@example.com", "Password123!");
    expect(targetCookie).toContain("lms_session=");

    const db = new Database(dbPath);
    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("patch-admin@example.com") as {
      id: string;
    };
    const target = db.prepare("SELECT id FROM users WHERE email = ?").get("target-user@example.com") as {
      id: string;
    };
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'SUPER_ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(admin.id, adminRole.id);
    db.close();

    const patchResponse = await patchUserById(
      new Request(`http://localhost:3000/api/v1/users/${target.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ status: "DISABLED", confirm: true }),
      }),
      { params: Promise.resolve({ id: target.id }) },
    );

    expect(patchResponse.status).toBe(200);
    const patchBody = await patchResponse.json();
    expect(patchBody.status).toBe("DISABLED");

    const dbAfter = new Database(dbPath);
    const auditCount = dbAfter
      .prepare("SELECT COUNT(*) as count FROM audit_log WHERE action = 'api.user.update'")
      .get() as { count: number };
    dbAfter.close();

    expect(auditCount.count).toBeGreaterThan(0);
  });

  it("adds/removes roles idempotently and blocks SUPER_ADMIN changes", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("roles-admin@example.com", "Password123!");
    await registerAndLogin("roles-target@example.com", "Password123!");

    const db = new Database(dbPath);
    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("roles-admin@example.com") as {
      id: string;
    };
    const target = db.prepare("SELECT id FROM users WHERE email = ?").get("roles-target@example.com") as {
      id: string;
    };
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'SUPER_ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(admin.id, adminRole.id);
    db.close();

    const addOne = await postUserRole(
      new Request(`http://localhost:3000/api/v1/users/${target.id}/roles`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ role: "ADMIN", confirm: true }),
      }),
      { params: Promise.resolve({ id: target.id }) },
    );
    const addTwo = await postUserRole(
      new Request(`http://localhost:3000/api/v1/users/${target.id}/roles`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ role: "ADMIN", confirm: true }),
      }),
      { params: Promise.resolve({ id: target.id }) },
    );

    expect(addOne.status).toBe(200);
    expect(addTwo.status).toBe(200);

    const removeOne = await deleteUserRole(
      new Request(`http://localhost:3000/api/v1/users/${target.id}/roles/ADMIN?confirm=true`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
      }),
      { params: Promise.resolve({ id: target.id, role: "ADMIN" }) },
    );
    const removeTwo = await deleteUserRole(
      new Request(`http://localhost:3000/api/v1/users/${target.id}/roles/ADMIN?confirm=true`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
      }),
      { params: Promise.resolve({ id: target.id, role: "ADMIN" }) },
    );

    expect(removeOne.status).toBe(200);
    expect(removeTwo.status).toBe(200);

    const blockedAdd = await postUserRole(
      new Request(`http://localhost:3000/api/v1/users/${target.id}/roles`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ role: "SUPER_ADMIN", confirm: true }),
      }),
      { params: Promise.resolve({ id: target.id }) },
    );

    const blockedRemove = await deleteUserRole(
      new Request(`http://localhost:3000/api/v1/users/${target.id}/roles/SUPER_ADMIN?confirm=true`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
      }),
      { params: Promise.resolve({ id: target.id, role: "SUPER_ADMIN" }) },
    );

    expect(blockedAdd.status).toBe(403);
    expect(blockedRemove.status).toBe(403);
  });
});
