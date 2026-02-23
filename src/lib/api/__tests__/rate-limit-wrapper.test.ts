import { describe, it, expect, beforeEach } from "vitest";
import { withRateLimit } from "@/lib/api/rate-limit-wrapper";
import { resetRateLimits } from "@/lib/api/rate-limit";

beforeEach(() => {
  resetRateLimits();
});

const dummyRequest = (ip = "1.2.3.4") =>
  new Request("http://localhost/api/v1/test", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });

const okHandler = async () =>
  new Response(JSON.stringify({ ok: true }), { status: 200 });

describe("withRateLimit", () => {
  it("allows requests under the limit", async () => {
    const handler = withRateLimit("auth:login", okHandler);
    const response = await handler(dummyRequest());
    expect(response.status).toBe(200);
  });

  it("returns 429 after exceeding the limit", async () => {
    const handler = withRateLimit("auth:login", okHandler);
    const ip = "10.0.0.1";

    // auth:login allows 5 per minute
    for (let i = 0; i < 5; i++) {
      const res = await handler(dummyRequest(ip));
      expect(res.status).toBe(200);
    }

    // 6th request should be rejected
    const res = await handler(dummyRequest(ip));
    expect(res.status).toBe(429);
  });

  it("returns problem+json for 429 responses", async () => {
    const handler = withRateLimit("auth:register", okHandler);
    const ip = "10.0.0.2";

    for (let i = 0; i < 5; i++) {
      await handler(dummyRequest(ip));
    }

    const res = await handler(dummyRequest(ip));
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/problem+json");

    const body = await res.json();
    expect(body.status).toBe(429);
    expect(body.title).toBe("Too Many Requests");
  });

  it("includes rate limit headers on 429 responses", async () => {
    const handler = withRateLimit("auth:login", okHandler);
    const ip = "10.0.0.3";

    for (let i = 0; i < 5; i++) {
      await handler(dummyRequest(ip));
    }

    const res = await handler(dummyRequest(ip));
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(res.headers.get("x-ratelimit-limit")).toBe("5");
    expect(res.headers.get("x-ratelimit-remaining")).toBe("0");
  });

  it("different IPs have independent limits", async () => {
    const handler = withRateLimit("auth:login", okHandler);

    // Exhaust limit for IP-A
    for (let i = 0; i < 5; i++) {
      await handler(dummyRequest("10.0.0.10"));
    }
    const blockedA = await handler(dummyRequest("10.0.0.10"));
    expect(blockedA.status).toBe(429);

    // IP-B should still be allowed
    const allowedB = await handler(dummyRequest("10.0.0.11"));
    expect(allowedB.status).toBe(200);
  });

  it("admin:write allows 30 requests", async () => {
    const handler = withRateLimit("admin:write", okHandler);
    const ip = "10.0.0.20";

    for (let i = 0; i < 30; i++) {
      const res = await handler(dummyRequest(ip));
      expect(res.status).toBe(200);
    }

    const res = await handler(dummyRequest(ip));
    expect(res.status).toBe(429);
  });

  it("throws for unknown category", () => {
    expect(() => withRateLimit("nonexistent", okHandler)).toThrow(
      "Unknown rate limit category",
    );
  });

  it("passes request and context to the underlying handler", async () => {
    let receivedContext: unknown;
    const contextHandler = async (_req: Request, ctx?: unknown) => {
      receivedContext = ctx;
      return new Response("ok", { status: 200 });
    };

    const handler = withRateLimit("webhook", contextHandler);
    const ctx = { params: Promise.resolve({ id: "123" }) };
    await handler(dummyRequest(), ctx);

    expect(receivedContext).toBe(ctx);
  });
});
