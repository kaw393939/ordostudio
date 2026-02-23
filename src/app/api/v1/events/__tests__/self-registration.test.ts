import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postEvents } from "../route";
import { DELETE as deleteRegistration } from "../[slug]/registrations/[userId]/route";
import { POST as postRegistration } from "../[slug]/registrations/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-self-reg-test-"));
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

const registerAndLogin = async (email: string): Promise<string> => {
  await postRegister(
    new Request("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password: "Password123!" }),
    }),
  );

  const login = await postLogin(
    new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password: "Password123!" }),
    }),
  );

  return (login.headers.get("set-cookie") ?? "").split(";")[0];
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("self registration API", () => {
  it("allows authenticated user to register and cancel themselves", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("self-admin@example.com");
    const userCookie = await registerAndLogin("self-user@example.com");

    const db = new Database(dbPath);
    const admin = db.prepare("SELECT id FROM users WHERE email = 'self-admin@example.com'").get() as { id: string };
    const user = db.prepare("SELECT id FROM users WHERE email = 'self-user@example.com'").get() as { id: string };
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(admin.id, adminRole.id);
    db.close();

    const createEvent = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          slug: "self-reg-event",
          title: "Self Registration Event",
          start: "2026-06-01T10:00:00.000Z",
          end: "2026-06-01T11:00:00.000Z",
          timezone: "UTC",
          capacity: 1,
        }),
      }),
    );
    expect(createEvent.status).toBe(201);

    const addSelf = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/self-reg-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: userCookie,
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
      { params: Promise.resolve({ slug: "self-reg-event" }) },
    );
    expect(addSelf.status).toBe(200);
    expect((await addSelf.json()).status).toBe("REGISTERED");

    const removeSelf = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/self-reg-event/registrations/${user.id}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: userCookie,
        },
      }),
      { params: Promise.resolve({ slug: "self-reg-event", userId: user.id }) },
    );

    expect(removeSelf.status).toBe(200);
    expect((await removeSelf.json()).status).toBe("CANCELLED");
  });

  it("prevents non-admin users from managing other users registrations", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("self-admin-2@example.com");
    const userCookie = await registerAndLogin("self-user-2@example.com");
    await registerAndLogin("other-user@example.com");

    const db = new Database(dbPath);
    const admin = db.prepare("SELECT id FROM users WHERE email = 'self-admin-2@example.com'").get() as { id: string };
    const user = db.prepare("SELECT id FROM users WHERE email = 'self-user-2@example.com'").get() as { id: string };
    const other = db.prepare("SELECT id FROM users WHERE email = 'other-user@example.com'").get() as { id: string };
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(admin.id, adminRole.id);
    db.close();

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          slug: "forbidden-self-reg",
          title: "Forbidden Self Registration",
          start: "2026-06-02T10:00:00.000Z",
          end: "2026-06-02T11:00:00.000Z",
          timezone: "UTC",
          capacity: 2,
        }),
      }),
    );

    const addOther = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/forbidden-self-reg/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: userCookie,
        },
        body: JSON.stringify({ user_id: other.id }),
      }),
      { params: Promise.resolve({ slug: "forbidden-self-reg" }) },
    );

    expect(addOther.status).toBe(403);

    const removeOther = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/forbidden-self-reg/registrations/${other.id}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: userCookie,
        },
      }),
      { params: Promise.resolve({ slug: "forbidden-self-reg", userId: other.id }) },
    );

    expect(removeOther.status).toBe(403);

    const removeSelfWithoutRegistration = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/forbidden-self-reg/registrations/${user.id}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: userCookie,
        },
      }),
      { params: Promise.resolve({ slug: "forbidden-self-reg", userId: user.id }) },
    );

    expect(removeSelfWithoutRegistration.status).toBe(404);
  });
});
