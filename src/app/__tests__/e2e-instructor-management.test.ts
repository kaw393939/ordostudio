// @vitest-environment node

/**
 * E2E: Instructor Management — PRD-13
 *
 * Tests /api/v1/instructors (create / list) and
 * /api/v1/events/[slug]/instructor (GET / PATCH).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { GET as getInstructors, POST as postInstructor } from "../api/v1/instructors/route";
import {
  GET as getEventInstructor,
  PATCH as patchEventInstructor,
} from "../api/v1/events/[slug]/instructor/route";

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

const withSlug = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("e2e: instructor management", () => {
  let createdInstructorId: string; // eslint-disable-line @typescript-eslint/no-unused-vars

  // ── Instructor CRUD ────────────────────────────────

  it("GET /instructors — unauthenticated returns 401", async () => {
    const res = await getInstructors(new Request("http://localhost:3000/api/v1/instructors"));
    expect(res.status).toBe(401);
  });

  it("GET /instructors — non-admin returns 403", async () => {
    const res = await getInstructors(
      new Request("http://localhost:3000/api/v1/instructors", {
        headers: { cookie: fx.userCookie },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST /instructors — admin creates instructor", async () => {
    const res = await postInstructor(
      adminRequest("http://localhost:3000/api/v1/instructors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Alice Smith",
          email: "alice@instructors.example",
          status: "ACTIVE",
          capabilities: ["facilitation", "coaching"],
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string; _links: Record<string, unknown> };
    expect(body).toHaveProperty("id");
    expect(body.name).toBe("Alice Smith");
    createdInstructorId = body.id;
  });

  it("GET /instructors — lists instructors", async () => {
    const res = await getInstructors(adminRequest("http://localhost:3000/api/v1/instructors"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { count: number; items: { name: string }[] };
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.items.some((i) => i.name === "Alice Smith")).toBe(true);
  });

  it("POST /instructors — CSRF violation returns 403", async () => {
    const res = await postInstructor(
      new Request("http://localhost:3000/api/v1/instructors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: fx.adminCookie,
          origin: "https://evil.example.com",
        },
        body: JSON.stringify({
          name: "Bob",
          email: "bob@test.example",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  // ── Event Instructor Assignment ────────────────────

  it("GET /events/:slug/instructor — returns assignment state", async () => {
    const res = await getEventInstructor(
      adminRequest("http://localhost:3000/api/v1/events/published-open/instructor"),
      withSlug("published-open"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("_links");
  });

  it("GET /events/:slug/instructor — 404 for unknown event", async () => {
    const res = await getEventInstructor(
      adminRequest("http://localhost:3000/api/v1/events/nonexistent/instructor"),
      withSlug("nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  it("PATCH /events/:slug/instructor — transitions to TBA", async () => {
    const res = await patchEventInstructor(
      adminRequest("http://localhost:3000/api/v1/events/published-open/instructor", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state: "TBA",
          note: "Resetting instructor assignment",
        }),
      }),
      withSlug("published-open"),
    );

    expect([200, 201]).toContain(res.status);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("_links");
  });

  it("PATCH /events/:slug/instructor — unauthenticated returns 401", async () => {
    const res = await patchEventInstructor(
      new Request("http://localhost:3000/api/v1/events/published-open/instructor", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ state: "REQUESTED" }),
      }),
      withSlug("published-open"),
    );
    expect(res.status).toBe(401);
  });
});
