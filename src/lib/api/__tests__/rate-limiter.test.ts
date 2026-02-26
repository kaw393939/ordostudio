import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../rate-limiter";
import type { ConversationMessage } from "../conversation-store";

function makeMsgs(userCount: number, assistantCount = 0): ConversationMessage[] {
  const msgs: ConversationMessage[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < userCount; i++) {
    msgs.push({ role: "user", content: `msg ${i}`, created_at: now });
  }
  for (let i = 0; i < assistantCount; i++) {
    msgs.push({ role: "assistant", content: `reply ${i}`, created_at: now });
  }
  return msgs;
}

describe("checkRateLimit", () => {
  it("returns limited:false when under the cap", () => {
    const result = checkRateLimit(makeMsgs(5), 20, "conv-1");
    expect(result.limited).toBe(false);
  });

  it("returns limited:false when exactly one under the cap", () => {
    const result = checkRateLimit(makeMsgs(19), 20, "conv-1");
    expect(result.limited).toBe(false);
  });

  it("returns limited:true with SSE Response when at the cap", async () => {
    const result = checkRateLimit(makeMsgs(20), 20, "conv-42");
    expect(result.limited).toBe(true);
    if (!result.limited) throw new Error();
    expect(result.response).toBeInstanceOf(Response);
    expect(result.response.headers.get("Content-Type")).toBe("text/event-stream");

    // The SSE stream should contain the conversation_id in the done frame
    const reader = result.response.body!.getReader();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    expect(text).toContain("conv-42");
    expect(text).toContain('"done":true');
  });

  it("counts only user turns, not assistant or tool turns", () => {
    // 19 user + 10 assistant = 29 total msgs, but only 19 user turns
    const msgs = makeMsgs(19, 10);
    const result = checkRateLimit(msgs, 20, "conv-1");
    expect(result.limited).toBe(false);
  });
});
