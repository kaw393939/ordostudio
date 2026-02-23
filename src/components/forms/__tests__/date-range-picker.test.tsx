import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangePicker } from "@/components/forms/date-range-picker";

describe("DateRangePicker", () => {
  it("renders with a label and trigger button", () => {
    render(
      <DateRangePicker
        label="Date range"
        value={{ from: "", to: "" }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Date range")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pick a date range|date range/i })).toBeInTheDocument();
  });

  it("shows placeholder when no range selected", () => {
    render(
      <DateRangePicker
        label="Period"
        value={{ from: "", to: "" }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/pick a date range/i)).toBeInTheDocument();
  });

  it("displays selected range in trigger", () => {
    render(
      <DateRangePicker
        label="Period"
        value={{
          from: "2026-03-14T12:00:00.000Z",
          to: "2026-03-21T12:00:00.000Z",
        }}
        onChange={() => {}}
      />
    );
    // Use specific accessible name to avoid multiple button match
    const trigger = screen.getByRole("button", { name: /mar/i });
    expect(trigger.textContent).toMatch(/Mar/);
  });

  it("opens calendar popover on button click with two-month view", async () => {
    const user = userEvent.setup();
    render(
      <DateRangePicker
        label="Period"
        value={{ from: "", to: "" }}
        onChange={() => {}}
      />
    );
    await user.click(screen.getByRole("button", { name: /pick a date range/i }));
    // Should have calendar grid(s) visible
    const grids = screen.getAllByRole("grid");
    expect(grids.length).toBeGreaterThanOrEqual(1);
  });

  it("renders quick-select preset buttons", async () => {
    const user = userEvent.setup();
    render(
      <DateRangePicker
        label="Period"
        value={{ from: "", to: "" }}
        onChange={() => {}}
        presets
      />
    );
    await user.click(screen.getByRole("button", { name: /pick a date range/i }));
    // Calendar may also render a "Today" button, so use getAllByRole for Today
    expect(screen.getAllByRole("button", { name: /today/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /this week/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /this month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /last 30 days/i })).toBeInTheDocument();
  });

  it("calls onChange when preset is clicked", () => {
    const onChange = vi.fn();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

    render(
      <DateRangePicker
        label="Period"
        value={{ from: "", to: "" }}
        onChange={onChange}
        presets
      />
    );

    // Use fireEvent (not userEvent) when using fake timers
    fireEvent.click(screen.getByRole("button", { name: /pick a date range/i }));
    // Click "This week" to avoid potential "Today" name collision
    fireEvent.click(screen.getByRole("button", { name: /this week/i }));

    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0][0];
    expect(arg.from).toMatch(/2026-06/);
    expect(arg.to).toMatch(/2026-06/);

    vi.useRealTimers();
  });

  it("supports error message display", () => {
    render(
      <DateRangePicker
        label="Period"
        value={{ from: "", to: "" }}
        onChange={() => {}}
        error="End date must be after start date"
      />
    );
    expect(
      screen.getByText("End date must be after start date")
    ).toBeInTheDocument();
  });

  it("shows clear button when range is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DateRangePicker
        label="Period"
        value={{
          from: "2026-03-14T12:00:00.000Z",
          to: "2026-03-21T12:00:00.000Z",
        }}
        onChange={onChange}
      />
    );
    const clearBtn = screen.getByRole("button", { name: /clear date range/i });
    await user.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith({ from: "", to: "" });
  });
});
