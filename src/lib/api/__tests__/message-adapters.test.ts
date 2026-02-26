import { describe, it, expect } from "vitest";
import { toOAIMessages } from "@/lib/api/message-adapters";
import type { ConversationMessage } from "@/lib/api/conversation-store";

function msg(
  role: ConversationMessage["role"],
  content: string,
  tool_call_id?: string,
): ConversationMessage {
  return { role, content, created_at: "2026-01-01T00:00:00Z", tool_call_id };
}

describe("toOAIMessages", () => {
  it("converts a user message", () => {
    const result = toOAIMessages([msg("user", "hello")]);
    expect(result).toEqual([{ role: "user", content: "hello" }]);
  });

  it("converts an assistant message", () => {
    const result = toOAIMessages([msg("assistant", "hi there")]);
    expect(result).toEqual([{ role: "assistant", content: "hi there" }]);
  });

  it("converts a tool message with tool_call_id", () => {
    const result = toOAIMessages([msg("tool", '{"ok":true}', "call-123")]);
    expect(result).toEqual([
      { role: "tool", content: '{"ok":true}', tool_call_id: "call-123" },
    ]);
  });

  it("throws when a tool message is missing tool_call_id", () => {
    expect(() => toOAIMessages([msg("tool", '{"ok":true}')])).toThrow(
      /missing tool_call_id/,
    );
  });

  it("converts a mixed history in order", () => {
    const messages = [
      msg("user", "Book me a slot"),
      msg("assistant", "Checking..."),
      msg("tool", '{"slots":[]}', "call-456"),
      msg("assistant", "No slots found"),
    ];
    const result = toOAIMessages(messages);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ role: "user", content: "Book me a slot" });
    expect(result[2]).toEqual({
      role: "tool",
      content: '{"slots":[]}',
      tool_call_id: "call-456",
    });
  });

  it("returns an empty array for empty input", () => {
    expect(toOAIMessages([])).toEqual([]);
  });
});
