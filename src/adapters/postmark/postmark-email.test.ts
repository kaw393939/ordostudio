import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostmarkTransactionalEmail } from "./postmark-email";

describe("PostmarkTransactionalEmail", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns error when server token is missing", async () => {
    const adapter = new PostmarkTransactionalEmail({
      serverToken: "",
      fromEmail: "noreply@test.com",
    });

    const result = await adapter.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    expect(result).toEqual({ ok: false, error: "missing_postmark_server_token" });
  });

  it("sends to Postmark API with correct headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ MessageID: "msg-123" }),
    });
    globalThis.fetch = mockFetch;

    const adapter = new PostmarkTransactionalEmail({
      serverToken: "test-token",
      fromEmail: "noreply@test.com",
      messageStream: "outbound",
    });

    await adapter.send({
      to: "user@test.com",
      subject: "Test Subject",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
      tag: "test-tag",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.postmarkapp.com/email");
    expect(options.method).toBe("POST");
    expect(options.headers["X-Postmark-Server-Token"]).toBe("test-token");
    expect(options.headers["content-type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.From).toBe("noreply@test.com");
    expect(body.To).toBe("user@test.com");
    expect(body.Subject).toBe("Test Subject");
    expect(body.TextBody).toBe("hello");
    expect(body.HtmlBody).toBe("<p>hello</p>");
    expect(body.MessageStream).toBe("outbound");
    expect(body.Tag).toBe("test-tag");
  });

  it("maps success response to ok result with messageId", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ MessageID: "msg-456" }),
    });

    const adapter = new PostmarkTransactionalEmail({
      serverToken: "test-token",
      fromEmail: "noreply@test.com",
    });

    const result = await adapter.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    expect(result).toEqual({ ok: true, messageId: "msg-456" });
  });

  it("maps failure response to error result", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Invalid email address",
    });

    const adapter = new PostmarkTransactionalEmail({
      serverToken: "test-token",
      fromEmail: "noreply@test.com",
    });

    const result = await adapter.send({
      to: "bad-email",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("postmark_http_422");
      expect(result.error).toContain("Invalid email address");
    }
  });

  it("handles fetch network errors gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network failure"));

    const adapter = new PostmarkTransactionalEmail({
      serverToken: "test-token",
      fromEmail: "noreply@test.com",
    });

    const result = await adapter.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("postmark_fetch_error");
      expect(result.error).toContain("network failure");
    }
  });

  it("omits Tag field when tag is not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ MessageID: "msg-789" }),
    });
    globalThis.fetch = mockFetch;

    const adapter = new PostmarkTransactionalEmail({
      serverToken: "test-token",
      fromEmail: "noreply@test.com",
    });

    await adapter.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.Tag).toBeUndefined();
  });

  it("uses message-level messageStream when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ MessageID: "msg-001" }),
    });
    globalThis.fetch = mockFetch;

    const adapter = new PostmarkTransactionalEmail({
      serverToken: "test-token",
      fromEmail: "noreply@test.com",
      messageStream: "outbound",
    });

    await adapter.send({
      to: "user@test.com",
      subject: "Test",
      textBody: "hello",
      htmlBody: "<p>hello</p>",
      messageStream: "broadcast",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.MessageStream).toBe("broadcast");
  });
});
