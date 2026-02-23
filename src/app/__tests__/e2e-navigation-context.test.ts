// @vitest-environment node

/**
 * E2E: Navigation & Context — PRD-13
 *
 * Tests cross-cutting concerns: /api/v1/docs (OpenAPI), /api/v1/me,
 * and that authenticated vs public contexts return the right shape.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { GET as getDocs } from "../api/v1/docs/route";
import { GET as getMe } from "../api/v1/me/route";

let fx: StandardE2EFixture;

beforeAll(async () => {
  fx = await setupStandardE2EFixture();
}, 30_000);

afterAll(async () => {
  await cleanupStandardE2EFixtures();
});

describe("e2e: navigation & context", () => {
  // ── OpenAPI docs ───────────────────────────────────

  describe("/api/v1/docs", () => {
    it("GET — returns OpenAPI document", async () => {
      const res = await getDocs(new Request("http://localhost:3000/api/v1/docs"));
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("openapi");
      expect(body).toHaveProperty("info");
      expect(body).toHaveProperty("paths");
    });

    it("GET — content-type is JSON", async () => {
      const res = await getDocs(new Request("http://localhost:3000/api/v1/docs"));
      expect(res.headers.get("content-type")).toContain("application/json");
    });
  });

  // ── /me (session context) ──────────────────────────

  describe("/api/v1/me", () => {
    it("GET — unauthenticated returns 401", async () => {
      const res = await getMe(new Request("http://localhost:3000/api/v1/me"));
      expect(res.status).toBe(401);
    });

    it("GET — regular user gets user context", async () => {
      const res = await getMe(
        new Request("http://localhost:3000/api/v1/me", {
          headers: { cookie: fx.userCookie },
        }),
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as { email: string; roles: string[]; _links: Record<string, unknown> };
      expect(body.email).toBe("usera@example.com");
      expect(body._links).toHaveProperty("self");
    });

    it("GET — admin user has admin roles", async () => {
      const res = await getMe(
        new Request("http://localhost:3000/api/v1/me", {
          headers: { cookie: fx.adminCookie },
        }),
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as { email: string; roles: string[] };
      expect(body.email).toBe("admina@example.com");
      expect(body.roles).toContain("ADMIN");
    });

    it("GET — response has HAL self link", async () => {
      const res = await getMe(
        new Request("http://localhost:3000/api/v1/me", {
          headers: { cookie: fx.userCookie },
        }),
      );
      const body = (await res.json()) as { _links: { self: { href: string } } };
      expect(body._links.self.href).toBe("/api/v1/me");
    });
  });
});
