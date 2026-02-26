/**
 * Tests for R-09: ToolRegistry with Zod validation in agent-tools.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeAgentTool, AGENT_TOOL_DEFINITIONS } from "../agent-tools";

// ---------------------------------------------------------------------------
// Mock heavy dependencies
// ---------------------------------------------------------------------------

vi.mock("@/lib/api/content-search", () => ({
  searchContent: vi.fn().mockResolvedValue([
    { file: "kb/maestro.md", heading: "Maestro Training", excerpt: "Deep guild work." },
  ]),
}));

vi.mock("@/lib/api/site-settings", () => ({
  getSiteSettingStandalone: vi.fn().mockImplementation((key: string) => {
    const map: Record<string, string> = {
      "contact.email": "hello@studio-ordo.com",
    };
    return map[key] ?? null;
  }),
}));

vi.mock("@/lib/api/intake", () => ({
  createIntakeRequest: vi.fn().mockReturnValue({
    id: "intake-123",
    status: "PENDING",
    next_step: "review",
  }),
}));

// ---------------------------------------------------------------------------
// AGENT_TOOL_DEFINITIONS derived from registry
// ---------------------------------------------------------------------------

describe("AGENT_TOOL_DEFINITIONS", () => {
  it("contains exactly 5 tools", () => {
    expect(AGENT_TOOL_DEFINITIONS).toHaveLength(5);
  });

  it("includes all expected tool names", () => {
    const names = AGENT_TOOL_DEFINITIONS.map((d) => d.function.name);
    expect(names).toContain("content_search");
    expect(names).toContain("get_site_setting");
    expect(names).toContain("submit_intake");
    expect(names).toContain("get_available_slots");
    expect(names).toContain("create_booking");
  });

  it("every definition has type 'function'", () => {
    for (const def of AGENT_TOOL_DEFINITIONS) {
      expect(def.type).toBe("function");
    }
  });
});

// ---------------------------------------------------------------------------
// Unknown tool
// ---------------------------------------------------------------------------

describe("executeAgentTool — unknown tool", () => {
  it("returns an error object for an unknown tool name", async () => {
    const result = await executeAgentTool("fly_to_moon", {});
    expect(result).toMatchObject({ error: expect.stringContaining("fly_to_moon") });
  });
});

// ---------------------------------------------------------------------------
// content_search
// ---------------------------------------------------------------------------

describe("executeAgentTool — content_search", () => {
  it("returns mapped results for valid args", async () => {
    const result = await executeAgentTool("content_search", { query: "maestro training" });
    expect(Array.isArray(result)).toBe(true);
    const first = (result as Array<Record<string, unknown>>)[0];
    expect(first).toHaveProperty("file");
    expect(first).toHaveProperty("heading");
    expect(first).toHaveProperty("excerpt");
  });

  it("returns Zod error when query is missing", async () => {
    const result = await executeAgentTool("content_search", {});
    expect(result).toMatchObject({ error: expect.stringContaining("query") });
  });

  it("returns Zod error when query is empty string", async () => {
    const result = await executeAgentTool("content_search", { query: "" });
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("returns Zod error when query is wrong type", async () => {
    const result = await executeAgentTool("content_search", { query: 42 });
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// get_site_setting
// ---------------------------------------------------------------------------

describe("executeAgentTool — get_site_setting", () => {
  it("returns the value for a known key", async () => {
    const result = await executeAgentTool("get_site_setting", { key: "contact.email" });
    expect(result).toMatchObject({ key: "contact.email", value: "hello@studio-ordo.com" });
  });

  it("returns null + error for an unknown key", async () => {
    const result = await executeAgentTool("get_site_setting", { key: "nonexistent.key" });
    expect(result).toMatchObject({ key: "nonexistent.key", value: null, error: "key not found" });
  });

  it("returns Zod error when key is missing", async () => {
    const result = await executeAgentTool("get_site_setting", {});
    expect(result).toMatchObject({ error: expect.stringContaining("key") });
  });
});

// ---------------------------------------------------------------------------
// submit_intake
// ---------------------------------------------------------------------------

describe("executeAgentTool — submit_intake", () => {
  it("returns intake_request_id for valid individual args", async () => {
    const result = await executeAgentTool("submit_intake", {
      contact_name: "Jane Doe",
      contact_email: "jane@example.com",
      audience: "INDIVIDUAL",
      goals: "Build a guild of 10 apprentices.",
    });
    expect(result).toMatchObject({
      intake_request_id: "intake-123",
      status: "PENDING",
    });
  });

  it("returns Zod error when email is invalid", async () => {
    const result = await executeAgentTool("submit_intake", {
      contact_name: "Jane",
      contact_email: "not-an-email",
      audience: "INDIVIDUAL",
      goals: "Something.",
    });
    expect(result).toMatchObject({ error: expect.stringContaining("email") });
  });

  it("returns Zod error when audience is invalid enum value", async () => {
    const result = await executeAgentTool("submit_intake", {
      contact_name: "Jane",
      contact_email: "jane@example.com",
      audience: "UNKNOWN",
      goals: "Something.",
    });
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("returns Zod error when required fields are missing", async () => {
    const result = await executeAgentTool("submit_intake", {
      contact_name: "Jane",
    });
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// get_available_slots — Zod validation only (no real DB needed)
// ---------------------------------------------------------------------------

describe("executeAgentTool — get_available_slots Zod validation", () => {
  it("returns Zod error when limit is 0", async () => {
    // We expect Zod to reject limit < 1, before db is touched
    const result = await executeAgentTool("get_available_slots", { limit: 0 });
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("returns Zod error when limit exceeds max (5)", async () => {
    const result = await executeAgentTool("get_available_slots", { limit: 10 });
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("applies default of 3 when limit is omitted", async () => {
    // Zod default(3) should parse. We can't run the DB query, so use a fake db.
    const fakeDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
      }),
      close: vi.fn(),
    };
    const result = await executeAgentTool(
      "get_available_slots",
      {},
      fakeDb as unknown as ReturnType<typeof import("@/platform/runtime").openCliDb>,
    );
    // all() returns [], count = 0 — confirms schema defaulted and executor ran
    expect(result).toMatchObject({ slots: [], count: 0 });
  });
});

// ---------------------------------------------------------------------------
// create_booking — Zod validation only
// ---------------------------------------------------------------------------

describe("executeAgentTool — create_booking Zod validation", () => {
  it("returns Zod error when slot_id is missing", async () => {
    const result = await executeAgentTool("create_booking", {
      email: "user@example.com",
    });
    expect(result).toMatchObject({ error: expect.stringContaining("slot_id") });
  });

  it("returns Zod error when email is invalid", async () => {
    const result = await executeAgentTool("create_booking", {
      slot_id: "slot-1",
      email: "bad-email",
    });
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("returns slot-not-found error from executor when using fake db", async () => {
    const fakeDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
        run: vi.fn(),
      }),
      // create_booking wraps its db calls in a transaction; the resolved
      // function is invoked immediately so slot-not-found is still raised.
      transaction: vi.fn().mockImplementation((fn: () => unknown) => fn),
      close: vi.fn(),
    };
    const result = await executeAgentTool(
      "create_booking",
      {
        slot_id: "slot-999",
        email: "user@example.com",
        intake_request_id: "intake-123",
      },
      fakeDb as unknown as ReturnType<typeof import("@/platform/runtime").openCliDb>,
    );
    expect(result).toMatchObject({ error: "slot not found" });
  });
});
