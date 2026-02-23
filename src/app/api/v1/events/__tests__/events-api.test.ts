import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getEvents, POST as postEvents } from "../route";
import { GET as getEventBySlug, PATCH as patchEventBySlug } from "../[slug]/route";
import { POST as postEventRegistration } from "../[slug]/registrations/route";
import { POST as postPublishEvent } from "../[slug]/publish/route";
import { POST as postCancelEvent } from "../[slug]/cancel/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-events-test-"));
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

describe("api/v1 events", () => {
  it("creates and updates event with admin session", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "event-admin@example.com");

    const create = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "spring-demo",
          title: "Spring Demo",
          start: "2026-03-10T10:00:00.000Z",
          end: "2026-03-10T11:00:00.000Z",
          timezone: "UTC",
          capacity: 10,
        }),
      }),
    );

    expect(create.status).toBe(201);
    const createdBody = await create.json();
    expect(createdBody.slug).toBe("spring-demo");
    expect(createdBody.status).toBe("DRAFT");
    expect(createdBody._links["app:publish"]).toBeTruthy();

    const update = await patchEventBySlug(
      new Request("http://localhost:3000/api/v1/events/spring-demo", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ title: "Spring Demo Updated", capacity: 20 }),
      }),
      { params: Promise.resolve({ slug: "spring-demo" }) },
    );

    expect(update.status).toBe(200);
    const updatedBody = await update.json();
    expect(updatedBody.title).toBe("Spring Demo Updated");
    expect(updatedBody.capacity).toBe(20);
  });

  it("enforces state-based publish/cancel HATEOAS links", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "state-admin@example.com");

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "stateful",
          title: "Stateful Event",
          start: "2026-03-11T10:00:00.000Z",
          end: "2026-03-11T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );

    const draftView = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/stateful", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "stateful" }) },
    );
    const draftBody = await draftView.json();
    expect(draftBody._links["app:publish"]).toBeTruthy();
    expect(draftBody._links["app:cancel"]).toBeFalsy();

    const publish = await postPublishEvent(
      new Request("http://localhost:3000/api/v1/events/stateful/publish", {
        method: "POST",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "stateful" }) },
    );
    expect(publish.status).toBe(200);

    const publishedView = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/stateful", {
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ slug: "stateful" }) },
    );
    const publishedBody = await publishedView.json();
    expect(publishedBody.status).toBe("PUBLISHED");
    expect(publishedBody._links["app:publish"]).toBeFalsy();
    expect(publishedBody._links["app:cancel"]).toBeTruthy();

    const cancel = await postCancelEvent(
      new Request("http://localhost:3000/api/v1/events/stateful/cancel", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ reason: "Weather risk" }),
      }),
      { params: Promise.resolve({ slug: "stateful" }) },
    );

    expect(cancel.status).toBe(200);
    const cancelledBody = await cancel.json();
    expect(cancelledBody.status).toBe("CANCELLED");
    expect(cancelledBody._links["app:publish"]).toBeFalsy();
    expect(cancelledBody._links["app:cancel"]).toBeFalsy();
  });

  it("supports list filters and paging metadata", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "list-admin@example.com");

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "list-a",
          title: "List A",
          start: "2026-03-12T10:00:00.000Z",
          end: "2026-03-12T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "list-b",
          title: "List B",
          start: "2026-03-13T10:00:00.000Z",
          end: "2026-03-13T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );

    await postPublishEvent(
      new Request("http://localhost:3000/api/v1/events/list-b/publish", {
        method: "POST",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "list-b" }) },
    );

    const list = await getEvents(new Request("http://localhost:3000/api/v1/events?status=PUBLISHED&limit=1&offset=0"));
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(0);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].status).toBe("PUBLISHED");
  });

  it("exposes register affordance until capacity is full, then exposes waitlist affordance", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "event-admin@example.com");

    await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "capacity-demo",
          title: "Capacity Demo",
          start: "2026-03-12T10:00:00.000Z",
          end: "2026-03-12T11:00:00.000Z",
          timezone: "UTC",
          capacity: 1,
        }),
      }),
    );

    await postPublishEvent(
      new Request("http://localhost:3000/api/v1/events/capacity-demo/publish", {
        method: "POST",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "capacity-demo" }) },
    );

    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "capacity-user@example.com", password: "Password123!" }),
      }),
    );

    const attendeeLogin = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "capacity-user@example.com", password: "Password123!" }),
      }),
    );
    const attendeeCookie = (attendeeLogin.headers.get("set-cookie") ?? "").split(";")[0];

    const beforeFull = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/capacity-demo", {
        headers: { cookie: attendeeCookie },
      }),
      { params: Promise.resolve({ slug: "capacity-demo" }) },
    );
    const beforeFullBody = await beforeFull.json();
    expect(beforeFullBody._links["app:register"]).toBeTruthy();
    expect(beforeFullBody._links["app:join-waitlist"]).toBeFalsy();

    const register = await postEventRegistration(
      new Request("http://localhost:3000/api/v1/events/capacity-demo/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: attendeeCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ slug: "capacity-demo" }) },
    );
    expect(register.status).toBe(200);

    const fullView = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/capacity-demo", {
        headers: { cookie: attendeeCookie },
      }),
      { params: Promise.resolve({ slug: "capacity-demo" }) },
    );
    const fullBody = await fullView.json();
    expect(fullBody._links["app:register"]).toBeFalsy();
    expect(fullBody._links["app:join-waitlist"]).toBeTruthy();
  });
});
