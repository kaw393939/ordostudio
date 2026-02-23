import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getDocs } from "../api/v1/docs/route";
import { GET as getEvents } from "../api/v1/events/route";
import { GET as getEventBySlug } from "../api/v1/events/[slug]/route";
import { GET as getRegistrations } from "../api/v1/events/[slug]/registrations/route";
import { GET as getApiRoot } from "../api/v1/route";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e api-foundation", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("serves api root as HAL with discoverable links", async () => {
    const response = await getApiRoot();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/hal+json");

    const body = await response.json();
    expect(body._links.self.href).toBe("/api/v1");
    expect(body._links.docs.href).toBe("/api/v1/docs");
    expect(body._links.events.href).toBe("/api/v1/events");
    expect(body._links.auth_login.href).toBe("/api/v1/auth/login");
  });

  it("serves docs endpoint with openapi payload", async () => {
    const response = await getDocs();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = await response.json();
    expect(body.openapi).toBeTruthy();
    expect(body.info).toBeTruthy();
    expect(body.paths).toBeTruthy();
  });

  it("returns problem details with request correlation on not-found resource", async () => {
    const request = new Request("http://localhost:3000/api/v1/events/does-not-exist");
    const response = await getEventBySlug(request, {
      params: Promise.resolve({ slug: "does-not-exist" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/problem+json");

    const body = await response.json();
    expect(body.type).toBeTruthy();
    expect(body.title).toBe("Not Found");
    expect(body.status).toBe(404);
    expect(body.detail).toBeTruthy();
    expect(body.instance).toBe("http://localhost:3000/api/v1/events/does-not-exist");
    expect(body.request_id).toBeTruthy();
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  it("keeps representative success/error media types consistent", async () => {
    const successResponse = await getEvents(new Request("http://localhost:3000/api/v1/events"));
    expect(successResponse.status).toBe(200);
    expect(successResponse.headers.get("content-type")).toContain("application/hal+json");

    const errorResponse = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/missing"),
      {
        params: Promise.resolve({ slug: "missing" }),
      },
    );

    expect(errorResponse.status).toBe(404);
    expect(errorResponse.headers.get("content-type")).toContain("application/problem+json");
  });

  it("provides deterministic baseline fixture resources", async () => {
    const published = await getEvents(
      new Request("http://localhost:3000/api/v1/events?status=PUBLISHED"),
    );
    const publishedBody = await published.json();
    const publishedSlugs = publishedBody.items.map((item: { slug: string }) => item.slug);

    expect(publishedSlugs).toContain("published-open");
    expect(publishedSlugs).toContain("published-full");

    const draft = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/draft-event"),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );
    expect(draft.status).toBe(200);

    const cancelled = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/cancelled-event"),
      { params: Promise.resolve({ slug: "cancelled-event" }) },
    );
    const cancelledBody = await cancelled.json();
    expect(cancelledBody.status).toBe("CANCELLED");

    const registrations = await getRegistrations(
      new Request("http://localhost:3000/api/v1/events/published-open/registrations", {
        headers: {
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "published-open" }) },
    );

    expect(registrations.status).toBe(200);
    const registrationsBody = await registrations.json();
    const userEntry = registrationsBody.items.find((item: { user_id: string }) => item.user_id === fixture.userId);
    expect(userEntry).toBeTruthy();
  });
});
