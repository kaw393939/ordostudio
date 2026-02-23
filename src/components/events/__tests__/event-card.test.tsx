import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { EventCard, type EventCardModel } from "@/components/events/event-card";

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
});
