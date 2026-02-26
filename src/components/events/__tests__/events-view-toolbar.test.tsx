import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { EventsViewToolbar } from "@/components/events/events-view-toolbar";

describe("EventsViewToolbar", () => {
  const defaults: React.ComponentProps<typeof EventsViewToolbar> = {
    view: "list",
    onViewChange: vi.fn(),
    sort: "date-asc",
    onSortChange: vi.fn(),
  };

  it("renders view toggle buttons with aria-labels", () => {
    render(<EventsViewToolbar {...defaults} />);
    expect(screen.getByRole("radio", { name: "List view" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Calendar view" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Agenda view" })).toBeInTheDocument();
  });

  it("renders Submit report link", () => {
    render(<EventsViewToolbar {...defaults} />);
    expect(screen.getByRole("link", { name: "Submit report" })).toHaveAttribute("href", "/studio/report");
  });

  it("renders sort select with current value", () => {
    render(<EventsViewToolbar {...defaults} />);
    expect(screen.getByText("Earliest first")).toBeInTheDocument();
  });

  it("marks the active view toggle as pressed", () => {
    render(<EventsViewToolbar {...defaults} view="month" />);
    expect(screen.getByRole("radio", { name: "Calendar view" })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("radio", { name: "List view" })).toHaveAttribute("data-state", "off");
  });
});
