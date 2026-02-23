import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postEvents } from "../route";
import { GET as getRegistrations, POST as postRegistration } from "../[slug]/registrations/route";
import { DELETE as deleteRegistration } from "../[slug]/registrations/[userId]/route";
import { POST as postCheckin } from "../[slug]/checkins/route";
import { GET as getExport } from "../[slug]/export/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";
import { resetRateLimits } from "../../../../../lib/api/rate-limit";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-reg-test-"));
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

const addAdminRole = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
  db.close();
};

const createEventAsAdmin = async (adminCookie: string, slug: string, capacity = 1) => {
  const create = await postEvents(
    new Request("http://localhost:3000/api/v1/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        cookie: adminCookie,
      },
      body: JSON.stringify({
        slug,
        title: slug,
        start: "2026-04-01T10:00:00.000Z",
        end: "2026-04-01T11:00:00.000Z",
        timezone: "UTC",
        capacity,
      }),
    }),
  );
  expect(create.status).toBe(201);
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  resetRateLimits();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 registrations/checkin/export", () => {
  it("adds registrations with capacity waitlist behavior", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("reg-admin@example.com");
    addAdminRole(dbPath, "reg-admin@example.com");
    await createEventAsAdmin(adminCookie, "waitlist-event", 1);

    await registerAndLogin("user1@example.com");
    await registerAndLogin("user2@example.com");

    const db = new Database(dbPath);
    const user1 = db.prepare("SELECT id FROM users WHERE email = 'user1@example.com'").get() as { id: string };
    const user2 = db.prepare("SELECT id FROM users WHERE email = 'user2@example.com'").get() as { id: string };
    db.close();

    const addOne = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/waitlist-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: user1.id }),
      }),
      { params: Promise.resolve({ slug: "waitlist-event" }) },
    );

    const addTwo = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/waitlist-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: user2.id }),
      }),
      { params: Promise.resolve({ slug: "waitlist-event" }) },
    );

    expect((await addOne.json()).status).toBe("REGISTERED");
    expect((await addTwo.json()).status).toBe("WAITLISTED");
  });

  it("removes as CANCELLED state transition and supports check-in", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("checkin-admin@example.com");
    addAdminRole(dbPath, "checkin-admin@example.com");
    await createEventAsAdmin(adminCookie, "checkin-event", 5);

    await registerAndLogin("checkin-user@example.com");
    const db = new Database(dbPath);
    const user = db.prepare("SELECT id FROM users WHERE email = 'checkin-user@example.com'").get() as {
      id: string;
    };
    db.close();

    await postRegistration(
      new Request("http://localhost:3000/api/v1/events/checkin-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
      { params: Promise.resolve({ slug: "checkin-event" }) },
    );

    const checkedIn = await postCheckin(
      new Request("http://localhost:3000/api/v1/events/checkin-event/checkins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
      { params: Promise.resolve({ slug: "checkin-event" }) },
    );
    expect((await checkedIn.json()).status).toBe("CHECKED_IN");

    const removed = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/checkin-event/registrations/${user.id}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "checkin-event", userId: user.id }) },
    );
    expect((await removed.json()).status).toBe("CANCELLED");

    const checkinAfterCancel = await postCheckin(
      new Request("http://localhost:3000/api/v1/events/checkin-event/checkins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
      { params: Promise.resolve({ slug: "checkin-event" }) },
    );
    expect(checkinAfterCancel.status).toBe(412);
  });

  it("exports json/csv and enforces include_email governance", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("export-admin@example.com");
    addAdminRole(dbPath, "export-admin@example.com");
    await createEventAsAdmin(adminCookie, "export-event", 5);

    await registerAndLogin("export-user@example.com");
    const db = new Database(dbPath);
    const user = db.prepare("SELECT id FROM users WHERE email = 'export-user@example.com'").get() as {
      id: string;
    };
    db.close();

    await postRegistration(
      new Request("http://localhost:3000/api/v1/events/export-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
      { params: Promise.resolve({ slug: "export-event" }) },
    );

    const exportJson = await getExport(
      new Request("http://localhost:3000/api/v1/events/export-event/export?format=json&include_email=true", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "export-event" }) },
    );
    expect(exportJson.status).toBe(200);
    expect(exportJson.headers.get("content-type")).toContain("application/json");

    const exportCsv = await getExport(
      new Request("http://localhost:3000/api/v1/events/export-event/export?format=csv", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "export-event" }) },
    );
    expect(exportCsv.status).toBe(200);
    expect(exportCsv.headers.get("content-type")).toContain("text/csv");

    process.env.APPCTL_ENV = "prod";
    const blocked = await getExport(
      new Request("https://example.com/api/v1/events/export-event/export?format=json&include_email=true", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "export-event" }) },
    );
    expect(blocked.status).toBe(403);
  });

  it("lists registrations with optional status filter", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("list-reg-admin@example.com");
    addAdminRole(dbPath, "list-reg-admin@example.com");
    await createEventAsAdmin(adminCookie, "list-reg-event", 10);

    await registerAndLogin("list-reg-user@example.com");
    const db = new Database(dbPath);
    const user = db.prepare("SELECT id FROM users WHERE email = 'list-reg-user@example.com'").get() as {
      id: string;
    };
    db.close();

    await postRegistration(
      new Request("http://localhost:3000/api/v1/events/list-reg-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
      { params: Promise.resolve({ slug: "list-reg-event" }) },
    );

    const listAll = await getRegistrations(
      new Request("http://localhost:3000/api/v1/events/list-reg-event/registrations", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "list-reg-event" }) },
    );
    const listFiltered = await getRegistrations(
      new Request("http://localhost:3000/api/v1/events/list-reg-event/registrations?status=REGISTERED", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "list-reg-event" }) },
    );

    expect(listAll.status).toBe(200);
    expect(listFiltered.status).toBe(200);
    expect((await listFiltered.json()).items).toHaveLength(1);
  });
});
