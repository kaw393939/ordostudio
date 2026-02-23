import { beforeEach, describe, expect, it, vi } from "vitest";

import { follow, requestHal, type HalResource } from "../hal-client";

describe("hal client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("follows relations from HAL links", () => {
    const resource: HalResource = {
      _links: {
        self: { href: "/api/v1" },
        events: { href: "/api/v1/events" },
      },
    };

    const events = follow(resource, "events");
    expect(events?.href).toBe("/api/v1/events");
    expect(follow(resource, "missing")).toBeNull();
  });

  it("parses problem details for non-2xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          request_id: "req-1",
        }),
        { status: 401, headers: { "content-type": "application/problem+json" } },
      ),
    );

    const result = await requestHal<{ ok: true }>("/api/v1/me");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.status).toBe(401);
      expect(result.problem.request_id).toBe("req-1");
    }
  });
});
