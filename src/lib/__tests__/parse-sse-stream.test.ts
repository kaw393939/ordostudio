import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseSSEStream, type SSEHandlers } from "../parse-sse-stream";

// ---------------------------------------------------------------------------
// Helper — build a mock reader from a list of string chunks
// ---------------------------------------------------------------------------

function makeReader(
  chunks: string[],
): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    async read() {
      if (i >= chunks.length) return { done: true, value: undefined };
      return { done: false, value: encoder.encode(chunks[i++]) };
    },
    cancel: vi.fn(),
    releaseLock: vi.fn(),
    closed: Promise.resolve(undefined),
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

function makeHandlers(): SSEHandlers & {
  deltas: string[];
  dones: Parameters<SSEHandlers["onDone"]>[0][];
  toolCalls: Parameters<SSEHandlers["onToolCall"]>[0][];
  toolResults: Parameters<SSEHandlers["onToolResult"]>[0][];
  errors: Error[];
} {
  const deltas: string[] = [];
  const dones: Parameters<SSEHandlers["onDone"]>[0][] = [];
  const toolCalls: Parameters<SSEHandlers["onToolCall"]>[0][] = [];
  const toolResults: Parameters<SSEHandlers["onToolResult"]>[0][] = [];
  const errors: Error[] = [];

  return {
    deltas,
    dones,
    toolCalls,
    toolResults,
    errors,
    onDelta: vi.fn((d) => deltas.push(d)),
    onDone: vi.fn((m) => dones.push(m)),
    onToolCall: vi.fn((c) => toolCalls.push(c)),
    onToolResult: vi.fn((r) => toolResults.push(r)),
    onError: vi.fn((e) => errors.push(e)),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseSSEStream", () => {
  it("calls onDelta for each delta frame", async () => {
    const h = makeHandlers();
    const reader = makeReader([
      'data: {"delta":"Hello"}\n\n',
      'data: {"delta":" world"}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.deltas).toEqual(["Hello", " world"]);
    expect(h.onDelta).toHaveBeenCalledTimes(2);
  });

  it("accumulates partial frames across multiple reads", async () => {
    const h = makeHandlers();
    // Split an SSE frame across two chunks
    const reader = makeReader([
      'data: {"del',
      'ta":"chunk"}\n\ndata: {"delta":"two"}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.deltas).toEqual(["chunk", "two"]);
  });

  it("calls onDone with conversationId and sessionId", async () => {
    const h = makeHandlers();
    const reader = makeReader([
      'data: {"done":true,"conversationId":"conv-1","sessionId":"sess-1"}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.dones).toHaveLength(1);
    expect(h.dones[0]).toEqual({
      conversationId: "conv-1",
      sessionId: "sess-1",
      intakeSubmitted: false,
    });
  });

  it("calls onDone with intakeSubmitted=true when flag is set", async () => {
    const h = makeHandlers();
    const reader = makeReader([
      'data: {"done":true,"conversationId":"c","sessionId":"s","intake_submitted":true}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.dones[0]?.intakeSubmitted).toBe(true);
  });

  it("calls onToolCall with parsed name and args", async () => {
    const h = makeHandlers();
    const reader = makeReader([
      'data: {"toolCall":{"name":"get_booking","args":{"id":42}}}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.toolCalls).toHaveLength(1);
    expect(h.toolCalls[0]).toEqual({
      name: "get_booking",
      args: { id: 42 },
    });
  });

  it("calls onToolResult with name and content", async () => {
    const h = makeHandlers();
    const reader = makeReader([
      'data: {"toolResult":{"name":"get_booking","content":"[{\\"id\\":1}]"}}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.toolResults).toHaveLength(1);
    expect(h.toolResults[0]?.name).toBe("get_booking");
  });

  it("calls onError on malformed JSON and continues", async () => {
    const h = makeHandlers();
    const reader = makeReader([
      "data: {bad json}\n\n",
      'data: {"delta":"ok"}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.errors).toHaveLength(1);
    expect(h.errors[0]?.message).toMatch(/SSE parse error/);
    // Processing continues after the bad frame
    expect(h.deltas).toEqual(["ok"]);
  });

  it("silently ignores [DONE] sentinel", async () => {
    const h = makeHandlers();
    const reader = makeReader(["data: [DONE]\n\n"]);
    await parseSSEStream(reader, h);
    expect(h.onDelta).not.toHaveBeenCalled();
    expect(h.onDone).not.toHaveBeenCalled();
    expect(h.onError).not.toHaveBeenCalled();
  });

  it("silently ignores empty frames and blank lines", async () => {
    const h = makeHandlers();
    const reader = makeReader(["\n\n  \n\n", 'data: {"delta":"x"}\n\n']);
    await parseSSEStream(reader, h);
    expect(h.deltas).toEqual(["x"]);
    expect(h.onError).not.toHaveBeenCalled();
  });

  it("handles a stream where done arrives after several deltas", async () => {
    const h = makeHandlers();
    const reader = makeReader([
      'data: {"delta":"a"}\n\ndata: {"delta":"b"}\n\ndata: {"done":true,"conversationId":"c1","sessionId":null}\n\n',
    ]);
    await parseSSEStream(reader, h);
    expect(h.deltas).toEqual(["a", "b"]);
    expect(h.dones[0]?.conversationId).toBe("c1");
    expect(h.dones[0]?.sessionId).toBeNull();
  });

  it("calls onError when the reader throws", async () => {
    const h = makeHandlers();
    const brokenReader: ReadableStreamDefaultReader<Uint8Array> = {
      async read() {
        throw new Error("network error");
      },
      cancel: vi.fn(),
      releaseLock: vi.fn(),
      closed: Promise.resolve(undefined),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    await parseSSEStream(brokenReader, h);
    expect(h.errors).toHaveLength(1);
    expect(h.errors[0]?.message).toBe("network error");
  });
});
