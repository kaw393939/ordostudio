/**
 * Sprint 36 — e2e tests: Conversational Intake Agent
 *
 * 10 tests covering:
 *   - Migration / schema (tables present with correct columns)
 *   - POST /api/v1/agent/chat (OpenAI mocked — no real API calls)
 *   - GET  /api/v1/maestro/availability
 *   - POST /api/v1/bookings
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

// ---------------------------------------------------------------------------
// Route handlers (imported directly — no network required)
// ---------------------------------------------------------------------------
import { POST as postChat } from "../api/v1/agent/chat/route";
import { GET as getAvailability } from "../api/v1/maestro/availability/route";
import { POST as postBookings } from "../api/v1/bookings/route";
import { POST as postIntake } from "../api/v1/intake/route";

// ---------------------------------------------------------------------------
// Mock OpenAI so no real API calls happen in tests
// ---------------------------------------------------------------------------

vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: "Tell me more about your goals.",
          tool_calls: undefined,
        },
      },
    ],
  });

  class MockOpenAI {
    chat = { completions: { create: mockCreate } };
    constructor(_opts?: unknown) {}
  }

  return { default: MockOpenAI };
});

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
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDb() {
  return new Database(fixture.dbPath);
}

function seedSlot(adminUserId: string): string {
  const db = getDb();
  const id = randomUUID();
  const start = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3600000).toISOString();
  db.prepare(
    `INSERT INTO maestro_availability (id, maestro_user_id, start_at, end_at, status, created_at)
     VALUES (?, ?, ?, ?, 'OPEN', ?)`,
  ).run(id, adminUserId, start, end, new Date().toISOString());
  db.close();
  return id;
}

async function readSseStream(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("e2e intake agent (Sprint 36)", () => {
  it("Test 1: migration 037 creates intake_conversations table with correct columns", () => {
    const db = getDb();
    const cols = db
      .prepare(`PRAGMA table_info(intake_conversations)`)
      .all() as Array<{ name: string }>;
    db.close();

    const names = cols.map((c) => c.name);
    expect(names).toContain("id");
    expect(names).toContain("session_id");
    expect(names).toContain("messages");
    expect(names).toContain("status");
    expect(names).toContain("intake_request_id");
    expect(names).toContain("created_at");
    expect(names).toContain("updated_at");
  });

  it("Test 2: migration 037 creates maestro_availability table with correct columns", () => {
    const db = getDb();
    const cols = db
      .prepare(`PRAGMA table_info(maestro_availability)`)
      .all() as Array<{ name: string }>;
    db.close();

    const names = cols.map((c) => c.name);
    expect(names).toContain("id");
    expect(names).toContain("maestro_user_id");
    expect(names).toContain("start_at");
    expect(names).toContain("end_at");
    expect(names).toContain("status");
  });

  it("Test 3: migration 037 creates bookings table with correct columns", () => {
    const db = getDb();
    const cols = db
      .prepare(`PRAGMA table_info(bookings)`)
      .all() as Array<{ name: string }>;
    db.close();

    const names = cols.map((c) => c.name);
    expect(names).toContain("id");
    expect(names).toContain("intake_request_id");
    expect(names).toContain("maestro_availability_id");
    expect(names).toContain("prospect_email");
    expect(names).toContain("status");
  });

  it("Test 4: POST /api/v1/agent/chat returns 400 for missing session_id", async () => {
    const res = await postChat(
      new Request("http://localhost/api/v1/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/session_id/);
  });

  it("Test 5: POST /api/v1/agent/chat returns 400 for missing message", async () => {
    const res = await postChat(
      new Request("http://localhost/api/v1/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: "test-session" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/message/);
  });

  it("Test 6: POST /api/v1/agent/chat creates a conversation record and streams SSE response", async () => {
    const sessionId = randomUUID();

    const res = await postChat(
      new Request("http://localhost/api/v1/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: "I run a dev team and want to know about AI training",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);

    const text = await readSseStream(res);
    expect(text).toContain("data:");
    expect(text).toContain('"done":true');
    expect(text).toContain('"conversation_id"');

    // Verify conversation was persisted in DB
    const db = getDb();
    const conversations = db
      .prepare(`SELECT * FROM intake_conversations WHERE session_id = ?`)
      .all(sessionId) as Array<{ id: string; messages: string }>;
    db.close();

    expect(conversations.length).toBe(1);
    const msgs = JSON.parse(conversations[0].messages) as Array<{
      role: string;
      content: string;
    }>;
    // Opening message + user message + assistant response = ≥ 3
    expect(msgs.length).toBeGreaterThanOrEqual(3);
  });

  it("Test 7: POST /api/v1/agent/chat continues existing conversation by conversation_id", async () => {
    const sessionId = randomUUID();

    // First message — creates conversation
    const res1 = await postChat(
      new Request("http://localhost/api/v1/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: "What is maestro training?" }),
      }),
    );
    expect(res1.status).toBe(200);
    const text1 = await readSseStream(res1);

    // Extract conversation_id from SSE
    const doneMatch = text1.match(/"conversation_id":"([^"]+)"/);
    expect(doneMatch).not.toBeNull();
    const conversationId = doneMatch![1];

    // Second message — continues conversation
    const res2 = await postChat(
      new Request("http://localhost/api/v1/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: "How much does it cost?",
          conversation_id: conversationId,
        }),
      }),
    );
    expect(res2.status).toBe(200);
    await readSseStream(res2); // consume stream

    // Verify conversation has grown (opening + 2 user + 2 assistant = ≥ 5)
    const db = getDb();
    const conv = db
      .prepare(`SELECT messages FROM intake_conversations WHERE id = ?`)
      .get(conversationId) as { messages: string } | undefined;
    db.close();

    expect(conv).toBeDefined();
    const msgs = JSON.parse(conv!.messages) as unknown[];
    expect(msgs.length).toBeGreaterThanOrEqual(5);
  });

  it("Test 8: GET /api/v1/maestro/availability returns only OPEN slots", async () => {
    const db = getDb();
    const futureSoon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3600000).toISOString();
    const now = new Date().toISOString();

    const openId = randomUUID();
    const bookedId = randomUUID();

    db.prepare(
      `INSERT INTO maestro_availability (id, maestro_user_id, start_at, end_at, status, created_at)
       VALUES (?, ?, ?, ?, 'OPEN', ?)`,
    ).run(openId, fixture.adminId, futureSoon, futureEnd, now);

    db.prepare(
      `INSERT INTO maestro_availability (id, maestro_user_id, start_at, end_at, status, created_at)
       VALUES (?, ?, ?, ?, 'BOOKED', ?)`,
    ).run(bookedId, fixture.adminId, futureSoon, futureEnd, now);

    db.close();

    const res = await getAvailability(
      new Request("http://localhost/api/v1/maestro/availability"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slots: Array<{ id: string; status: string }> };

    const ids = body.slots.map((s) => s.id);
    expect(ids).toContain(openId);
    expect(ids).not.toContain(bookedId);
    for (const slot of body.slots) {
      expect(slot.status).toBe("OPEN");
    }
  });

  it("Test 9: POST /api/v1/bookings marks slot as BOOKED", async () => {
    const slotId = seedSlot(fixture.adminId);

    // Create intake first
    const intakeRes = await postIntake(
      new Request("http://localhost/api/v1/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Test Prospect",
          contact_email: "prospect@example.com",
          goals: "I want to improve my team's AI workflow capabilities.",
        }),
      }),
    );
    expect(intakeRes.status).toBe(201);
    const intakeBody = (await intakeRes.json()) as { id: string };
    const intakeId = intakeBody.id;

    const res = await postBookings(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot_id: slotId,
          email: "prospect@example.com",
          intake_request_id: intakeId,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("PENDING");

    // Verify slot is BOOKED
    const db = getDb();
    const slot = db
      .prepare(`SELECT status FROM maestro_availability WHERE id = ?`)
      .get(slotId) as { status: string };
    db.close();
    expect(slot.status).toBe("BOOKED");
  });

  it("Test 10: POST /api/v1/bookings returns 409 for already-BOOKED slot", async () => {
    const slotId = seedSlot(fixture.adminId);

    // Create intake
    const intakeRes = await postIntake(
      new Request("http://localhost/api/v1/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Test Prospect B",
          contact_email: "prospect2@example.com",
          goals: "AI training for my engineering team.",
        }),
      }),
    );
    expect(intakeRes.status).toBe(201);
    const intakeId = ((await intakeRes.json()) as { id: string }).id;

    // First booking succeeds
    const res1 = await postBookings(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot_id: slotId,
          email: "prospect2@example.com",
          intake_request_id: intakeId,
        }),
      }),
    );
    expect(res1.status).toBe(201);

    // Second booking returns 409
    const res2 = await postBookings(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot_id: slotId,
          email: "other@example.com",
          intake_request_id: intakeId,
        }),
      }),
    );
    expect(res2.status).toBe(409);
  });
});

