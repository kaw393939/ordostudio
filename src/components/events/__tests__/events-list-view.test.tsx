import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { EventsListView } from "@/components/events/events-list-view";
import type { EventListItemViewModel } from "@/lib/view-models/events";

const makeEvent = (id: string, title: string): EventListItemViewModel => ({
  id,
  slug: id,
  title,
  status: "PUBLISHED",
  statusLabel: "Published",
  startAt: "2026-03-01T10:00:00.000Z",
  endAt: "2026-03-01T11:00:00.000Z",
  timezone: "UTC",
  detailHref: `/events/${id}`,
});

describe("EventsListView", () => {
  it("renders event cards for each event", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <EventsListView
        events={[makeEvent("1", "Alpha"), makeEvent("2", "Beta")]}
        page={1}
        pageSize={5}
        onPageChange={() => {}}
        loading={false}
        isFirstRender={false}
      />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders loading skeletons when loading", () => {
    const { container } = render(
      <EventsListView
        events={[]}
        page={1}
        pageSize={5}
        onPageChange={() => {}}
        loading={true}
        isFirstRender={false}
      />,
    );
    // Skeleton cards render inside a 3-col grid
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid!.children.length).toBeGreaterThanOrEqual(1);
  });

  it("disables Previous button on page 1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <EventsListView
        events={[makeEvent("1", "Test")]}
        page={1}
        pageSize={5}
        onPageChange={() => {}}
        loading={false}
        isFirstRender={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    vi.useRealTimers();
  });

  it("disables Next when fewer events than page size", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <EventsListView
        events={[makeEvent("1", "Test")]}
        page={1}
        pageSize={5}
        onPageChange={() => {}}
        loading={false}
        isFirstRender={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    vi.useRealTimers();
  });

  it("shows current page number", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));

    render(
      <EventsListView
        events={[makeEvent("1", "Test")]}
        page={3}
        pageSize={5}
        onPageChange={() => {}}
        loading={false}
        isFirstRender={false}
      />,
    );
    expect(screen.getByText("Page 3")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
