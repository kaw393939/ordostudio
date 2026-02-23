import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postEvents } from "../route";
import { GET as getReminderPayload } from "../[slug]/reminder-payload/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-events-delivery-test-"));
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

const registerAndLoginAdmin = async (dbPath: string, email: string): Promise<string> => {
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

  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
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

describe("api/v1 events delivery logistics", () => {
  it("validates mode-specific required logistics", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "delivery-admin@example.com");

    const missingMeetingUrl = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "delivery-online",
          title: "Delivery Online",
          start: "2026-03-10T10:00:00.000Z",
          end: "2026-03-10T11:00:00.000Z",
          timezone: "UTC",
          delivery_mode: "ONLINE",
        }),
      }),
    );

    expect(missingMeetingUrl.status).toBe(400);

    const validHybrid = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "delivery-hybrid",
          title: "Delivery Hybrid",
          start: "2026-03-11T10:00:00.000Z",
          end: "2026-03-11T11:00:00.000Z",
          timezone: "UTC",
          delivery_mode: "HYBRID",
          location_text: "HQ Room 2",
          meeting_url: "https://meet.example.com/hybrid",
        }),
      }),
    );

    expect(validHybrid.status).toBe(201);
    const body = await validHybrid.json();
    expect(body.delivery_mode).toBe("HYBRID");
  });

  it("returns mode-aware reminder payload", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "reminder-admin@example.com");

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "reminder-mode",
          title: "Reminder Mode",
          start: "2026-03-12T10:00:00.000Z",
          end: "2026-03-12T11:00:00.000Z",
          timezone: "UTC",
          delivery_mode: "IN_PERSON",
          location_text: "123 Main St",
        }),
      }),
    );

    const reminder = await getReminderPayload(
      new Request("http://localhost:3000/api/v1/events/reminder-mode/reminder-payload", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "reminder-mode" }) },
    );

    expect(reminder.status).toBe(200);
    const payload = await reminder.json();
    expect(payload.data.delivery_mode).toBe("IN_PERSON");
    expect(payload.data.how_to_attend).toContain("123 Main St");
  });
});
