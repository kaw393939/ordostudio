import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";

import { EventsFilterBar, computeQuickFilterDates } from "@/components/events/events-filter-bar";

const noop = () => {};

function renderBar(overrides: Partial<React.ComponentProps<typeof EventsFilterBar>> = {}) {
  const defaults: React.ComponentProps<typeof EventsFilterBar> = {
    searchQuery: "",
    onSearchChange: noop,
    onSearchSubmit: noop,
    dateRange: { from: "", to: "" },
    onDateRangeChange: noop,
    status: "upcoming",
    onStatusChange: noop,
    onQuickFilter: noop,
    ...overrides,
  };
  return render(<EventsFilterBar {...defaults} />);
}

describe("EventsFilterBar", () => {
  it("renders search input and Filters button", () => {
    renderBar();
    expect(screen.getByPlaceholderText("Search events...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filters/i })).toBeInTheDocument();
  });

  it("does not show filter panel by default", () => {
    renderBar();
    // Collapsible content is removed from DOM when closed
    expect(screen.queryByRole("region", { name: /event filters/i })).not.toBeInTheDocument();
  });

  it("shows filter panel when Filters button is clicked", () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: /Filters/i }));
    expect(screen.getByRole("region", { name: /event filters/i })).toBeVisible();
  });

  it("calls onSearchSubmit when form is submitted", () => {
    const onSearchSubmit = vi.fn();
    renderBar({ onSearchSubmit });
    fireEvent.submit(screen.getByPlaceholderText("Search events...").closest("form")!);
    expect(onSearchSubmit).toHaveBeenCalledOnce();
  });

  it("calls onSearchChange when input value changes", () => {
    const onSearchChange = vi.fn();
    renderBar({ onSearchChange });
    fireEvent.change(screen.getByPlaceholderText("Search events..."), { target: { value: "test" } });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  it("shows badge count when non-default filters are active", () => {
    renderBar({ status: "all" });
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows badge count 2 when date range and status are both non-default", () => {
    renderBar({ status: "all", dateRange: { from: "2026-01-01", to: "2026-02-01" } });
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows no badge when all filters are default", () => {
    renderBar();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("calls onQuickFilter with correct preset", () => {
    const onQuickFilter = vi.fn();
    renderBar({ onQuickFilter });
    // Open filters panel first
    fireEvent.click(screen.getByRole("button", { name: /Filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    expect(onQuickFilter).toHaveBeenCalledWith("this-week");
  });
});

describe("computeQuickFilterDates", () => {
  it("returns empty strings for 'clear'", () => {
    const result = computeQuickFilterDates("clear");
    expect(result.from).toBe("");
    expect(result.to).toBe("");
  });

  it("returns upcoming status for 'upcoming'", () => {
    const result = computeQuickFilterDates("upcoming");
    expect(result.status).toBe("upcoming");
    expect(result.from).toBe("");
    expect(result.to).toBe("");
  });

  it("returns valid ISO dates for 'this-week'", () => {
    const result = computeQuickFilterDates("this-week");
    expect(result.from).toBeTruthy();
    expect(result.to).toBeTruthy();
    expect(new Date(result.to).getTime()).toBeGreaterThan(new Date(result.from).getTime());
  });

  it("returns valid ISO dates for 'this-month'", () => {
    const result = computeQuickFilterDates("this-month");
    expect(result.from).toBeTruthy();
    expect(result.to).toBeTruthy();
  });
});
