import { describe, expect, it } from "vitest";

import { buildGoogleCalendarUrl, buildIcsContent } from "@/lib/calendar-links";

describe("calendar-links", () => {
  it("buildGoogleCalendarUrl encodes title, dates, location, and details", () => {
    const url = buildGoogleCalendarUrl({
      title: "Demo Event",
      startIso: "2026-02-19T12:00:00.000Z",
      endIso: "2026-02-19T13:30:00.000Z",
      location: "Online",
      detailsUrl: "https://lms-219.dev/events/demo",
    });

    expect(url).toContain("https://calendar.google.com/calendar/render?");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Demo+Event");
    expect(url).toContain("location=Online");
    expect(url).toContain("details=https%3A%2F%2Flms-219.dev%2Fevents%2Fdemo");
    expect(url).toContain("dates=20260219T120000Z%2F20260219T133000Z");
  });

  it("buildIcsContent returns a VCALENDAR with DTSTART/DTEND, LOCATION and URL", () => {
    const ics = buildIcsContent({
      title: "Demo Event",
      startIso: "2026-02-19T12:00:00.000Z",
      endIso: "2026-02-19T13:30:00.000Z",
      location: "HQ; Room 1",
      detailsUrl: "https://lms-219.dev/events/demo",
    });

    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("DTSTART:20260219T120000Z\r\n");
    expect(ics).toContain("DTEND:20260219T133000Z\r\n");
    expect(ics).toContain("SUMMARY:Demo Event\r\n");
    expect(ics).toContain("LOCATION:HQ\\; Room 1\r\n");
    expect(ics).toContain("URL:https://lms-219.dev/events/demo\r\n");
    expect(ics).toContain("END:VEVENT\r\nEND:VCALENDAR");
  });
});
