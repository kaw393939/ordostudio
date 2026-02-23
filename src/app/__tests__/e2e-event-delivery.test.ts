// @vitest-environment node

/**
 * E2E: Event Delivery — PRD-13
 *
 * Tests event-attached routes: ICS export, session outcomes,
 * artifacts, follow-up reminders, and instructor assignment.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { GET as getIcs } from "../api/v1/events/[slug]/ics/route";
import { POST as postOutcome } from "../api/v1/events/[slug]/outcomes/route";
import { POST as postArtifact } from "../api/v1/events/[slug]/artifacts/route";
import { POST as postReminders } from "../api/v1/events/[slug]/follow-up/reminders/route";

let fx: StandardE2EFixture;

beforeAll(async () => {
  fx = await setupStandardE2EFixture();
}, 30_000);

afterAll(async () => {
  await cleanupStandardE2EFixtures();
});

const withSlug = (slug: string) => ({ params: Promise.resolve({ slug }) });

const adminRequest = (url: string, init?: RequestInit) =>
  new Request(url, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: fx.adminCookie,
      origin: "http://localhost:3000",
    },
  });

describe("e2e: event delivery", () => {
  // ── ICS Export ─────────────────────────────────────

  describe("ICS export", () => {
    it("GET /events/:slug/ics — returns text/calendar", async () => {
      const res = await getIcs(
        new Request("http://localhost:3000/api/v1/events/published-open/ics"),
        withSlug("published-open"),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/calendar");
    });

    it("GET /events/:slug/ics — body starts with BEGIN:VCALENDAR", async () => {
      const res = await getIcs(
        new Request("http://localhost:3000/api/v1/events/published-open/ics"),
        withSlug("published-open"),
      );

      const body = await res.text();
      expect(body).toContain("BEGIN:VCALENDAR");
      expect(body).toContain("END:VCALENDAR");
    });

    it("GET /events/:slug/ics — includes content-disposition with filename", async () => {
      const res = await getIcs(
        new Request("http://localhost:3000/api/v1/events/published-open/ics"),
        withSlug("published-open"),
      );

      const cd = res.headers.get("content-disposition") ?? "";
      expect(cd).toContain("published-open.ics");
    });

    it("GET /events/:slug/ics — 404 for unknown slug", async () => {
      const res = await getIcs(
        new Request("http://localhost:3000/api/v1/events/no-such-event/ics"),
        withSlug("no-such-event"),
      );
      expect(res.status).toBe(404);
    });
  });

  // ── Session Outcomes ───────────────────────────────

  describe("outcomes", () => {
    it("POST — unauthenticated returns 401", async () => {
      const res = await postOutcome(
        new Request("http://localhost:3000/api/v1/events/published-open/outcomes", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({ summary: "Great session" }),
        }),
        withSlug("published-open"),
      );
      expect(res.status).toBe(401);
    });

    it("POST — admin creates session outcome", async () => {
      const res = await postOutcome(
        adminRequest("http://localhost:3000/api/v1/events/published-open/outcomes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: "Session 1",
            session_at: "2026-09-01T10:00:00.000Z",
            summary: "Deep dive into architecture patterns",
            status: "DELIVERED",
            outcomes: ["Understood hexagonal architecture"],
            action_items: [
              { description: "Refactor adapters layer", due_at: "2026-10-01" },
            ],
          }),
        }),
        withSlug("published-open"),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("_links");
    });

    it("POST — 404 for unknown event slug", async () => {
      const res = await postOutcome(
        adminRequest("http://localhost:3000/api/v1/events/no-event/outcomes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ summary: "x" }),
        }),
        withSlug("no-event"),
      );
      expect(res.status).toBe(404);
    });
  });

  // ── Artifacts ──────────────────────────────────────

  describe("artifacts", () => {
    it("POST — admin creates artifact", async () => {
      const res = await postArtifact(
        adminRequest("http://localhost:3000/api/v1/events/published-open/artifacts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: "Slide Deck",
            resource_url: "https://slides.example/deck-1",
            scope: "EVENT",
          }),
        }),
        withSlug("published-open"),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("_links");
    });

    it("POST — unauthenticated returns 401", async () => {
      const res = await postArtifact(
        new Request("http://localhost:3000/api/v1/events/published-open/artifacts", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({ title: "x" }),
        }),
        withSlug("published-open"),
      );
      expect(res.status).toBe(401);
    });

    it("POST — 404 for unknown event", async () => {
      const res = await postArtifact(
        adminRequest("http://localhost:3000/api/v1/events/no-event/artifacts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "x" }),
        }),
        withSlug("no-event"),
      );
      expect(res.status).toBe(404);
    });
  });

  // ── Follow-up Reminders ────────────────────────────

  describe("follow-up reminders", () => {
    it("POST — admin generates reminders", async () => {
      const res = await postReminders(
        adminRequest("http://localhost:3000/api/v1/events/published-open/follow-up/reminders", {
          method: "POST",
        }),
        withSlug("published-open"),
      );

      // 200 OK (idempotent generation)
      expect([200, 201]).toContain(res.status);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("_links");
    });

    it("POST — unauthenticated returns 401", async () => {
      const res = await postReminders(
        new Request("http://localhost:3000/api/v1/events/published-open/follow-up/reminders", {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
        withSlug("published-open"),
      );
      expect(res.status).toBe(401);
    });

    it("POST — non-admin returns 403", async () => {
      const res = await postReminders(
        new Request("http://localhost:3000/api/v1/events/published-open/follow-up/reminders", {
          method: "POST",
          headers: {
            cookie: fx.userCookie,
            origin: "http://localhost:3000",
          },
        }),
        withSlug("published-open"),
      );
      expect(res.status).toBe(403);
    });
  });
});
