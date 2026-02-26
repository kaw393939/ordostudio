/**
 * Sprint 37 — e2e tests: CRM Foundation
 *
 * 10 tests covering:
 *   - Migration 038 / schema (contacts table present)
 *   - POST /api/v1/intake creates a contacts record (upsert hook)
 *   - GET  /api/v1/crm/contacts (paginated list, staff-only)
 *   - GET  /api/v1/crm/contacts/:id (detail with intakes)
 *   - PATCH /api/v1/crm/contacts/:id (status update, invalid transition)
 *   - GET  /api/v1/crm/pipeline (bucket counts, non-staff 403)
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
import { GET as getCrmContacts } from "../api/v1/crm/contacts/route";
import { GET as getCrmContact, PATCH as patchCrmContact } from "../api/v1/crm/contacts/[id]/route";
import { GET as getCrmPipeline } from "../api/v1/crm/pipeline/route";
import { POST as postIntake } from "../api/v1/intake/route";

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

/** POST /api/v1/intake — same-origin helper */
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
        contact_name: name ?? "Test Person",
        audience: "INDIVIDUAL",
        goals: "Test goals",
      }),
    }),
  );
}

function adminRequest(path: string) {
  return new Request(`http://localhost:3000${path}`, {
    headers: {
      origin: "http://localhost:3000",
      cookie: fixture.adminCookie,
    },
  });
}

function userRequest(path: string) {
  return new Request(`http://localhost:3000${path}`, {
    headers: {
      origin: "http://localhost:3000",
      cookie: fixture.userCookie,
    },
  });
}

function noAuthRequest(path: string) {
  return new Request(`http://localhost:3000${path}`, {
    headers: { origin: "http://localhost:3000" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sprint 37 — CRM Foundation", () => {
  it("T1: contacts table exists with expected columns", () => {
    const db = getDb();
    const tableInfo = db
      .prepare("SELECT name FROM pragma_table_info('contacts') ORDER BY name")
      .all() as Array<{ name: string }>;
    db.close();

    const cols = tableInfo.map((r) => r.name);
    expect(cols).toContain("id");
    expect(cols).toContain("email");
    expect(cols).toContain("full_name");
    expect(cols).toContain("source");
    expect(cols).toContain("status");
    expect(cols).toContain("notes");
    expect(cols).toContain("assigned_to");
    expect(cols).toContain("created_at");
    expect(cols).toContain("updated_at");
  });

  it("T2: intake_requests has contact_id column", () => {
    const db = getDb();
    const tableInfo = db
      .prepare("SELECT name FROM pragma_table_info('intake_requests') ORDER BY name")
      .all() as Array<{ name: string }>;
    db.close();

    const cols = tableInfo.map((r) => r.name);
    expect(cols).toContain("contact_id");
  });

  it("T3: POST /api/v1/intake creates a contacts record (upsert hook)", async () => {
    const email = "crm-test-1@example.com";
    const res = await submitIntake(email, "CRM Test User");
    expect(res.status).toBe(201);

    // Give the non-blocking upsert a tick to settle
    await new Promise((r) => setTimeout(r, 50));

    const db = getDb();
    const contact = db
      .prepare("SELECT * FROM contacts WHERE email = ?")
      .get(email) as Record<string, unknown> | undefined;
    db.close();

    expect(contact).toBeDefined();
    expect(contact!.email).toBe(email);
    expect(contact!.full_name).toBe("CRM Test User");
    expect(contact!.source).toBe("FORM");
    expect(contact!.status).toBe("LEAD");
  });

  it("T4: duplicate POST /api/v1/intake email reuses same contact (upsert idempotent)", async () => {
    const email = "crm-dedup@example.com";
    await submitIntake(email, "First");
    await submitIntake(email, "Second");

    await new Promise((r) => setTimeout(r, 50));

    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM contacts WHERE email = ?")
      .all(email) as Array<Record<string, unknown>>;
    db.close();

    // Only one contacts row
    expect(rows.length).toBe(1);
    // full_name stays the first value (INSERT OR IGNORE)
    expect(rows[0].full_name).toBe("First");
  });

  it("T5: GET /api/v1/crm/contacts returns 401 without session", async () => {
    const res = await getCrmContacts(noAuthRequest("/api/v1/crm/contacts") as never);
    expect(res.status).toBe(401);
  });

  it("T6: GET /api/v1/crm/contacts returns 403 for non-staff user", async () => {
    const res = await getCrmContacts(userRequest("/api/v1/crm/contacts") as never);
    expect(res.status).toBe(403);
  });

  it("T7: GET /api/v1/crm/contacts returns paginated list for admin", async () => {
    // Seed two contacts
    await submitIntake("list-a@example.com");
    await submitIntake("list-b@example.com");
    await new Promise((r) => setTimeout(r, 50));

    const res = await getCrmContacts(adminRequest("/api/v1/crm/contacts?limit=25") as never);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      items: Array<{ email: string }>;
      total: number;
    };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
    const emails = body.items.map((i) => i.email);
    expect(emails).toContain("list-a@example.com");
    expect(emails).toContain("list-b@example.com");
  });

  it("T8: GET /api/v1/crm/contacts/:id returns contact detail for admin", async () => {
    await submitIntake("detail@example.com", "Detail Contact");
    await new Promise((r) => setTimeout(r, 50));

    const db = getDb();
    const contact = db
      .prepare("SELECT id FROM contacts WHERE email = ?")
      .get("detail@example.com") as { id: string };
    db.close();

    const res = await getCrmContact(
      adminRequest(`/api/v1/crm/contacts/${contact.id}`) as never,
      { params: Promise.resolve({ id: contact.id }) },
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      email: string;
      intakes: unknown[];
      bookings: unknown[];
    };
    expect(body.email).toBe("detail@example.com");
    expect(Array.isArray(body.intakes)).toBe(true);
    expect(Array.isArray(body.bookings)).toBe(true);
  });

  it("T9: PATCH /api/v1/crm/contacts/:id updates status via valid transition", async () => {
    await submitIntake("patch@example.com");
    await new Promise((r) => setTimeout(r, 50));

    const db = getDb();
    const contact = db
      .prepare("SELECT id FROM contacts WHERE email = ?")
      .get("patch@example.com") as { id: string };
    db.close();

    const res = await patchCrmContact(
      new Request(`http://localhost:3000/api/v1/crm/contacts/${contact.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ status: "QUALIFIED" }),
      }) as never,
      { params: Promise.resolve({ id: contact.id }) },
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("QUALIFIED");
  });

  it("T10: PATCH /api/v1/crm/contacts/:id returns 422 for invalid transition", async () => {
    await submitIntake("invalid-transition@example.com");
    await new Promise((r) => setTimeout(r, 50));

    const db = getDb();
    const contact = db
      .prepare("SELECT id FROM contacts WHERE email = ?")
      .get("invalid-transition@example.com") as { id: string };
    db.close();

    // LEAD → ACTIVE is not a valid transition
    const res = await patchCrmContact(
      new Request(`http://localhost:3000/api/v1/crm/contacts/${contact.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      }) as never,
      { params: Promise.resolve({ id: contact.id }) },
    );
    expect(res.status).toBe(422);
  });
});

describe("Sprint 37 — CRM Pipeline endpoint", () => {
  it("P1: GET /api/v1/crm/pipeline returns bucket counts for admin", async () => {
    await submitIntake("pipeline-1@example.com");
    await submitIntake("pipeline-2@example.com");
    await new Promise((r) => setTimeout(r, 50));

    const res = await getCrmPipeline(adminRequest("/api/v1/crm/pipeline") as never);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      buckets: Record<string, number>;
      total: number;
    };
    expect(typeof body.buckets.LEAD).toBe("number");
    expect(body.buckets.LEAD).toBeGreaterThanOrEqual(2);
    expect(body.buckets.QUALIFIED).toBe(0);
    expect(typeof body.total).toBe("number");
  });

  it("P2: GET /api/v1/crm/pipeline returns 403 for non-staff user", async () => {
    const res = await getCrmPipeline(userRequest("/api/v1/crm/pipeline") as never);
    expect(res.status).toBe(403);
  });
});
