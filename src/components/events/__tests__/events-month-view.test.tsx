import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { EventsMonthView } from "@/components/events/events-month-view";
import type { EventListItemViewModel } from "@/lib/view-models/events";

const makeEvent = (id: string, title: string, startAt: string): EventListItemViewModel => ({
  id,
  slug: id,
  title,
  status: "PUBLISHED",
  statusLabel: "Published",
  startAt,
  endAt: startAt,
  timezone: "UTC",
  detailHref: `/events/${id}`,
});

describe("EventsMonthView", () => {
  it("renders month label and navigation buttons", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

    render(
      <EventsMonthView
        events={[makeEvent("1", "Workshop", "2026-03-15T10:00:00.000Z")]}
        monthKey="2026-03"
        onMonthChange={() => {}}
        loading={false}
      />,
    );

    expect(screen.getByText("March 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders day-of-week headers in desktop grid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));

    render(
      <EventsMonthView
        events={[]}
        monthKey="2026-03"
        onMonthChange={() => {}}
        loading={false}
      />,
    );

    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows loading state when loading", () => {
    render(
      <EventsMonthView
        events={[]}
        monthKey="2026-03"
        onMonthChange={() => {}}
        loading={true}
      />,
    );
    expect(screen.getByText("Loading events")).toBeInTheDocument();
  });
});
