import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getIntake, POST as postIntake } from "../route";
import { GET as getIntakeById, PATCH as patchIntakeById } from "../[id]/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-intake-test-"));
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

const registerAndLoginAdmin = async (dbPath: string, email: string): Promise<{ cookie: string; userId: string }> => {
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

  return {
    cookie: (login.headers.get("set-cookie") ?? "").split(";")[0],
    userId: user.id,
  };
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 intake", () => {
  it("applies adaptive validation by audience", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const orgMissingTimeline = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          audience: "ORGANIZATION",
          organization_name: "Acme",
          contact_name: "Alex",
          contact_email: "alex@acme.com",
          goals: "Upskill team",
          constraints: "Budget locked",
        }),
      }),
    );

    expect(orgMissingTimeline.status).toBe(422);

    const individualMissingGoals = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Sam",
          contact_email: "sam@example.com",
        }),
      }),
    );

    expect(individualMissingGoals.status).toBe(422);

    const validOrg = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          offer_slug: "team-bootcamp",
          audience: "ORGANIZATION",
          organization_name: "Acme",
          contact_name: "Alex",
          contact_email: "alex@acme.com",
          goals: "Upskill team",
          timeline: "Within 60 days",
          constraints: "Budget locked",
        }),
      }),
    );

    expect(validOrg.status).toBe(201);
    const validBody = await validOrg.json();
    expect(validBody.status).toBe("NEW");
    expect(validBody.next_step).toContain("triage");
  });

  it("supports queue filtering, assignment, and prioritization", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "One",
          contact_email: "one@example.com",
          goals: "Goal one",
        }),
      }),
    );

    const secondCreate = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          audience: "ORGANIZATION",
          organization_name: "Beta Co",
          contact_name: "Two",
          contact_email: "two@beta.co",
          goals: "Goal two",
          timeline: "Q2",
          constraints: "On-site only",
        }),
      }),
    );

    const secondBody = await secondCreate.json();
    const secondId = secondBody.id as string;

    const admin = await registerAndLoginAdmin(dbPath, "intake-admin@example.com");

    const update = await patchIntakeById(
      new Request(`http://localhost:3000/api/v1/intake/${secondId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: admin.cookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          status: "TRIAGED",
          owner_user_id: admin.userId,
          priority: 90,
          note: "Initial triage complete",
        }),
      }),
      { params: Promise.resolve({ id: secondId }) },
    );

    expect(update.status).toBe(200);

    const filteredByStatus = await getIntake(
      new Request("http://localhost:3000/api/v1/intake?status=TRIAGED", {
        headers: { cookie: admin.cookie },
      }),
    );
    expect(filteredByStatus.status).toBe(200);
    const statusBody = await filteredByStatus.json();
    expect(statusBody.items).toHaveLength(1);
    expect(statusBody.items[0].id).toBe(secondId);

    const filteredByOwner = await getIntake(
      new Request(`http://localhost:3000/api/v1/intake?owner_user_id=${admin.userId}`, {
        headers: { cookie: admin.cookie },
      }),
    );
    const ownerBody = await filteredByOwner.json();
    expect(ownerBody.items).toHaveLength(1);
    expect(ownerBody.items[0].owner_user_id).toBe(admin.userId);
  });

  it("tracks status history across transitions", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const create = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Jordan",
          contact_email: "jordan@example.com",
          goals: "Build delivery plan",
        }),
      }),
    );

    const createdBody = await create.json();
    const id = createdBody.id as string;

    const admin = await registerAndLoginAdmin(dbPath, "history-admin@example.com");

    await patchIntakeById(
      new Request(`http://localhost:3000/api/v1/intake/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: admin.cookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "TRIAGED", note: "Needs clarification" }),
      }),
      { params: Promise.resolve({ id }) },
    );

    await patchIntakeById(
      new Request(`http://localhost:3000/api/v1/intake/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: admin.cookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "QUALIFIED", note: "Fit confirmed" }),
      }),
      { params: Promise.resolve({ id }) },
    );

    const detail = await getIntakeById(
      new Request(`http://localhost:3000/api/v1/intake/${id}`, {
        headers: { cookie: admin.cookie },
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(detail.status).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.history).toHaveLength(3);
    expect(detailBody.history[0].to_status).toBe("NEW");
    expect(detailBody.history[1].to_status).toBe("TRIAGED");
    expect(detailBody.history[2].to_status).toBe("QUALIFIED");
  });
});
