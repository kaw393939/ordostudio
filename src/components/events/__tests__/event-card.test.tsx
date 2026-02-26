import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { EventCard, resolveStatusPill, type EventCardModel } from "@/components/events/event-card";

describe("EventCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const baseModel: EventCardModel = {
    id: "evt_1",
    slug: "demo",
    title: "Demo Event",
    status: "PUBLISHED",
    startAt: "2026-03-01T10:00:00.000Z",
    endAt: "2026-03-01T11:00:00.000Z",
    timezone: "America/New_York",
    detailHref: "/events/demo",
    locationText: "HQ",
    meetingUrl: null,
  };

  it("renders title and primary date range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(<EventCard model={baseModel} />);
    expect(screen.getByText("Demo Event")).toBeInTheDocument();
    expect(screen.getByText(/Sun, Mar 1 ·/)).toBeInTheDocument();
  });

  it("renders exactly 3 visual lines: date, title, status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(<EventCard model={baseModel} />);
    // Title link
    expect(screen.getByRole("link", { name: "Demo Event" })).toBeInTheDocument();
    // Status pill present
    expect(screen.getByText("Open")).toBeInTheDocument();
    // Description, timezone, location, capability should NOT be rendered
    expect(screen.queryByText("HQ")).not.toBeInTheDocument();
    expect(screen.queryByText(/America\/New_York/)).not.toBeInTheDocument();
  });

  it("shows Closing Soon when starting within 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-26T12:00:00.000Z"));

    render(<EventCard model={{ ...baseModel, startAt: "2026-03-01T10:00:00.000Z" }} />);
    expect(screen.getByText("Closing Soon")).toBeInTheDocument();
  });

  it("shows In Progress when between start and end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:30:00.000Z"));

    render(<EventCard model={baseModel} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows Closed for cancelled events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(<EventCard model={{ ...baseModel, status: "CANCELLED" }} />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows Closed for past events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00.000Z"));

    render(<EventCard model={baseModel} />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows Free badge for community events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <EventCard
        model={{
          ...baseModel,
          metadataJson: JSON.stringify({ category: "COMMUNITY" }),
        }}
      />,
    );
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("does not show Free badge for non-community events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(<EventCard model={baseModel} />);
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });
});

describe("resolveStatusPill", () => {
  const base = {
    status: "PUBLISHED",
    startAt: "2026-03-01T10:00:00.000Z",
    endAt: "2026-03-01T11:00:00.000Z",
  };

  it("returns Open when event is more than 7 days away", () => {
    const pill = resolveStatusPill(base, new Date("2026-02-10T12:00:00.000Z").getTime());
    expect(pill.label).toBe("Open");
  });

  it("returns Closing Soon when within 7 days", () => {
    const pill = resolveStatusPill(base, new Date("2026-02-26T12:00:00.000Z").getTime());
    expect(pill.label).toBe("Closing Soon");
  });

  it("returns In Progress during event", () => {
    const pill = resolveStatusPill(base, new Date("2026-03-01T10:30:00.000Z").getTime());
    expect(pill.label).toBe("In Progress");
  });

  it("returns Closed after event ends", () => {
    const pill = resolveStatusPill(base, new Date("2026-03-01T12:00:00.000Z").getTime());
    expect(pill.label).toBe("Closed");
  });

  it("returns Closed for CANCELLED status regardless of time", () => {
    const pill = resolveStatusPill({ ...base, status: "CANCELLED" }, new Date("2026-02-10T12:00:00.000Z").getTime());
    expect(pill.label).toBe("Closed");
  });
});
