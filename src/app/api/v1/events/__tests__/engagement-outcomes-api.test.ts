import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postRegister } from "../../auth/register/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postEvents } from "../route";
import { POST as postPublish } from "../[slug]/publish/route";
import { POST as postRegistration } from "../[slug]/registrations/route";
import { POST as postOutcome } from "../[slug]/outcomes/route";
import { POST as postArtifact } from "../[slug]/artifacts/route";
import { POST as postGenerateReminders } from "../[slug]/follow-up/reminders/route";
import { GET as getEngagementArtifacts } from "../../account/engagements/[slug]/artifacts/route";
import { GET as getFollowUp } from "../../account/engagements/[slug]/follow-up/route";
import { PATCH as patchFollowUpAction } from "../../account/engagements/[slug]/actions/[actionId]/route";
import { PATCH as patchReminder } from "../../account/engagements/[slug]/reminders/[id]/route";
import { POST as postEngagementFeedback } from "../../account/engagements/[slug]/feedback/route";
import { GET as getFeedbackReport } from "../../admin/engagement-feedback/route";
import { GET as getFollowUpReport } from "../../admin/engagement-followup/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";
import { resetRateLimits } from "../../../../../lib/api/rate-limit";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-engagement-outcomes-test-"));
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

const getUserId = (dbPath: string, email: string): string => {
  const db = new Database(dbPath);
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  db.close();
  return row.id;
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  resetRateLimits();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 engagement outcomes and artifacts", () => {
  it("enforces outcome invariants and admin-only write endpoints", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("engagement-admin@example.com");
    addAdminRole(dbPath, "engagement-admin@example.com");

    const memberCookie = await registerAndLogin("engagement-member@example.com");

    const eventCreate = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "engagement-event",
          title: "Engagement Event",
          start: "2026-11-01T10:00:00.000Z",
          end: "2026-11-01T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );
    expect(eventCreate.status).toBe(201);

    const publish = await postPublish(
      new Request("http://localhost:3000/api/v1/events/engagement-event/publish", {
        method: "POST",
        headers: { cookie: adminCookie, origin: "http://localhost:3000" },
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    );
    expect(publish.status).toBe(200);

    const invalid = (await postOutcome(
      new Request("http://localhost:3000/api/v1/events/engagement-event/outcomes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          title: "Session 1",
          session_at: "2026-11-01T11:00:00.000Z",
          outcomes: [],
          action_items: [],
          next_step: "",
        }),
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    ))!;
    expect(invalid.status).toBe(400);

    const denied = (await postOutcome(
      new Request("http://localhost:3000/api/v1/events/engagement-event/outcomes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: memberCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          title: "Session 1",
          session_at: "2026-11-01T11:00:00.000Z",
          outcomes: ["Alignment on objectives"],
        }),
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    ))!;
    expect(denied.status).toBe(403);

    const created = (await postOutcome(
      new Request("http://localhost:3000/api/v1/events/engagement-event/outcomes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          title: "Session 1",
          session_at: "2026-11-01T11:00:00.000Z",
          outcomes: ["Alignment on objectives"],
          action_items: [{ description: "Draft implementation brief", due_at: "2026-01-05T00:00:00.000Z" }],
          next_step: "Share recap with sponsor",
        }),
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    ))!;

    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.outcomes).toEqual(["Alignment on objectives"]);
    expect(createdBody.action_items).toHaveLength(1);
    expect(createdBody.next_step).toBe("Share recap with sponsor");

    const memberId = getUserId(dbPath, "engagement-member@example.com");
    const register = await postRegistration(
      new Request("http://localhost:3000/api/v1/events/engagement-event/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: memberCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ user_id: memberId }),
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    );
    expect(register.status).toBe(200);

    const artifact = (await postArtifact(
      new Request("http://localhost:3000/api/v1/events/engagement-event/artifacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          title: "Session recap",
          resource_url: "https://example.com/recap.pdf",
          scope: "EVENT",
        }),
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    ))!;
    expect(artifact.status).toBe(201);

    const privateArtifact = (await postArtifact(
      new Request("http://localhost:3000/api/v1/events/engagement-event/artifacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          title: "Private scorecard",
          resource_url: "https://example.com/private.pdf",
          scope: "USER",
          user_id: memberId,
        }),
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    ))!;
    expect(privateArtifact.status).toBe(201);

    const artifactsForMember = await getEngagementArtifacts(
      new Request("http://localhost:3000/api/v1/account/engagements/engagement-event/artifacts", {
        headers: { cookie: memberCookie },
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    );
    expect(artifactsForMember.status).toBe(200);
    const artifactsBody = await artifactsForMember.json();
    expect(artifactsBody.count).toBe(2);

    const initialFollowUp = await getFollowUp(
      new Request("http://localhost:3000/api/v1/account/engagements/engagement-event/follow-up", {
        headers: { cookie: memberCookie },
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    );
    expect(initialFollowUp.status).toBe(200);
    const followUpBody = await initialFollowUp.json();
    expect(followUpBody.actions_count).toBeGreaterThan(0);
    const actionId = followUpBody.actions[0].id as string;

    const inProgress = await patchFollowUpAction(
      new Request(`http://localhost:3000/api/v1/account/engagements/engagement-event/actions/${actionId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: memberCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
      { params: Promise.resolve({ slug: "engagement-event", actionId }) },
    );
    expect(inProgress.status).toBe(200);

    const generatedReminders = (await postGenerateReminders(
      new Request("http://localhost:3000/api/v1/events/engagement-event/follow-up/reminders", {
        method: "POST",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    ))!;
    expect(generatedReminders.status).toBe(200);
    const reminderBody = await generatedReminders.json();
    expect(reminderBody.generated).toBeGreaterThan(0);

    const afterReminder = await getFollowUp(
      new Request("http://localhost:3000/api/v1/account/engagements/engagement-event/follow-up", {
        headers: { cookie: memberCookie },
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    );
    expect(afterReminder.status).toBe(200);
    const afterReminderBody = await afterReminder.json();
    expect(afterReminderBody.reminders_count).toBeGreaterThan(0);
    const reminderId = afterReminderBody.reminders[0].id as string;

    const ackReminder = await patchReminder(
      new Request(`http://localhost:3000/api/v1/account/engagements/engagement-event/reminders/${reminderId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: memberCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ acknowledged: true }),
      }),
      { params: Promise.resolve({ slug: "engagement-event", id: reminderId }) },
    );
    expect(ackReminder.status).toBe(200);

    const followUpReport = (await getFollowUpReport(
      new Request("http://localhost:3000/api/v1/admin/engagement-followup", {
        headers: { cookie: adminCookie },
      }),
    ))!;
    expect(followUpReport.status).toBe(200);
    const followUpReportBody = await followUpReport.json();
    expect(followUpReportBody.actions_total).toBeGreaterThan(0);

    const feedback = await postEngagementFeedback(
      new Request("http://localhost:3000/api/v1/account/engagements/engagement-event/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: memberCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ rating: 4, comment: "Useful and clear" }),
      }),
      { params: Promise.resolve({ slug: "engagement-event" }) },
    );
    expect(feedback.status).toBe(200);

    const report = (await getFeedbackReport(
      new Request("http://localhost:3000/api/v1/admin/engagement-feedback", {
        headers: { cookie: adminCookie },
      }),
    ))!;
    expect(report.status).toBe(200);
    const reportBody = await report.json();
    expect(reportBody.count).toBe(1);
    expect(reportBody.average_rating).toBe(4);
  });
});
