/**
 * R-14 correctness tests: SSE done frame fields
 *
 * Verifies that the done frame emitted by buildStreamingResponse includes
 * booking_confirmed and booking_id (DK-1 fix) and that the intake_submitted
 * field still works correctly.
 *
 * Tests the route POST handler end-to-end with mocked LLM loops so no
 * real API calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

// ---------------------------------------------------------------------------
// Mock the Claude streaming loop so we control capturedValues
// ---------------------------------------------------------------------------

const { mockRunClaudeStream } = vi.hoisted(() => ({
  mockRunClaudeStream: vi.fn(),
}));

vi.mock("@/lib/llm-anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm-anthropic")>();
  return {
    ...actual,
    runClaudeAgentLoopStream: mockRunClaudeStream,
  };
});

// Also mock OpenAI constructor so getOpenAIClient() doesn't fail if
// ANTHROPIC_API_KEY is not set and the OAI path is taken.
vi.mock("openai", () => {
  const mockStream = vi.fn().mockImplementation(() => {
    async function* chunks() {
      yield { choices: [{ delta: { content: "ok" } }] };
    }
    return {
      [Symbol.asyncIterator]: () => chunks()[Symbol.asyncIterator](),
      finalMessage: vi.fn().mockResolvedValue({
        choices: [{ finish_reason: "stop", message: { content: "ok", tool_calls: undefined } }],
      }),
    };
  });
  class MockOpenAI {
    chat = { completions: { stream: mockStream } };
    constructor(_opts?: unknown) {}
  }
  return { default: MockOpenAI };
});

// ---------------------------------------------------------------------------
// Route under test
// ---------------------------------------------------------------------------

import { POST as postChat } from "@/app/api/v1/agent/chat/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse all SSE events from a streaming Response into an array of objects. */
async function collectSSEFrames(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.slice("data: ".length)) as Record<string, unknown>);
}

function makePostRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/v1/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------

let fixture: StandardE2EFixture;

beforeEach(async () => {
  fixture = await setupStandardE2EFixture();
  process.env.APPCTL_ENV = "local";
  process.env.ANTHROPIC_API_KEY = "test-mock-key";
  mockRunClaudeStream.mockReset();
});

afterEach(async () => {
  await cleanupStandardE2EFixtures(fixture);
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
});

// ---------------------------------------------------------------------------
// Done frame tests
// ---------------------------------------------------------------------------

describe("SSE done frame — R-14 correctness", () => {
  it("includes booking_confirmed: false and booking_id: null when no booking occurred", async () => {
    mockRunClaudeStream.mockImplementation(
      async (opts: { callbacks: { onDelta: (t: string) => void } }) => {
        opts.callbacks.onDelta("All done!");
        return { toolEvents: [], capturedValues: {} };
      },
    );

    const response = await postChat(
      makePostRequest({ session_id: randomUUID(), message: "Hello" }) as never,
    );
    expect(response.status).toBe(200);

    const frames = await collectSSEFrames(response);
    const doneFrame = frames.find((f) => f.done === true);

    expect(doneFrame).toBeDefined();
    expect(doneFrame?.intake_submitted).toBe(false);
    expect(doneFrame?.booking_confirmed).toBe(false);
    expect(doneFrame?.booking_id).toBeNull();
  });

  it("includes booking_confirmed: true and booking_id when create_booking succeeded", async () => {
    const testBookingId = `booking-${randomUUID()}`;

    mockRunClaudeStream.mockImplementation(
      async (opts: { callbacks: { onDelta: (t: string) => void } }) => {
        opts.callbacks.onDelta("Your booking is confirmed!");
        return {
          toolEvents: [],
          capturedValues: { booking_id: testBookingId },
        };
      },
    );

    const response = await postChat(
      makePostRequest({ session_id: randomUUID(), message: "Book me a slot" }) as never,
    );
    expect(response.status).toBe(200);

    const frames = await collectSSEFrames(response);
    const doneFrame = frames.find((f) => f.done === true);

    expect(doneFrame).toBeDefined();
    expect(doneFrame?.booking_confirmed).toBe(true);
    expect(doneFrame?.booking_id).toBe(testBookingId);
  });

  it("includes intake_submitted: true when submit_intake returned an id", async () => {
    // Insert a real intake request so the FK constraint is satisfied
    const intakeId = randomUUID();
    const db = new Database(fixture.dbPath);
    db.prepare(
      `INSERT INTO intake_requests (id, audience, contact_name, contact_email, goals, status, priority, created_at, updated_at)
       VALUES (?, 'INDIVIDUAL', 'Test User', 'test@example.com', 'Testing', 'PENDING', 'medium', ?, ?)`,
    ).run(intakeId, new Date().toISOString(), new Date().toISOString());
    db.close();

    mockRunClaudeStream.mockImplementation(
      async (opts: { callbacks: { onDelta: (t: string) => void } }) => {
        opts.callbacks.onDelta("Intake submitted!");
        return {
          toolEvents: [],
          capturedValues: { intake_request_id: intakeId },
        };
      },
    );

    const response = await postChat(
      makePostRequest({ session_id: randomUUID(), message: "Submit my request" }) as never,
    );
    expect(response.status).toBe(200);

    const frames = await collectSSEFrames(response);
    const doneFrame = frames.find((f) => f.done === true);

    expect(doneFrame).toBeDefined();
    expect(doneFrame?.intake_submitted).toBe(true);
    expect(doneFrame?.booking_confirmed).toBe(false);
    expect(doneFrame?.booking_id).toBeNull();
  });

  it("includes both intake_submitted and booking_confirmed when both tools fired", async () => {
    // Insert a real intake request so the FK constraint is satisfied
    const intakeId = randomUUID();
    const bookingId = `booking-${randomUUID()}`;
    const db = new Database(fixture.dbPath);
    db.prepare(
      `INSERT INTO intake_requests (id, audience, contact_name, contact_email, goals, status, priority, created_at, updated_at)
       VALUES (?, 'INDIVIDUAL', 'Test User', 'test@example.com', 'Testing', 'PENDING', 'medium', ?, ?)`,
    ).run(intakeId, new Date().toISOString(), new Date().toISOString());
    db.close();

    mockRunClaudeStream.mockImplementation(
      async (opts: { callbacks: { onDelta: (t: string) => void } }) => {
        opts.callbacks.onDelta("All set!");
        return {
          toolEvents: [],
          capturedValues: { intake_request_id: intakeId, booking_id: bookingId },
        };
      },
    );

    const response = await postChat(
      makePostRequest({ session_id: randomUUID(), message: "Book and submit" }) as never,
    );
    expect(response.status).toBe(200);

    const frames = await collectSSEFrames(response);
    const doneFrame = frames.find((f) => f.done === true);

    expect(doneFrame).toBeDefined();
    expect(doneFrame?.intake_submitted).toBe(true);
    expect(doneFrame?.booking_confirmed).toBe(true);
    expect(doneFrame?.booking_id).toBe(bookingId);
  });
});
