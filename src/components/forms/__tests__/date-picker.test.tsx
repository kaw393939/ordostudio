import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "@/components/forms/date-picker";

describe("DatePicker", () => {
  it("renders with a label and trigger button", () => {
    render(<DatePicker label="Start date" value="" onChange={() => {}} />);
    expect(screen.getByText("Start date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pick a date|start date/i })).toBeInTheDocument();
  });

  it("shows placeholder text when no value selected", () => {
    render(<DatePicker label="Event date" value="" onChange={() => {}} />);
    expect(screen.getByText(/pick a date/i)).toBeInTheDocument();
  });

  it("displays the selected date when value is set", () => {
    render(
      <DatePicker
        label="Event date"
        value="2026-03-14T12:00:00.000Z"
        onChange={() => {}}
      />
    );
    // The button should show a formatted date containing "Mar" and "14"
    const trigger = screen.getByRole("button", { name: /mar.*14/i });
    expect(trigger).toBeInTheDocument();
  });

  it("opens calendar popover on button click", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Start date" value="" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: /pick a date|start date/i });
    await user.click(trigger);
    // Calendar should be visible
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("calls onChange when a day is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePicker
        label="Start date"
        value="2026-03-14T12:00:00.000Z"
        onChange={onChange}
      />
    );
    const trigger = screen.getByRole("button", { name: /mar.*14/i });
    await user.click(trigger);
    // Click day 20 in the calendar
    const day20 = screen.getByRole("gridcell", { name: "20" });
    const btn = day20.querySelector("button") ?? day20;
    await user.click(btn);
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0][0];
    expect(arg).toMatch(/2026-03-20/);
  });

  it("shows clear button when value is set and clears on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePicker
        label="Event date"
        value="2026-03-14T12:00:00.000Z"
        onChange={onChange}
      />
    );
    const clearBtn = screen.getByRole("button", { name: /clear/i });
    await user.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("disables dates before min", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        label="Start date"
        value="2026-03-14T12:00:00.000Z"
        onChange={() => {}}
        min="2026-03-10T12:00:00.000Z"
      />
    );
    const trigger = screen.getByRole("button", { name: /mar/i });
    await user.click(trigger);
    // Day 5 should be disabled
    const day5Cell = screen.getByRole("gridcell", { name: "5" });
    const day5Button = day5Cell.querySelector("button");
    expect(day5Button).toHaveAttribute("disabled");
  });

  it("disables dates after max", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        label="Start date"
        value="2026-03-14T12:00:00.000Z"
        onChange={() => {}}
        max="2026-03-20T12:00:00.000Z"
      />
    );
    const trigger = screen.getByRole("button", { name: /mar/i });
    await user.click(trigger);
    // Day 25 should be disabled
    const day25Cell = screen.getByRole("gridcell", { name: "25" });
    const day25Button = day25Cell.querySelector("button");
    expect(day25Button).toHaveAttribute("disabled");
  });

  it("accepts an id prop for form integration", () => {
    render(
      <DatePicker
        id="event-start"
        label="Start date"
        value=""
        onChange={() => {}}
      />
    );
    const trigger = screen.getByRole("button", { name: /pick a date|start date/i });
    expect(trigger.id).toBe("event-start");
  });

  it("supports error message display", () => {
    render(
      <DatePicker
        label="Date"
        value=""
        onChange={() => {}}
        error="Please enter a valid date"
      />
    );
    expect(screen.getByText("Please enter a valid date")).toBeInTheDocument();
  });
});
