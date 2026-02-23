import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getEvents, POST as postEvents } from "../api/v1/events/route";
import { POST as postPublishEvent } from "../api/v1/events/[slug]/publish/route";
import { POST as postRegistration } from "../api/v1/events/[slug]/registrations/route";
import { DELETE as deleteRegistration } from "../api/v1/events/[slug]/registrations/[userId]/route";
import { POST as postCheckin } from "../api/v1/events/[slug]/checkins/route";
import { GET as getExport } from "../api/v1/events/[slug]/export/route";
import { GET as getMe } from "../api/v1/me/route";
import { POST as postAddRole } from "../api/v1/users/[id]/roles/route";
import { POST as postLogin } from "../api/v1/auth/login/route";
import { POST as postLogout } from "../api/v1/auth/logout/route";
import { POST as postRegister } from "../api/v1/auth/register/route";
import { runCli } from "../../cli/run-cli";
import { type CliIo } from "../../cli/types";
import { requestHal } from "../../lib/hal-client";
import { resetRateLimits } from "../../lib/api/rate-limit";

const tempDirs: string[] = [];

const readUiSource = async (...relativeCandidates: string[]): Promise<string> => {
  for (const relativePath of relativeCandidates) {
    const absolutePath = join(process.cwd(), relativePath);
    if (existsSync(absolutePath)) {
      return readFile(absolutePath, "utf8");
    }
  }

  throw new Error(`Unable to locate UI source for candidates: ${relativeCandidates.join(", ")}`);
};

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-ui-hardening-test-"));
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

const withDb = (dbPath: string) => new Database(dbPath);

const userIdByEmail = (dbPath: string, email: string) => {
  const db = withDb(dbPath);
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  db.close();
  return row.id;
};

const addAdminRole = (dbPath: string, email: string) => {
  const db = withDb(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
  db.close();
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  vi.restoreAllMocks();
  resetRateLimits();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("e2e ui hardening release gate", () => {
  it("passes critical auth, public events, registration, waitlist, cancel, admin check-in, and export flows", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("gate-admin@example.com");
    const userOneCookie = await registerAndLogin("gate-user-1@example.com");
    const userTwoCookie = await registerAndLogin("gate-user-2@example.com");

    addAdminRole(dbPath, "gate-admin@example.com");
    const adminId = userIdByEmail(dbPath, "gate-admin@example.com");
    const userOneId = userIdByEmail(dbPath, "gate-user-1@example.com");
    const userTwoId = userIdByEmail(dbPath, "gate-user-2@example.com");

    const meResponse = await getMe(
      new Request("http://localhost:3000/api/v1/me", {
        method: "GET",
        headers: {
          cookie: adminCookie,
        },
      }),
    );
    expect(meResponse.status).toBe(200);

    const logoutResponse = await postLogout(
      new Request("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: userOneCookie,
        },
      }),
    );
    expect(logoutResponse.status).toBe(200);

    const reloginUserOne = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "gate-user-1@example.com", password: "Password123!" }),
      }),
    );
    const reloginUserOneCookie = (reloginUserOne.headers.get("set-cookie") ?? "").split(";")[0];

    const createAdminEvent = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          slug: "admin-gate-event",
          title: "Admin Gate Event",
          start: "2026-08-01T10:00:00.000Z",
          end: "2026-08-01T11:00:00.000Z",
          timezone: "UTC",
          capacity: 5,
        }),
      }),
    );
    expect(createAdminEvent.status).toBe(201);

    const publishAdminEvent = await postPublishEvent(
      new Request("http://localhost:3000/api/v1/events/admin-gate-event/publish", {
        method: "POST",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "admin-gate-event" }) },
    );
    expect(publishAdminEvent.status).toBe(200);

    const publicEvents = await getEvents(new Request("http://localhost:3000/api/v1/events"));
    expect(publicEvents.status).toBe(200);
    const publicBody = await publicEvents.json();
    expect(publicBody.items.some((item: { slug: string }) => item.slug === "admin-gate-event")).toBe(true);

    const registerPublished = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/admin-gate-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: reloginUserOneCookie,
        },
        body: JSON.stringify({ user_id: userOneId }),
      }),
      { params: Promise.resolve({ slug: "admin-gate-event" }) },
    );
    expect(registerPublished.status).toBe(200);
    expect((await registerPublished.json()).status).toBe("REGISTERED");

    const checkinPublished = await postCheckin(
      new Request("http://localhost:3000/api/v1/events/admin-gate-event/checkins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ user_id: userOneId }),
      }),
      { params: Promise.resolve({ slug: "admin-gate-event" }) },
    );
    expect(checkinPublished.status).toBe(200);

    const exportPublished = await getExport(
      new Request("http://localhost:3000/api/v1/events/admin-gate-event/export?format=json", {
        headers: {
          cookie: adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "admin-gate-event" }) },
    );
    expect(exportPublished.status).toBe(200);

    const createWaitlistEvent = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          slug: "waitlist-gate-event",
          title: "Waitlist Gate Event",
          start: "2026-08-02T10:00:00.000Z",
          end: "2026-08-02T11:00:00.000Z",
          timezone: "UTC",
          capacity: 1,
        }),
      }),
    );
    expect(createWaitlistEvent.status).toBe(201);

    const publishWaitlistEvent = await postPublishEvent(
      new Request("http://localhost:3000/api/v1/events/waitlist-gate-event/publish", {
        method: "POST",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "waitlist-gate-event" }) },
    );
    expect(publishWaitlistEvent.status).toBe(200);

    const userOneWaitlist = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/waitlist-gate-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: reloginUserOneCookie,
        },
        body: JSON.stringify({ user_id: userOneId }),
      }),
      { params: Promise.resolve({ slug: "waitlist-gate-event" }) },
    );
    expect((await userOneWaitlist.json()).status).toBe("REGISTERED");

    const userTwoWaitlist = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/waitlist-gate-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: userTwoCookie,
        },
        body: JSON.stringify({ user_id: userTwoId }),
      }),
      { params: Promise.resolve({ slug: "waitlist-gate-event" }) },
    );
    expect((await userTwoWaitlist.json()).status).toBe("WAITLISTED");

    const cancelUserOne = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/waitlist-gate-event/registrations/${userOneId}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: reloginUserOneCookie,
        },
      }),
      { params: Promise.resolve({ slug: "waitlist-gate-event", userId: userOneId }) },
    );
    expect((await cancelUserOne.json()).status).toBe("CANCELLED");

    expect(adminId).toBeTruthy();
  });

  it("keeps accessibility and problem-details request_id behavior consistent and blocks super admin UI mutation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Forbidden",
          status: 403,
          detail: "Denied",
          request_id: "req-ui-hardening-1",
        }),
        {
          status: 403,
          headers: {
            "content-type": "application/problem+json",
          },
        },
      ),
    );

    const failed = await requestHal<{ ok: true }>("/api/v1/denied");
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.problem.request_id).toBe("req-ui-hardening-1");
    }

    const loginSource = await readUiSource(
      "src/app/(public)/login/page.tsx",
      "src/app/login/page.tsx",
    );
    const registerSource = await readUiSource(
      "src/app/(public)/register/page.tsx",
      "src/app/register/page.tsx",
    );
    const adminUsersSource = await readUiSource(
      "src/app/(admin)/admin/users/page.tsx",
      "src/app/admin/users/page.tsx",
    );

    const hasAccessibleLabeling = (source: string) =>
      /htmlFor=/.test(source) || /<FormLabel\b/.test(source) || /<Label\b/.test(source);

    expect(hasAccessibleLabeling(loginSource)).toBe(true);
    expect(hasAccessibleLabeling(registerSource)).toBe(true);
    expect(adminUsersSource.includes("ProblemDetailsPanel")).toBe(true);
    expect(adminUsersSource.includes("Add SUPER_ADMIN")).toBe(false);
    expect(adminUsersSource.includes("Remove SUPER_ADMIN")).toBe(false);
  });

  it("enforces super-admin role mutation as API-forbidden", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("role-admin@example.com");
    const targetCookie = await registerAndLogin("role-target@example.com");

    addAdminRole(dbPath, "role-admin@example.com");
    const targetId = userIdByEmail(dbPath, "role-target@example.com");

    const blocked = await postAddRole(
      new Request(`http://localhost:3000/api/v1/users/${targetId}/roles`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({ role: "SUPER_ADMIN", confirm: true }),
      }),
      { params: Promise.resolve({ id: targetId }) },
    );

    expect(blocked.status).toBe(403);
    expect(targetCookie).toContain("lms_session=");
  });
});
