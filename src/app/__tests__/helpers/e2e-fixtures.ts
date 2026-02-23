import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

import { POST as postLogin } from "../../api/v1/auth/login/route";
import { POST as postRegister } from "../../api/v1/auth/register/route";
import { POST as postEvent } from "../../api/v1/events/route";
import { POST as postPublish } from "../../api/v1/events/[slug]/publish/route";
import { POST as postCancel } from "../../api/v1/events/[slug]/cancel/route";
import { POST as postRegistration } from "../../api/v1/events/[slug]/registrations/route";
import { runCli } from "../../../cli/run-cli";
import type { CliIo } from "../../../cli/types";
import { resetRateLimits } from "../../../lib/api/rate-limit";

const tempDirs: string[] = [];

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

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-e2e-fixture-"));
  tempDirs.push(directory);
  return join(directory, "app.db");
};

const login = async (email: string): Promise<string> => {
  const response = await postLogin(
    new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password: "Password123!" }),
    }),
  );

  return (response.headers.get("set-cookie") ?? "").split(";")[0];
};

const registerUser = async (email: string) => {
  const response = await postRegister(
    new Request("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password: "Password123!" }),
    }),
  );

  if (response.status !== 201) {
    throw new Error(`failed_register_${email}`);
  }
};

const addAdminRole = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
  db.close();
};

const addSuperAdminRole = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'SUPER_ADMIN'").get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
  db.close();
};

const userIdByEmail = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  db.close();
  return user.id;
};

const createEvent = async (
  adminCookie: string,
  payload: {
    slug: string;
    title: string;
    start: string;
    end: string;
    timezone: string;
    capacity: number;
  },
) => {
  const response = await postEvent(
    new Request("http://localhost:3000/api/v1/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        cookie: adminCookie,
      },
      body: JSON.stringify(payload),
    }),
  );

  if (response.status !== 201) {
    throw new Error(`failed_event_create_${payload.slug}`);
  }
};

const publishEvent = async (adminCookie: string, slug: string) => {
  const response = await postPublish(
    new Request(`http://localhost:3000/api/v1/events/${slug}/publish`, {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        cookie: adminCookie,
      },
    }),
    { params: Promise.resolve({ slug }) },
  );

  if (response.status !== 200) {
    throw new Error(`failed_event_publish_${slug}`);
  }
};

const cancelEvent = async (adminCookie: string, slug: string, reason: string) => {
  const response = await postCancel(
    new Request(`http://localhost:3000/api/v1/events/${slug}/cancel`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        cookie: adminCookie,
      },
      body: JSON.stringify({ reason }),
    }),
    { params: Promise.resolve({ slug }) },
  );

  if (response.status !== 200) {
    throw new Error(`failed_event_cancel_${slug}`);
  }
};

const registerForEvent = async (cookie: string, slug: string, userId: string) => {
  const response = await postRegistration(
    new Request(`http://localhost:3000/api/v1/events/${slug}/registrations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        cookie,
      },
      body: JSON.stringify({ user_id: userId }),
    }),
    { params: Promise.resolve({ slug }) },
  );

  if (response.status !== 200) {
    throw new Error(`failed_event_registration_${slug}`);
  }
};

export type StandardE2EFixture = {
  dbPath: string;
  adminCookie: string;
  superAdminCookie: string;
  userCookie: string;
  adminId: string;
  superAdminId: string;
  userId: string;
};

export const setupStandardE2EFixture = async (): Promise<StandardE2EFixture> => {
  resetRateLimits(); // Clear rate limits from previous test
  const dbPath = await createDbPath();

  process.env.APPCTL_DB_FILE = dbPath;
  process.env.APPCTL_ENV = "local";

  await runWithDb(["db", "migrate"], dbPath);
  await runWithDb(["db", "seed"], dbPath);
  process.env.APPCTL_DB_FILE = dbPath;

  await registerUser("usera@example.com");
  await registerUser("admina@example.com");
  await registerUser("superadmina@example.com");

  addAdminRole(dbPath, "admina@example.com");
  addSuperAdminRole(dbPath, "superadmina@example.com");

  const userCookie = await login("usera@example.com");
  const adminCookie = await login("admina@example.com");
  const superAdminCookie = await login("superadmina@example.com");

  await createEvent(adminCookie, {
    slug: "published-open",
    title: "Published Open",
    start: "2026-09-01T10:00:00.000Z",
    end: "2026-09-01T11:00:00.000Z",
    timezone: "UTC",
    capacity: 20,
  });

  await createEvent(adminCookie, {
    slug: "published-full",
    title: "Published Full",
    start: "2026-09-02T10:00:00.000Z",
    end: "2026-09-02T11:00:00.000Z",
    timezone: "UTC",
    capacity: 1,
  });

  await createEvent(adminCookie, {
    slug: "draft-event",
    title: "Draft Event",
    start: "2026-09-03T10:00:00.000Z",
    end: "2026-09-03T11:00:00.000Z",
    timezone: "UTC",
    capacity: 50,
  });

  await createEvent(adminCookie, {
    slug: "cancelled-event",
    title: "Cancelled Event",
    start: "2026-09-04T10:00:00.000Z",
    end: "2026-09-04T11:00:00.000Z",
    timezone: "UTC",
    capacity: 50,
  });

  await publishEvent(adminCookie, "published-open");
  await publishEvent(adminCookie, "published-full");
  await publishEvent(adminCookie, "cancelled-event");
  await cancelEvent(adminCookie, "cancelled-event", "Fixture cancellation");

  const userId = userIdByEmail(dbPath, "usera@example.com");
  const adminId = userIdByEmail(dbPath, "admina@example.com");
  const superAdminId = userIdByEmail(dbPath, "superadmina@example.com");

  await registerForEvent(userCookie, "published-open", userId);
  await registerForEvent(userCookie, "published-full", userId);

  return {
    dbPath,
    adminCookie,
    superAdminCookie,
    userCookie,
    adminId,
    superAdminId,
    userId,
  };
};

export const cleanupStandardE2EFixtures = async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  resetRateLimits();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
};
