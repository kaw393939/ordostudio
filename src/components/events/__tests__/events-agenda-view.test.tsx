import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { EventsAgendaView } from "@/components/events/events-agenda-view";
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

describe("EventsAgendaView", () => {
  it("renders date groups with event titles", () => {
    render(
      <EventsAgendaView
        events={[
          makeEvent("1", "Morning Session", "2026-03-05T10:00:00.000Z"),
          makeEvent("2", "Afternoon Session", "2026-03-05T14:00:00.000Z"),
        ]}
        loading={false}
      />,
    );
    expect(screen.getByText("Morning Session")).toBeInTheDocument();
    expect(screen.getByText("Afternoon Session")).toBeInTheDocument();
  });

  it("renders View links for each event", () => {
    render(
      <EventsAgendaView
        events={[makeEvent("1", "Test Event", "2026-03-05T10:00:00.000Z")]}
        loading={false}
      />,
    );
    const link = screen.getByRole("link", { name: "View" });
    expect(link).toHaveAttribute("href", "/events/1");
  });

  it("shows loading state when loading", () => {
    render(<EventsAgendaView events={[]} loading={true} />);
    expect(screen.getByText("Loading events")).toBeInTheDocument();
  });
});
