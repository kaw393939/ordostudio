// @vitest-environment node

/**
 * E2E: Intake Pipeline — PRD-13
 *
 * Tests /api/v1/intake — public submission and admin listing.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { GET, POST } from "../api/v1/intake/route";

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

describe("e2e: intake pipeline", () => {
  // ── Public POST ────────────────────────────────────

  it("POST /intake — submits a new intake request", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          offer_slug: "test-offer",
          audience: "INDIVIDUAL",
          organization_name: "Acme Corp",
          contact_name: "Jane Doe",
          contact_email: "jane@acme.example",
          goals: "Learn advanced topics",
          timeline: "Q1 2026",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("_links");
  });

  it("POST /intake — rejects cross-origin request", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example.com",
        },
        body: JSON.stringify({ offer_slug: "x" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("POST /intake — rejects invalid JSON body", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
  });

  // ── Admin GET ──────────────────────────────────────

  it("GET /intake — admin lists intake requests", async () => {
    // Ensure at least one exists
    await POST(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          audience: "ORGANIZATION",
          contact_name: "Admin Test",
          contact_email: "admin-test@example.com",
        }),
      }),
    );

    const response = await GET(adminRequest("http://localhost:3000/api/v1/intake"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { count: number; items: unknown[] };
    expect(body).toHaveProperty("count");
    expect(body).toHaveProperty("items");
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /intake — unauthenticated returns 401", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/v1/intake"),
    );

    expect(response.status).toBe(401);
  });

  it("GET /intake — non-admin returns 403", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/v1/intake", {
        headers: { cookie: fx.userCookie },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("GET /intake — supports limit and offset", async () => {
    const response = await GET(
      adminRequest("http://localhost:3000/api/v1/intake?limit=1&offset=0"),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { limit: number; offset: number };
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(0);
  });

  it("GET /intake — returns HAL _links.self", async () => {
    const response = await GET(adminRequest("http://localhost:3000/api/v1/intake"));
    const body = (await response.json()) as { _links: { self: { href: string } } };
    expect(body._links.self.href).toBe("/api/v1/intake");
  });

  it("GET /intake — items have self links", async () => {
    const response = await GET(adminRequest("http://localhost:3000/api/v1/intake"));
    const body = (await response.json()) as { items: { _links: { self: { href: string } } }[] };

    for (const item of body.items) {
      expect(item._links.self.href).toMatch(/^\/api\/v1\/intake\//);
    }
  });
});
