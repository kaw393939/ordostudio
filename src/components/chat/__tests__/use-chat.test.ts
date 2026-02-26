import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "../use-chat";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeSSE(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= frames.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(frames[i++]));
    },
  });
}

function mockFetchSuccess(frames: string[]) {
  vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(encodeSSE(frames), {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    }),
  );
}

function mockFetchError(status = 500) {
  vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response("Internal Server Error", { status }),
  );
}

function mockFetchNetworkError() {
  vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("network error"));
}

// ---------------------------------------------------------------------------
// localStorage stub — JSDOM in this env has a restricted storage implementation
// ---------------------------------------------------------------------------

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  };
}

let localStorageMock = makeLocalStorageMock();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorageMock = makeLocalStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  // (no afterEach needed — vi.restoreAllMocks() runs in beforeEach)

  // ── Initial state ──────────────────────────────────────────────────────────

  it("starts with opening assistant message and isStreaming false", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.role).toBe("assistant");
    expect(result.current.messages[0]?.content).toBeTruthy();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.submitted).toBe(false);
  });

  it("hasUserMessages is false before any send", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.hasUserMessages).toBe(false);
  });

  it("isLastMsgStreaming is false initially", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.isLastMsgStreaming).toBe(false);
  });

  // ── Optimistic user message ────────────────────────────────────────────────

  it("adds user message optimistically before response", async () => {
    mockFetchSuccess([
      'data: {"delta":"Hi"}\n\n',
      'data: {"done":true,"conversationId":"c1","sessionId":"s1"}\n\n',
    ]);

    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("Hello", []));

    const userMsg = result.current.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toBe("Hello");
  });

  it("hasUserMessages becomes true after send", async () => {
    mockFetchSuccess([
      'data: {"done":true,"conversationId":"c1","sessionId":"s1"}\n\n',
    ]);

    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("Hey", []));
    expect(result.current.hasUserMessages).toBe(true);
  });

  // ── Streaming deltas ───────────────────────────────────────────────────────

  it("accumulates streaming deltas into assistant message content", async () => {
    mockFetchSuccess([
      'data: {"delta":"Hello"}\n\n',
      'data: {"delta":" world"}\n\n',
      'data: {"done":true,"conversationId":"c2","sessionId":"s2"}\n\n',
    ]);

    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("Hi", []));

    const assistantMsgs = result.current.messages.filter(
      (m) => m.role === "assistant",
    );
    const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
    expect(lastAssistant?.content).toBe("Hello world");
  });

  it("isStreaming resets to false after stream ends", async () => {
    mockFetchSuccess([
      'data: {"done":true,"conversationId":"c3","sessionId":"s3"}\n\n',
    ]);

    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("test", []));
    expect(result.current.isStreaming).toBe(false);
  });

  // ── Conversation ID persistence ────────────────────────────────────────────

  it("saves conversationId to localStorage on done", async () => {
    mockFetchSuccess([
      'data: {"done":true,"conversationId":"conv-42","sessionId":"sess-1"}\n\n',
    ]);

    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("test", []));
    expect(localStorageMock.setItem).toHaveBeenCalledWith("so_conversation_id", "conv-42");
  });

  // ── intake_submitted flag ──────────────────────────────────────────────────

  it("sets submitted=true when intake_submitted flag arrives", async () => {
    mockFetchSuccess([
      'data: {"done":true,"conversationId":"c4","sessionId":"s4","intake_submitted":true}\n\n',
    ]);

    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("apply", []));
    expect(result.current.submitted).toBe(true);
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("adds error message when response is not ok", async () => {
    mockFetchError(500);
    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("broken", []));

    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.role).toBe("assistant");
    expect(lastMsg?.content).toMatch(/something went wrong/i);
    expect(result.current.isStreaming).toBe(false);
  });

  it("adds connection-lost message on network error", async () => {
    mockFetchNetworkError();
    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("broken", []));

    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.content).toMatch(/connection lost/i);
    expect(result.current.isStreaming).toBe(false);
  });

  // ── Guard conditions ───────────────────────────────────────────────────────

  it("does nothing when called with empty text and no attachments", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const { result } = renderHook(() => useChat());
    await act(() => result.current.sendMessage("", []));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
