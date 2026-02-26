/**
 * Sprint 38 — e2e tests: Onboarding Workflow
 *
 * 10 tests covering:
 *   - Migration 039 / schema (onboarding_tasks + onboarding_progress tables)
 *   - POST /api/v1/crm/contacts/:id/provision (400/201/409)
 *   - GET  /api/v1/onboarding (401, task list)
 *   - POST /api/v1/onboarding/complete/:slug (mark done, 404 for unknown)
 *   - Completing all required tasks advances contact to ACTIVE
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

// ---------------------------------------------------------------------------
// Route handlers (direct invocation — no network required)
// ---------------------------------------------------------------------------
import { POST as postProvision } from "../api/v1/crm/contacts/[id]/provision/route";
import { GET as getOnboarding } from "../api/v1/onboarding/route";
import { POST as postComplete } from "../api/v1/onboarding/complete/[slug]/route";
import { POST as postIntake } from "../api/v1/intake/route";
import { POST as postLogin } from "../api/v1/auth/login/route";

// ---------------------------------------------------------------------------
// library — used so tests can obtain the tempPassword for login
// ---------------------------------------------------------------------------
import { provisionAccount } from "../../lib/api/provisioning";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

let fixture: StandardE2EFixture;

beforeEach(async () => {
  fixture = await setupStandardE2EFixture();
  process.env.APPCTL_ENV = "local";
});

afterEach(async () => {
  await cleanupStandardE2EFixtures();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDb() {
  return new Database(fixture.dbPath);
}

/** POST /api/v1/intake — creates a LEAD contact */
async function submitIntake(email: string, name?: string) {
  return postIntake(
    new Request("http://localhost:3000/api/v1/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        contact_email: email,
        contact_name: name ?? "Prospective Client",
        audience: "INDIVIDUAL",
        goals: "Learn something useful",
      }),
    }),
  );
}

/** Patch a contact to QUALIFIED directly in the DB */
function qualifyContact(email: string): string {
  const db = getDb();
  const contact = db
    .prepare("SELECT id FROM contacts WHERE email = ?")
    .get(email) as { id: string } | undefined;
  if (!contact) throw new Error(`Contact not found for ${email}`);
  db.prepare("UPDATE contacts SET status = 'QUALIFIED' WHERE id = ?").run(contact.id);
  db.close();
  return contact.id;
}

function adminRequest(path: string, method = "POST") {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      origin: "http://localhost:3000",
      cookie: fixture.adminCookie,
    },
  });
}

function noAuthRequest(path: string, method = "GET") {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { origin: "http://localhost:3000" },
  });
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await postLogin(
    new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password }),
    }),
  );
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

/**
 * Creates a QUALIFIED contact via intake + direct DB update,
 * then calls provisionAccount() directly to get the tempPassword,
 * then logs the provisioned user in and returns their session cookie.
 */
async function createProvisionedUser(email: string): Promise<{
  contactId: string;
  userId: string;
  cookie: string;
}> {
  await submitIntake(email);
  const contactId = qualifyContact(email);

  const db = getDb();
  let result: Awaited<ReturnType<typeof provisionAccount>>;
  try {
    result = await provisionAccount(db, contactId);
  } finally {
    db.close();
  }

  const cookie = await loginAs(email, result.tempPassword);
  return { contactId, userId: result.userId, cookie };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sprint 38 — Onboarding Workflow", () => {
  // -----------------------------------------------------------------------
  // Schema tests
  // -----------------------------------------------------------------------

  it("T1: onboarding_tasks table exists with correct seed slugs", () => {
    const db = getDb();

    const tableInfo = db
      .prepare("SELECT name FROM pragma_table_info('onboarding_tasks') ORDER BY name")
      .all() as Array<{ name: string }>;
    const cols = tableInfo.map((r) => r.name);
    expect(cols).toContain("id");
    expect(cols).toContain("slug");
    expect(cols).toContain("title");
    expect(cols).toContain("role");
    expect(cols).toContain("position");
    expect(cols).toContain("required");

    const slugs = (
      db.prepare("SELECT slug FROM onboarding_tasks ORDER BY position ASC").all() as Array<{
        slug: string;
      }>
    ).map((r) => r.slug);

    expect(slugs).toContain("profile.complete");
    expect(slugs).toContain("affiliate.stripe-setup");
    expect(slugs).toContain("apprentice.intro-call");
    expect(slugs).toContain("apprentice.skills-survey");

    db.close();
  });

  it("T2: onboarding_progress table exists with correct columns", () => {
    const db = getDb();

    const tableInfo = db
      .prepare("SELECT name FROM pragma_table_info('onboarding_progress') ORDER BY name")
      .all() as Array<{ name: string }>;
    const cols = tableInfo.map((r) => r.name);
    expect(cols).toContain("id");
    expect(cols).toContain("user_id");
    expect(cols).toContain("task_id");
    expect(cols).toContain("completed");
    expect(cols).toContain("completed_at");

    db.close();
  });

  // -----------------------------------------------------------------------
  // Provision route
  // -----------------------------------------------------------------------

  it("T3: POST /provision returns 400 if contact is still LEAD (not QUALIFIED)", async () => {
    await submitIntake("leadonly@example.com");

    const db = getDb();
    const contact = db
      .prepare("SELECT id FROM contacts WHERE email = ?")
      .get("leadonly@example.com") as { id: string };
    db.close();

    expect(contact).toBeDefined();

    const res = await postProvision(
      adminRequest(`/api/v1/crm/contacts/${contact.id}/provision`) as Parameters<
        typeof postProvision
      >[0],
      { params: Promise.resolve({ id: contact.id }) },
    );

    expect(res.status).toBe(400);
  });

  it("T4: POST /provision creates user account and progress rows for QUALIFIED contact (201)", async () => {
    await submitIntake("qualified@example.com");
    const contactId = qualifyContact("qualified@example.com");

    const res = await postProvision(
      adminRequest(`/api/v1/crm/contacts/${contactId}/provision`) as Parameters<
        typeof postProvision
      >[0],
      { params: Promise.resolve({ id: contactId }) },
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { user_id: string; email: string; already_existed: boolean };
    expect(body.email).toBe("qualified@example.com");
    expect(body.already_existed).toBe(false);
    expect(body.user_id).toBeTruthy();

    // Verify onboarding_progress rows were created
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM onboarding_progress WHERE user_id = ?")
      .all(body.user_id);
    db.close();

    expect(rows.length).toBeGreaterThan(0);
  });

  it("T5: POST /provision is idempotent — second call returns 409", async () => {
    await submitIntake("idempotent@example.com");
    const contactId = qualifyContact("idempotent@example.com");

    const first = await postProvision(
      adminRequest(`/api/v1/crm/contacts/${contactId}/provision`) as Parameters<
        typeof postProvision
      >[0],
      { params: Promise.resolve({ id: contactId }) },
    );
    expect(first.status).toBe(201);

    const second = await postProvision(
      adminRequest(`/api/v1/crm/contacts/${contactId}/provision`) as Parameters<
        typeof postProvision
      >[0],
      { params: Promise.resolve({ id: contactId }) },
    );
    expect(second.status).toBe(409);
    const body = (await second.json()) as { already_existed: boolean };
    expect(body.already_existed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Onboarding task routes
  // -----------------------------------------------------------------------

  it("T6: GET /onboarding returns 401 without session", async () => {
    const res = await getOnboarding(
      noAuthRequest("/api/v1/onboarding") as Parameters<typeof getOnboarding>[0],
    );
    expect(res.status).toBe(401);
  });

  it("T7: GET /onboarding returns task list for a provisioned user", async () => {
    const { cookie } = await createProvisionedUser("tasks@example.com");

    const res = await getOnboarding(
      new Request("http://localhost:3000/api/v1/onboarding", {
        headers: { origin: "http://localhost:3000", cookie },
      }) as Parameters<typeof getOnboarding>[0],
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tasks: Array<{ slug: string; completed: boolean; required: boolean }>;
      all_required_complete: boolean;
    };
    expect(body.tasks.length).toBeGreaterThan(0);
    expect(body.all_required_complete).toBe(false);

    const slugs = body.tasks.map((t) => t.slug);
    expect(slugs).toContain("profile.complete");
  });

  it("T8: POST /onboarding/complete/:slug marks a task done", async () => {
    const { cookie } = await createProvisionedUser("completer@example.com");

    const res = await postComplete(
      new Request("http://localhost:3000/api/v1/onboarding/complete/profile.complete", {
        method: "POST",
        headers: { origin: "http://localhost:3000", cookie },
      }) as Parameters<typeof postComplete>[0],
      { params: Promise.resolve({ slug: "profile.complete" }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug: string; completed: boolean; already_done: boolean };
    expect(body.slug).toBe("profile.complete");
    expect(body.completed).toBe(true);
    expect(body.already_done).toBe(false);
  });

  it("T9: completing all required tasks advances contact to ACTIVE", async () => {
    const { contactId, userId, cookie } = await createProvisionedUser("finisher@example.com");

    // Get the assigned required tasks from the DB
    const db = getDb();
    const tasks = db
      .prepare(
        `SELECT ot.slug
         FROM onboarding_tasks ot
         JOIN onboarding_progress op ON op.task_id = ot.id
         WHERE op.user_id = ? AND ot.required = 1`,
      )
      .all(userId) as Array<{ slug: string }>;
    db.close();

    expect(tasks.length).toBeGreaterThan(0);

    // Complete all required tasks sequentially
    for (const task of tasks) {
      const res = await postComplete(
        new Request(`http://localhost:3000/api/v1/onboarding/complete/${task.slug}`, {
          method: "POST",
          headers: { origin: "http://localhost:3000", cookie },
        }) as Parameters<typeof postComplete>[0],
        { params: Promise.resolve({ slug: task.slug }) },
      );
      expect(res.status).toBe(200);
    }

    // Contact should now be ACTIVE
    const db2 = getDb();
    const contact = db2
      .prepare("SELECT status FROM contacts WHERE id = ?")
      .get(contactId) as { status: string };
    db2.close();

    expect(contact.status).toBe("ACTIVE");
  });

  it("T10: POST /onboarding/complete/:slug returns 404 for unknown task slug", async () => {
    const { cookie } = await createProvisionedUser("unknown@example.com");

    const res = await postComplete(
      new Request("http://localhost:3000/api/v1/onboarding/complete/totally.fake-slug", {
        method: "POST",
        headers: { origin: "http://localhost:3000", cookie },
      }) as Parameters<typeof postComplete>[0],
      { params: Promise.resolve({ slug: "totally.fake-slug" }) },
    );

    expect(res.status).toBe(404);
  });
});
