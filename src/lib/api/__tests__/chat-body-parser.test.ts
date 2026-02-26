import { describe, it, expect } from "vitest";
import { parseAndValidateChatBody } from "../chat-body-parser";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/v1/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("parseAndValidateChatBody", () => {
  it("returns ok:true with parsed fields on valid body", async () => {
    const req = makeRequest({
      session_id: "sess-abc",
      message: "Hello",
      conversation_id: "conv-1",
      attachments: [],
    });
    const result = await parseAndValidateChatBody(req);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.data.sessionId).toBe("sess-abc");
    expect(result.data.userMessage).toBe("Hello");
    expect(result.data.conversationId).toBe("conv-1");
    expect(result.data.attachments).toEqual([]);
  });

  it("returns 400 when session_id is missing", async () => {
    const req = makeRequest({ message: "Hi" });
    const result = await parseAndValidateChatBody(req);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error();
    expect(result.response.status).toBe(400);
    const json = await result.response.json() as { error: string };
    expect(json.error).toMatch(/session_id/);
  });

  it("returns 400 when message and attachments are both absent", async () => {
    const req = makeRequest({ session_id: "sess-1" });
    const result = await parseAndValidateChatBody(req);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error();
    expect(result.response.status).toBe(400);
    const json = await result.response.json() as { error: string };
    expect(json.error).toMatch(/message or attachments/);
  });

  it("returns 400 on non-JSON body", async () => {
    const req = new Request("http://localhost/api/v1/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const result = await parseAndValidateChatBody(req);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error();
    expect(result.response.status).toBe(400);
  });

  it("accepts body with only attachments (no text message)", async () => {
    const req = makeRequest({
      session_id: "sess-2",
      attachments: [
        { type: "image", mediaType: "image/png", name: "test.png", data: "base64data" },
      ],
    });
    const result = await parseAndValidateChatBody(req);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.data.attachments).toHaveLength(1);
  });
});
