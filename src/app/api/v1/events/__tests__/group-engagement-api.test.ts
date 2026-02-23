import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postEvents } from "../route";
import { GET as getEvent } from "../[slug]/route";
import { POST as postRegistration } from "../[slug]/registrations/route";
import { DELETE as deleteRegistration } from "../[slug]/registrations/[userId]/route";
import { POST as postSubstitution } from "../[slug]/registrations/substitutions/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";
import { resetRateLimits } from "../../../../../lib/api/rate-limit";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-group-engagement-test-"));
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

const removeAdminRole = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
  db.prepare("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?").run(user.id, role.id);
  db.close();
};

const getUserId = (dbPath: string, email: string): string => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  db.close();
  return user.id;
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  resetRateLimits();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 group engagement organizer controls", () => {
  it("allows group organizer to manage roster and substitutions without admin role", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const organizerCookie = await registerAndLogin("group-organizer@example.com");
    await registerAndLogin("group-member-a@example.com");
    await registerAndLogin("group-member-b@example.com");

    addAdminRole(dbPath, "group-organizer@example.com");

    const create = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: organizerCookie,
        },
        body: JSON.stringify({
          slug: "group-journey",
          title: "Group Journey",
          start: "2026-07-01T10:00:00.000Z",
          end: "2026-07-01T11:00:00.000Z",
          timezone: "UTC",
          engagement_type: "GROUP",
          capacity: 5,
        }),
      }),
    );
    expect(create.status).toBe(201);

    removeAdminRole(dbPath, "group-organizer@example.com");

    const memberA = getUserId(dbPath, "group-member-a@example.com");
    const memberB = getUserId(dbPath, "group-member-b@example.com");

    const addA = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/group-journey/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: organizerCookie,
        },
        body: JSON.stringify({ user_id: memberA }),
      }),
      { params: Promise.resolve({ slug: "group-journey" }) },
    );
    expect(addA.status).toBe(200);

    const substitute = await postSubstitution(
      new Request("http://localhost:3000/api/v1/events/group-journey/registrations/substitutions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: organizerCookie,
        },
        body: JSON.stringify({ from_user_id: memberA, to_user_id: memberB }),
      }),
      { params: Promise.resolve({ slug: "group-journey" }) },
    );

    expect(substitute.status).toBe(200);
    const substitutionBody = await substitute.json();
    expect(substitutionBody.from_user_id).toBe(memberA);
    expect(substitutionBody.to_user_id).toBe(memberB);

    const removeB = await deleteRegistration(
      new Request(`http://localhost:3000/api/v1/events/group-journey/registrations/${memberB}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: organizerCookie,
        },
      }),
      { params: Promise.resolve({ slug: "group-journey", userId: memberB }) },
    );
    expect(removeB.status).toBe(200);

    const detail = await getEvent(
      new Request("http://localhost:3000/api/v1/events/group-journey", {
        headers: { cookie: organizerCookie },
      }),
      { params: Promise.resolve({ slug: "group-journey" }) },
    );
    expect(detail.status).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.engagement_type).toBe("GROUP");
    expect(detailBody._links["app:group-roster"]).toBeTruthy();
    expect(detailBody._links["app:group-substitute"]).toBeTruthy();
  });

  it("blocks non-organizer users from group roster management", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("group-admin@example.com");
    const outsiderCookie = await registerAndLogin("group-outsider@example.com");
    await registerAndLogin("group-target@example.com");
    await registerAndLogin("group-replacement@example.com");

    addAdminRole(dbPath, "group-admin@example.com");

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          slug: "group-guard",
          title: "Group Guard",
          start: "2026-07-02T10:00:00.000Z",
          end: "2026-07-02T11:00:00.000Z",
          timezone: "UTC",
          engagement_type: "GROUP",
          capacity: 5,
        }),
      }),
    );

    const target = getUserId(dbPath, "group-target@example.com");
    const replacement = getUserId(dbPath, "group-replacement@example.com");

    const addBlocked = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/group-guard/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: outsiderCookie,
        },
        body: JSON.stringify({ user_id: target }),
      }),
      { params: Promise.resolve({ slug: "group-guard" }) },
    );

    expect(addBlocked.status).toBe(403);

    const substituteBlocked = await postSubstitution(
      new Request("http://localhost:3000/api/v1/events/group-guard/registrations/substitutions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: outsiderCookie,
        },
        body: JSON.stringify({ from_user_id: target, to_user_id: replacement }),
      }),
      { params: Promise.resolve({ slug: "group-guard" }) },
    );

    expect(substituteBlocked.status).toBe(403);
  });

  it("keeps individual engagement self-service only for non-admin users", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("ind-admin@example.com");
    const userCookie = await registerAndLogin("ind-user@example.com");
    await registerAndLogin("ind-other@example.com");

    addAdminRole(dbPath, "ind-admin@example.com");

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          slug: "individual-guard",
          title: "Individual Guard",
          start: "2026-07-03T10:00:00.000Z",
          end: "2026-07-03T11:00:00.000Z",
          timezone: "UTC",
          engagement_type: "INDIVIDUAL",
          capacity: 2,
        }),
      }),
    );

    const other = getUserId(dbPath, "ind-other@example.com");

    const addOther = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/individual-guard/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: userCookie,
        },
        body: JSON.stringify({ user_id: other }),
      }),
      { params: Promise.resolve({ slug: "individual-guard" }) },
    );

    expect(addOther.status).toBe(403);
  });
});
