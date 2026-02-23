import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getEvents } from "../api/v1/events/route";
import { GET as getEventBySlug } from "../api/v1/events/[slug]/route";
import { POST as postPublish } from "../api/v1/events/[slug]/publish/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e public events + hal", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("renders public events list and detail resources", async () => {
    const listResponse = await getEvents(new Request("http://localhost:3000/api/v1/events"));
    expect(listResponse.status).toBe(200);
    expect(listResponse.headers.get("content-type")).toContain("application/hal+json");

    const listBody = await listResponse.json();
    expect(listBody.count).toBeGreaterThanOrEqual(4);

    const detailResponse = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/published-open"),
      { params: Promise.resolve({ slug: "published-open" }) },
    );

    expect(detailResponse.status).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody.slug).toBe("published-open");
    expect(detailBody.status).toBe("PUBLISHED");
  });

  it("returns consistent problem details for missing public event", async () => {
    const response = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/bad-slug"),
      { params: Promise.resolve({ slug: "bad-slug" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/problem+json");

    const body = await response.json();
    expect(body.title).toBe("Not Found");
    expect(body.status).toBe(404);
    expect(body.request_id).toBeTruthy();
  });

  it("shows state-driven HAL affordances by event status", async () => {
    const draft = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/draft-event"),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );
    const draftBody = await draft.json();
    expect(draftBody.status).toBe("DRAFT");
    expect(draftBody._links["app:publish"]?.href).toBe("/api/v1/events/draft-event/publish");
    expect(draftBody._links["app:cancel"]).toBeFalsy();

    const published = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/published-open"),
      { params: Promise.resolve({ slug: "published-open" }) },
    );
    const publishedBody = await published.json();
    expect(publishedBody.status).toBe("PUBLISHED");
    expect(publishedBody._links["app:publish"]).toBeFalsy();
    expect(publishedBody._links["app:cancel"]?.href).toBe("/api/v1/events/published-open/cancel");

    const cancelled = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/cancelled-event"),
      { params: Promise.resolve({ slug: "cancelled-event" }) },
    );
    const cancelledBody = await cancelled.json();
    expect(cancelledBody.status).toBe("CANCELLED");
    expect(cancelledBody._links["app:publish"]).toBeFalsy();
    expect(cancelledBody._links["app:cancel"]).toBeFalsy();
  });

  it("executes publish via HAL href and removes publish affordance after transition", async () => {
    const draftResponse = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/draft-event"),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );
    const draftBody = await draftResponse.json();
    const publishHref = draftBody._links["app:publish"]?.href as string;

    expect(publishHref).toBe("/api/v1/events/draft-event/publish");

    const publishSlug = publishHref.split("/").at(-2) as string;
    const publishResponse = await postPublish(
      new Request(`http://localhost:3000${publishHref}`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: publishSlug }) },
    );

    expect(publishResponse.status).toBe(200);

    const postPublishView = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/draft-event"),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );
    const postPublishBody = await postPublishView.json();
    expect(postPublishBody.status).toBe("PUBLISHED");
    expect(postPublishBody._links["app:publish"]).toBeFalsy();
    expect(postPublishBody._links["app:cancel"]).toBeTruthy();
  });

  it("handles stale publish action gracefully and keeps HAL state authoritative", async () => {
    const draftResponse = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/draft-event"),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );
    const draftBody = await draftResponse.json();
    const stalePublishHref = draftBody._links["app:publish"]?.href as string;

    await postPublish(
      new Request(`http://localhost:3000${stalePublishHref}`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );

    const stalePublishAttempt = await postPublish(
      new Request(`http://localhost:3000${stalePublishHref}`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      }),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );

    expect(stalePublishAttempt.status).toBe(200);

    const refreshed = await getEventBySlug(
      new Request("http://localhost:3000/api/v1/events/draft-event"),
      { params: Promise.resolve({ slug: "draft-event" }) },
    );
    const refreshedBody = await refreshed.json();

    expect(refreshedBody.status).toBe("PUBLISHED");
    expect(refreshedBody._links["app:publish"]).toBeFalsy();
    expect(refreshedBody._links["app:cancel"]).toBeTruthy();
  });
});
