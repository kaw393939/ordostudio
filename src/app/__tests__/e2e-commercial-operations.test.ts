// @vitest-environment node

/**
 * E2E: Commercial Operations — PRD-13
 *
 * Tests /api/v1/commercial/proposals and /api/v1/commercial/invoices.
 * Admin creates proposals and invoices; unauthenticated users get 401.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { GET as getProposals, POST as postProposal } from "../api/v1/commercial/proposals/route";
import { GET as getInvoices, POST as postInvoice } from "../api/v1/commercial/invoices/route";

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

describe("e2e: commercial operations", () => {
  // ── Proposals ──────────────────────────────────────

  describe("proposals", () => {
    it("GET /proposals — unauthenticated returns 401", async () => {
      const res = await getProposals(new Request("http://localhost:3000/api/v1/commercial/proposals"));
      expect(res.status).toBe(401);
    });

    it("GET /proposals — non-admin returns 403", async () => {
      const res = await getProposals(
        new Request("http://localhost:3000/api/v1/commercial/proposals", {
          headers: { cookie: fx.userCookie },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("GET /proposals — admin lists (initially empty)", async () => {
      const res = await getProposals(adminRequest("http://localhost:3000/api/v1/commercial/proposals"));
      expect(res.status).toBe(200);

      const body = (await res.json()) as { count: number; items: unknown[] };
      expect(body).toHaveProperty("count");
      expect(body).toHaveProperty("items");
      expect(body).toHaveProperty("_links");
    });

    it("POST /proposals — admin creates a proposal", async () => {
      const res = await postProposal(
        adminRequest("http://localhost:3000/api/v1/commercial/proposals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_email: "client@test.example",
            title: "Test Engagement",
            amount_cents: 150_000,
            currency: "USD",
            event_slug: "published-open",
          }),
        }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string; title: string; _links: Record<string, unknown> };
      expect(body).toHaveProperty("id");
      expect(body.title).toBe("Test Engagement");
      expect(body._links).toHaveProperty("self");
    });

    it("POST /proposals — rejects CSRF violation", async () => {
      const res = await postProposal(
        new Request("http://localhost:3000/api/v1/commercial/proposals", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: fx.adminCookie,
            origin: "https://evil.example.com",
          },
          body: JSON.stringify({
            client_email: "x@x.com",
            title: "T",
            amount_cents: 100,
            currency: "USD",
            event_slug: "published-open",
          }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it("GET /proposals — reflects created proposal", async () => {
      const res = await getProposals(adminRequest("http://localhost:3000/api/v1/commercial/proposals"));
      const body = (await res.json()) as { count: number; items: { title: string }[] };
      expect(body.count).toBeGreaterThanOrEqual(1);
      expect(body.items.some((i) => i.title === "Test Engagement")).toBe(true);
    });
  });

  // ── Invoices ───────────────────────────────────────

  describe("invoices", () => {
    it("GET /invoices — unauthenticated returns 401", async () => {
      const res = await getInvoices(new Request("http://localhost:3000/api/v1/commercial/invoices"));
      expect(res.status).toBe(401);
    });

    it("GET /invoices — admin lists (initially empty)", async () => {
      const res = await getInvoices(adminRequest("http://localhost:3000/api/v1/commercial/invoices"));
      expect(res.status).toBe(200);

      const body = (await res.json()) as { count: number; items: unknown[] };
      expect(body.count).toBeGreaterThanOrEqual(0);
    });

    it("POST /invoices — admin creates an invoice", async () => {
      const res = await postInvoice(
        adminRequest("http://localhost:3000/api/v1/commercial/invoices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_email: "client@test.example",
            amount_cents: 75_000,
            currency: "USD",
          }),
        }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string; _links: Record<string, unknown> };
      expect(body).toHaveProperty("id");
      expect(body._links).toHaveProperty("self");
      expect(body._links).toHaveProperty("payments");
    });

    it("POST /invoices — invalid JSON returns 400", async () => {
      const res = await postInvoice(
        adminRequest("http://localhost:3000/api/v1/commercial/invoices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{bad json",
        }),
      );
      expect(res.status).toBe(400);
    });
  });
});
