import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getEventBySlug, PATCH as patchEventInstructor } from "../[slug]/instructor/route";
import { GET as getEvent } from "../[slug]/route";
import { POST as postEvents } from "../route";
import { POST as postInstructors } from "../../instructors/route";
import { POST as postInstructorAvailability } from "../../instructors/[id]/availability/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-event-instructor-test-"));
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

const createOnlineEvent = async (adminCookie: string, slug: string) => {
  return postEvents(
    new Request("http://localhost:3000/api/v1/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie,
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        slug,
        title: `Event ${slug}`,
        start: "2026-03-15T10:00:00.000Z",
        end: "2026-03-15T11:00:00.000Z",
        timezone: "UTC",
        delivery_mode: "ONLINE",
        meeting_url: "https://meet.example.com/session",
      }),
    }),
  );
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 event instructor lifecycle", () => {
  it("shows TBA as default instructor assignment state", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "instructor-default-admin@example.com");
    await createOnlineEvent(adminCookie, "instructor-tba");

    const event = await getEvent(
      new Request("http://localhost:3000/api/v1/events/instructor-tba", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "instructor-tba" }) },
    );

    expect(event.status).toBe(200);
    const body = await event.json();
    expect(body.instructor_state).toBe("TBA");
    expect(body.instructor_name).toBeNull();
  });

  it("enforces lifecycle transitions and logs history for assignment/reassignment", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "instructor-flow-admin@example.com");
    await createOnlineEvent(adminCookie, "instructor-flow");

    const createInstructor = await postInstructors(
      new Request("http://localhost:3000/api/v1/instructors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Alex Coach",
          email: "alex.coach@example.com",
          status: "ACTIVE",
          capabilities: ["ONLINE"],
        }),
      }),
    );

    expect(createInstructor.status).toBe(201);
    const instructor = await createInstructor.json();

    const addAvailability = await postInstructorAvailability(
      new Request(`http://localhost:3000/api/v1/instructors/${instructor.id}/availability`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          start: "2026-03-15T09:00:00.000Z",
          end: "2026-03-15T12:00:00.000Z",
          timezone: "UTC",
          delivery_mode: "ONLINE",
        }),
      }),
      { params: Promise.resolve({ id: instructor.id }) },
    );

    expect(addAvailability.status).toBe(201);

    const proposed = await patchEventInstructor(
      new Request("http://localhost:3000/api/v1/events/instructor-flow/instructor", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ state: "PROPOSED", instructor_id: instructor.id }),
      }),
      { params: Promise.resolve({ slug: "instructor-flow" }) },
    );

    expect(proposed.status).toBe(200);

    const assigned = await patchEventInstructor(
      new Request("http://localhost:3000/api/v1/events/instructor-flow/instructor", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ state: "ASSIGNED", instructor_id: instructor.id }),
      }),
      { params: Promise.resolve({ slug: "instructor-flow" }) },
    );

    expect(assigned.status).toBe(200);

    const confirmed = await patchEventInstructor(
      new Request("http://localhost:3000/api/v1/events/instructor-flow/instructor", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ state: "CONFIRMED", instructor_id: instructor.id, note: "Confirmed with client" }),
      }),
      { params: Promise.resolve({ slug: "instructor-flow" }) },
    );

    expect(confirmed.status).toBe(200);

    const detail = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/instructor-flow/instructor", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "instructor-flow" }) },
    );

    expect(detail.status).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.state).toBe("CONFIRMED");
    expect(detailBody.instructor_name).toBe("Alex Coach");
    expect(Array.isArray(detailBody.history)).toBe(true);
    expect(detailBody.history.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects instructor assignment when capability/availability does not match event", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "instructor-mismatch-admin@example.com");
    await createOnlineEvent(adminCookie, "instructor-mismatch");

    const createInstructor = await postInstructors(
      new Request("http://localhost:3000/api/v1/instructors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Taylor InPerson",
          email: "taylor.inperson@example.com",
          status: "ACTIVE",
          capabilities: ["IN_PERSON"],
        }),
      }),
    );

    const instructor = await createInstructor.json();

    await postInstructorAvailability(
      new Request(`http://localhost:3000/api/v1/instructors/${instructor.id}/availability`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          start: "2026-03-15T09:00:00.000Z",
          end: "2026-03-15T12:00:00.000Z",
          timezone: "UTC",
          delivery_mode: "IN_PERSON",
        }),
      }),
      { params: Promise.resolve({ id: instructor.id }) },
    );

    const assignment = await patchEventInstructor(
      new Request("http://localhost:3000/api/v1/events/instructor-mismatch/instructor", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ state: "PROPOSED", instructor_id: instructor.id }),
      }),
      { params: Promise.resolve({ slug: "instructor-mismatch" }) },
    );

    expect(assignment.status).toBe(400);
  });
});
