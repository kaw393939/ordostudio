// @vitest-environment node

/**
 * E2E: Account Lifecycle — PRD-13
 *
 * Tests /api/v1/account/activity, /api/v1/account/attention,
 * and /api/v1/account/delete endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { GET as getActivity } from "../api/v1/account/activity/route";
import { GET as getAttention } from "../api/v1/account/attention/route";
import { POST as postDelete } from "../api/v1/account/delete/route";

let fx: StandardE2EFixture;

beforeAll(async () => {
  fx = await setupStandardE2EFixture();
}, 30_000);

afterAll(async () => {
  await cleanupStandardE2EFixtures();
});

const authedRequest = (url: string, cookie: string, init?: RequestInit) =>
  new Request(url, {
    ...init,
    headers: {
      ...init?.headers,
      cookie,
      origin: "http://localhost:3000",
    },
  });

describe("e2e: account lifecycle", () => {
  // ── Activity ───────────────────────────────────────

  describe("account/activity", () => {
    it("GET — unauthenticated returns 401", async () => {
      const res = await getActivity(new Request("http://localhost:3000/api/v1/account/activity"));
      expect(res.status).toBe(401);
    });

    it("GET — returns recent audit entries for the user", async () => {
      const res = await getActivity(
        authedRequest("http://localhost:3000/api/v1/account/activity", fx.userCookie),
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as { count: number; items: unknown[]; _links: Record<string, unknown> };
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("items");
      expect(body._links.self).toEqual({ href: "/api/v1/account/activity" });
    });

    it("GET — cache-control is no-store", async () => {
      const res = await getActivity(
        authedRequest("http://localhost:3000/api/v1/account/activity", fx.userCookie),
      );
      expect(res.headers.get("cache-control")).toBe("no-store");
    });
  });

  // ── Attention ──────────────────────────────────────

  describe("account/attention", () => {
    it("GET — unauthenticated returns 401", async () => {
      const res = await getAttention(new Request("http://localhost:3000/api/v1/account/attention"));
      expect(res.status).toBe(401);
    });

    it("GET — returns attention summary with badge_count", async () => {
      const res = await getAttention(
        authedRequest("http://localhost:3000/api/v1/account/attention", fx.userCookie),
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as { badge_count: number; _links: Record<string, unknown> };
      expect(body).toHaveProperty("badge_count");
      expect(typeof body.badge_count).toBe("number");
      expect(body._links.self).toEqual({ href: "/api/v1/account/attention" });
    });
  });

  // ── Delete Account ─────────────────────────────────

  describe("account/delete", () => {
    it("POST — unauthenticated returns 401", async () => {
      const res = await postDelete(
        new Request("http://localhost:3000/api/v1/account/delete", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({ confirm_text: "DELETE" }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("POST — wrong confirm_text returns 412", async () => {
      const res = await postDelete(
        authedRequest("http://localhost:3000/api/v1/account/delete", fx.userCookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirm_text: "WRONG" }),
        }),
      );
      expect(res.status).toBe(412);
    });

    it("POST — CSRF violation returns 403", async () => {
      const res = await postDelete(
        new Request("http://localhost:3000/api/v1/account/delete", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: fx.userCookie,
            origin: "https://evil.example.com",
          },
          body: JSON.stringify({ confirm_text: "DELETE" }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it("POST — invalid JSON returns 400", async () => {
      const res = await postDelete(
        authedRequest("http://localhost:3000/api/v1/account/delete", fx.userCookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "not json",
        }),
      );
      expect(res.status).toBe(400);
    });
  });
});
