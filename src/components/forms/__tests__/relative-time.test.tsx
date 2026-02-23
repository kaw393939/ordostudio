import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { RelativeTime } from "@/components/forms/relative-time";

describe("RelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 'just now' for timestamps less than 1 minute ago", () => {
    render(<RelativeTime iso="2026-06-15T11:59:30Z" />);
    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("shows '5 minutes ago' for 5 min past", () => {
    render(<RelativeTime iso="2026-06-15T11:55:00Z" />);
    expect(screen.getByText("5 minutes ago")).toBeInTheDocument();
  });

  it("shows '2 hours ago' for 2 hours past", () => {
    render(<RelativeTime iso="2026-06-15T10:00:00Z" />);
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("shows 'in 3 hours' for 3 hours in the future", () => {
    render(<RelativeTime iso="2026-06-15T15:00:00Z" />);
    expect(screen.getByText("in 3 hours")).toBeInTheDocument();
  });

  it("shows 'in 2 days' for 2 days in the future", () => {
    render(<RelativeTime iso="2026-06-17T12:00:00Z" />);
    expect(screen.getByText("in 2 days")).toBeInTheDocument();
  });

  it("falls back to compact date for > 7 days", () => {
    render(<RelativeTime iso="2026-06-01T12:00:00Z" />);
    // Should show a date like "Jun 1"
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
  });

  it("has a title/tooltip showing full absolute timestamp", () => {
    render(<RelativeTime iso="2026-06-15T11:55:00Z" />);
    const el = screen.getByText("5 minutes ago");
    expect(el).toHaveAttribute("title");
    expect(el.getAttribute("title")).toMatch(/Jun/);
  });

  it("uses <time> element with datetime attribute", () => {
    render(<RelativeTime iso="2026-06-15T11:55:00Z" />);
    const time = screen.getByText("5 minutes ago").closest("time");
    expect(time).toBeInTheDocument();
    expect(time).toHaveAttribute("dateTime", "2026-06-15T11:55:00Z");
  });

  it("auto-updates on 60-second interval", () => {
    render(<RelativeTime iso="2026-06-15T11:59:30Z" />);
    expect(screen.getByText("just now")).toBeInTheDocument();

    // Advance 90 seconds — the interval fires at 60s, Date.now() at 12:01:30
    // diff = 12:01:30 - 11:59:30 = 2 min, but interval callback ran at 60s
    // At 60s: Date.now()=12:01:00, diff = 90s → 1 minute ago
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("1 minute ago")).toBeInTheDocument();

    // Advance another 60s → 12:02:00 - 11:59:30 = 150s → 2 minutes ago
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("2 minutes ago")).toBeInTheDocument();
  });

  it("cleans up interval on unmount", () => {
    const clearSpy = vi.spyOn(global, "clearInterval");
    const { unmount } = render(
      <RelativeTime iso="2026-06-15T11:55:00Z" />
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
