import { describe, expect, it } from "vitest";

import { getEventActionHrefs, toEventCreatePayload } from "../admin-events-view";

describe("admin events view helpers", () => {
  it("extracts publish/cancel links from HAL resources", () => {
    const links = getEventActionHrefs({
      _links: {
        self: { href: "/api/v1/events/test" },
        "app:publish": { href: "/api/v1/events/test/publish" },
      },
    });

    expect(links.publish).toBe("/api/v1/events/test/publish");
    expect(links.cancel).toBeNull();
  });

  it("builds create payload and parses capacity", () => {
    const payload = toEventCreatePayload({
      slug: " test-slug ",
      title: " Test Event ",
      start: "2026-07-01T10:00:00.000Z",
      end: "2026-07-01T11:00:00.000Z",
      timezone: "UTC",
      engagementType: "GROUP",
      deliveryMode: "HYBRID",
      locationText: " HQ ",
      meetingUrl: " https://meet.example.com/room ",
      capacity: "25",
    });

    expect(payload).toEqual({
      slug: "test-slug",
      title: "Test Event",
      start: "2026-07-01T10:00:00.000Z",
      end: "2026-07-01T11:00:00.000Z",
      timezone: "UTC",
      engagement_type: "GROUP",
      delivery_mode: "HYBRID",
      location_text: "HQ",
      meeting_url: "https://meet.example.com/room",
      capacity: 25,
    });
  });
});
