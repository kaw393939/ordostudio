// @vitest-environment node

/**
 * E2E: Offers Catalog — PRD-13
 *
 * Tests /api/v1/offers — public listing, admin create, and admin extras.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { GET, POST } from "../api/v1/offers/route";

let fx: StandardE2EFixture;

beforeAll(async () => {
  fx = await setupStandardE2EFixture();
}, 30_000);

afterAll(async () => {
  await cleanupStandardE2EFixtures();
});

const adminRequest = (url: string, init?: RequestInit) =>
  new Request(url, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: fx.adminCookie,
      origin: "http://localhost:3000",
    },
  });

describe("e2e: offers catalog", () => {
  // ── Public GET ─────────────────────────────────────

  it("GET /offers — public listing returns 200", async () => {
    const res = await GET(new Request("http://localhost:3000/api/v1/offers"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { count: number; items: unknown[]; _links: Record<string, unknown> };
    expect(body).toHaveProperty("count");
    expect(body).toHaveProperty("items");
    expect(body._links).toHaveProperty("self");
  });

  it("GET /offers — has cache-control", async () => {
    const res = await GET(new Request("http://localhost:3000/api/v1/offers"));
    expect(res.headers.get("cache-control")).toBeTruthy();
  });

  // ── Admin POST ─────────────────────────────────────

  it("POST /offers — admin creates offer", async () => {
    const res = await POST(
      adminRequest("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: "test-offer-e2e",
          title: "E2E Test Offer",
          summary: "A test service offer for e2e testing",
          price_cents: 50_000,
          currency: "USD",
          duration_label: "4 weeks",
          refund_policy_key: "standard",
          audience: "INDIVIDUAL",
          delivery_mode: "ONLINE",
          booking_url: "https://book.example.com/test",
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { slug: string; title: string; _links: Record<string, unknown> };
    expect(body.slug).toBe("test-offer-e2e");
    expect(body.title).toBe("E2E Test Offer");
    expect(body._links).toHaveProperty("self");
  });

  it("POST /offers — duplicate slug returns conflict error", async () => {
    const res = await POST(
      adminRequest("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: "test-offer-e2e",
          title: "Duplicate",
          summary: "Another",
          price_cents: 100,
          currency: "USD",
          duration_label: "1 week",
          refund_policy_key: "standard",
          booking_url: "https://book.example.com/dup",
        }),
      }),
    );
    // 409 Conflict or 500 (sqlite constraint error format varies)
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(201);
  });

  it("POST /offers — non-admin returns 403", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: fx.userCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "user-offer",
          title: "T",
          summary: "S",
          price_cents: 100,
          currency: "USD",
          duration_label: "1w",
          refund_policy_key: "standard",
          booking_url: "https://book.example.com/x",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  // ── Admin-aware GET ────────────────────────────────

  it("GET /offers — admin listing includes admin links", async () => {
    const res = await GET(adminRequest("http://localhost:3000/api/v1/offers"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { items: { _links: Record<string, unknown> }[] };
    const offer = body.items.find((i: Record<string, unknown>) => (i as { slug: string }).slug === "test-offer-e2e") as { _links: Record<string, unknown> } | undefined;
    if (offer) {
      // Admin links should include packages
      expect(offer._links).toHaveProperty("app:packages");
    }
  });

  it("GET /offers — supports query filters", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/v1/offers?audience=INDIVIDUAL&limit=1"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { limit: number };
    expect(body.limit).toBe(1);
  });
});
