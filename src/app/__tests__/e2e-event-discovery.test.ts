import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getEvents } from "../api/v1/events/route";
import { POST as postEvent } from "../api/v1/events/route";
import { POST as postPublish } from "../api/v1/events/[slug]/publish/route";
import { GET as getEventIcs } from "../api/v1/events/[slug]/ics/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e event discovery", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("supports title search with stable pagination", async () => {
    const created = [
      { slug: "summit-alpha", title: "Summit Alpha", day: "05" },
      { slug: "summit-beta", title: "Summit Beta", day: "06" },
      { slug: "summit-gamma", title: "Summit Gamma", day: "07" },
    ];

    for (const item of created) {
      const create = await postEvent(
        new Request("http://localhost:3000/api/v1/events", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
          body: JSON.stringify({
            slug: item.slug,
            title: item.title,
            start: `2026-10-${item.day}T10:00:00.000Z`,
            end: `2026-10-${item.day}T11:00:00.000Z`,
            timezone: "UTC",
            capacity: 20,
          }),
        }),
      );
      expect(create.status).toBe(201);

      const publish = await postPublish(
        new Request(`http://localhost:3000/api/v1/events/${item.slug}/publish`, {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            cookie: fixture.adminCookie,
          },
        }),
        { params: Promise.resolve({ slug: item.slug }) },
      );
      expect(publish.status).toBe(200);
    }

    const firstPage = await getEvents(
      new Request("http://localhost:3000/api/v1/events?q=Summit&limit=2&offset=0"),
    );
    expect(firstPage.status).toBe(200);
    const firstPageBody = await firstPage.json();
    expect(firstPageBody.items).toHaveLength(2);
    expect(
      firstPageBody.items.every((item: { title: string }) => item.title.toLowerCase().includes("summit")),
    ).toBe(true);

    const secondPage = await getEvents(
      new Request("http://localhost:3000/api/v1/events?q=Summit&limit=2&offset=2"),
    );
    expect(secondPage.status).toBe(200);
    const secondPageBody = await secondPage.json();
    expect(secondPageBody.items).toHaveLength(1);
    expect(secondPageBody.items[0].title).toContain("Summit");

    const pageOneIds = new Set(firstPageBody.items.map((item: { id: string }) => item.id));
    expect(pageOneIds.has(secondPageBody.items[0].id)).toBe(false);
  });

  it("exports timezone-correct ICS event data", async () => {
    const response = await getEventIcs(
      new Request("http://localhost:3000/api/v1/events/published-open/ics"),
      { params: Promise.resolve({ slug: "published-open" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");

    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("SUMMARY:Published Open");
    expect(body).toContain("DTSTART:20260901T100000Z");
    expect(body).toContain("DTEND:20260901T110000Z");
  });
});
