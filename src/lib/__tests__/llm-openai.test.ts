/**
 * Tests for R-10: runOpenAIAgentLoopStream in llm-openai.ts
 *
 * Uses a class-based OpenAI mock (arrow functions can\'t be used as constructors).
 * The class field initializer closes over mockStream at instance-creation time,
 * so vi.fn() is available even though vi.mock factories are hoisted.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mock stream — captured by class field initializer at new() time
// ---------------------------------------------------------------------------

const mockStream = vi.fn();

vi.mock("openai", () => {
  // Class field: `chat` is initialized each time new OpenAI() is called,
  // at which point mockStream is already a vi.fn().
  return {
    default: class {
      chat = {
        completions: {
          stream: mockStream,
        },
      };
    },
  };
});

// Set env before first getOpenAIClient() call (happens inside tests, not at import)
process.env.OPENAI_API_KEY = "test-key-for-unit-tests";

// ---------------------------------------------------------------------------
// Import module under test after mock registration
// ---------------------------------------------------------------------------

import { runOpenAIAgentLoopStream, getOpenAIClient } from "../llm-openai";
import type { OAIAgentLoopOptions } from "../llm-openai";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockStream(
  textChunks: string[],
  finishReason: "stop" | "tool_calls",
  toolCalls?: Array<{ id: string; name: string; arguments: string }>,
) {
  async function* chunkGen() {
    for (const text of textChunks) {
      yield { choices: [{ delta: { content: text } }] };
    }
  }

  const finalMsg = {
    choices: [
      {
        finish_reason: finishReason,
        message: {
          content: textChunks.join(""),
          tool_calls:
            finishReason === "tool_calls" && toolCalls?.length
              ? toolCalls.map((tc) => ({
                  id: tc.id,
                  type: "function",
                  function: { name: tc.name, arguments: tc.arguments },
                }))
              : undefined,
        },
      },
    ],
  };

  return {
    [Symbol.asyncIterator]: () => chunkGen()[Symbol.asyncIterator](),
    finalMessage: vi.fn().mockResolvedValue(finalMsg),
  };
}

function makeBaseOptions(overrides: Partial<OAIAgentLoopOptions> = {}): OAIAgentLoopOptions {
  return {
    systemPrompt: "You are a helpful assistant.",
    messages: [{ role: "user", content: "Hello" }],
    tools: [],
    executeToolFn: vi.fn().mockResolvedValue({ result: "ok" }),
    maxToolRounds: 3,
    callbacks: {
      onDelta: vi.fn(),
      onToolCall: vi.fn(),
      onToolResult: vi.fn(),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------

describe("runOpenAIAgentLoopStream", () => {
  beforeEach(() => {
    mockStream.mockReset();
  });

  it("fires onDelta for each text chunk from the stream", async () => {
    const textChunks = ["Hello", " world", "!"];
    mockStream.mockReturnValueOnce(makeMockStream(textChunks, "stop"));

    const onDelta = vi.fn();
    await runOpenAIAgentLoopStream(makeBaseOptions({ callbacks: { onDelta } }));

    expect(onDelta).toHaveBeenCalledTimes(3);
    expect(onDelta).toHaveBeenNthCalledWith(1, "Hello");
    expect(onDelta).toHaveBeenNthCalledWith(2, " world");
    expect(onDelta).toHaveBeenNthCalledWith(3, "!");
  });

  it("returns empty capturedValues and toolEvents when no tools are called", async () => {
    mockStream.mockReturnValueOnce(makeMockStream(["Ok"], "stop"));

    const result = await runOpenAIAgentLoopStream(makeBaseOptions());
    expect(result.capturedValues).toEqual({});
    expect(result.toolEvents).toEqual([]);
  });

  it("calls executeToolFn and fires onToolCall/onToolResult for a tool round", async () => {
    mockStream.mockReturnValueOnce(
      makeMockStream([], "tool_calls", [
        { id: "call_1", name: "content_search", arguments: '{"query":"maestro"}' },
      ]),
    );
    mockStream.mockReturnValueOnce(makeMockStream(["Here is info."], "stop"));

    const executeToolFn = vi.fn().mockResolvedValue({ results: ["some content"] });
    const onToolCall = vi.fn();
    const onToolResult = vi.fn();
    const onDelta = vi.fn();

    await runOpenAIAgentLoopStream(
      makeBaseOptions({ executeToolFn, callbacks: { onDelta, onToolCall, onToolResult } }),
    );

    expect(onToolCall).toHaveBeenCalledWith("content_search", { query: "maestro" });
    expect(executeToolFn).toHaveBeenCalledWith("content_search", { query: "maestro" });
    expect(onToolResult).toHaveBeenCalledWith("content_search", { results: ["some content"] });
    expect(onDelta).toHaveBeenCalledWith("Here is info.");
  });

  it("captures intake_request_id from submit_intake result", async () => {
    mockStream.mockReturnValueOnce(
      makeMockStream([], "tool_calls", [
        {
          id: "call_2",
          name: "submit_intake",
          arguments:
            '{"contact_name":"Jane","contact_email":"j@x.com","audience":"INDIVIDUAL","goals":"Test"}',
        },
      ]),
    );
    mockStream.mockReturnValueOnce(makeMockStream(["Done."], "stop"));

    const executeToolFn = vi.fn().mockResolvedValue({
      intake_request_id: "intake-abc-123",
      status: "PENDING",
    });

    const result = await runOpenAIAgentLoopStream(makeBaseOptions({ executeToolFn }));
    expect(result.capturedValues.intake_request_id).toBe("intake-abc-123");
  });

  it("captures booking_id from create_booking result", async () => {
    mockStream.mockReturnValueOnce(
      makeMockStream([], "tool_calls", [
        {
          id: "call_3",
          name: "create_booking",
          arguments: '{"slot_id":"slot-1","email":"j@x.com","intake_request_id":"intake-1"}',
        },
      ]),
    );
    mockStream.mockReturnValueOnce(makeMockStream(["Booked."], "stop"));

    const executeToolFn = vi.fn().mockResolvedValue({
      booking_id: "booking-xyz",
      status: "PENDING",
    });

    const result = await runOpenAIAgentLoopStream(makeBaseOptions({ executeToolFn }));
    expect(result.capturedValues.booking_id).toBe("booking-xyz");
  });

  it("handles malformed tool arguments gracefully (falls back to {})", async () => {
    mockStream.mockReturnValueOnce(
      makeMockStream([], "tool_calls", [
        { id: "call_4", name: "content_search", arguments: "NOT_VALID_JSON" },
      ]),
    );
    mockStream.mockReturnValueOnce(makeMockStream(["Result."], "stop"));

    const executeToolFn = vi.fn().mockResolvedValue({});
    await runOpenAIAgentLoopStream(makeBaseOptions({ executeToolFn }));

    expect(executeToolFn).toHaveBeenCalledWith("content_search", {});
  });

  it("respects maxToolRounds and stops after the limit", async () => {
    for (let i = 0; i < 2; i++) {
      mockStream.mockReturnValueOnce(
        makeMockStream([], "tool_calls", [
          { id: `call_${i}`, name: "content_search", arguments: '{"query":"x"}' },
        ]),
      );
    }

    const executeToolFn = vi.fn().mockResolvedValue({ results: [] });
    await runOpenAIAgentLoopStream(makeBaseOptions({ executeToolFn, maxToolRounds: 2 }));

    expect(executeToolFn).toHaveBeenCalledTimes(2);
    expect(mockStream).toHaveBeenCalledTimes(2);
  });

  it("populates toolEvents with tool_call and tool_result entries", async () => {
    mockStream.mockReturnValueOnce(
      makeMockStream([], "tool_calls", [
        { id: "call_5", name: "get_site_setting", arguments: '{"key":"contact.email"}' },
      ]),
    );
    mockStream.mockReturnValueOnce(makeMockStream(["Info."], "stop"));

    const executeToolFn = vi
      .fn()
      .mockResolvedValue({ key: "contact.email", value: "hi@studio.com" });

    const result = await runOpenAIAgentLoopStream(makeBaseOptions({ executeToolFn }));

    expect(result.toolEvents).toHaveLength(2);
    expect(result.toolEvents[0]).toMatchObject({ type: "tool_call", name: "get_site_setting" });
    expect(result.toolEvents[1]).toMatchObject({ type: "tool_result", name: "get_site_setting" });
  });
});

// ---------------------------------------------------------------------------
// getOpenAIClient singleton
// ---------------------------------------------------------------------------

describe("getOpenAIClient", () => {
  it("returns the same instance on repeated calls (singleton pattern)", () => {
    const c1 = getOpenAIClient();
    const c2 = getOpenAIClient();
    expect(c1).toBe(c2);
  });
});
