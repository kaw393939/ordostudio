import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateTimePicker } from "@/components/forms/date-time-picker";

describe("DateTimePicker", () => {
  it("renders with a label, date picker trigger, and time selects", () => {
    render(
      <DateTimePicker label="Event start" value="" onChange={() => {}} />
    );
    expect(screen.getByText("Event start")).toBeInTheDocument();
    // DatePicker trigger
    expect(
      screen.getByRole("button", { name: /pick a date/i })
    ).toBeInTheDocument();
    // TimePicker selects
    expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    expect(screen.getByLabelText("Minute")).toBeInTheDocument();
  });

  it("displays full ISO datetime value split into date and time", () => {
    render(
      <DateTimePicker
        label="Event start"
        value="2026-03-14T14:30:00.000Z"
        onChange={() => {}}
      />
    );
    // Date part visible in trigger (timezone-dependent, just check Mar is there)
    const trigger = screen.getByRole("button", { name: /mar/i });
    expect(trigger).toBeInTheDocument();
    // Time part: 14:30 UTC might display differently by local TZ,
    // but the Hour and Minute selects should have values
    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;
    expect(hourSelect.value).not.toBe("");
    expect(minuteSelect.value).not.toBe("");
  });

  it("calls onChange with combined ISO when time changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DateTimePicker
        label="Event start"
        value="2026-03-14T14:30:00.000Z"
        onChange={onChange}
      />
    );
    const minuteSelect = screen.getByLabelText("Minute");
    await user.selectOptions(minuteSelect, "45");
    expect(onChange).toHaveBeenCalled();
    // Should be a valid ISO string
    const result = onChange.mock.calls[0][0];
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("shows error when date is set but time is missing", () => {
    render(
      <DateTimePicker
        label="Start"
        value=""
        onChange={() => {}}
        error="Both date and time are required"
      />
    );
    expect(
      screen.getByText("Both date and time are required")
    ).toBeInTheDocument();
  });

  it("supports min/max constraints passed to date picker", async () => {
    const user = userEvent.setup();
    render(
      <DateTimePicker
        label="Start"
        value="2026-03-14T12:00:00.000Z"
        onChange={() => {}}
        minDate="2026-03-10T00:00:00.000Z"
        maxDate="2026-03-20T00:00:00.000Z"
      />
    );
    // Open calendar
    const trigger = screen.getByRole("button", { name: /mar/i });
    await user.click(trigger);
    // Day 5 should be disabled
    const day5Cell = screen.getByRole("gridcell", { name: "5" });
    const day5Button = day5Cell.querySelector("button");
    expect(day5Button).toHaveAttribute("disabled");
  });

  it("accepts use24Hour prop for time picker", () => {
    render(
      <DateTimePicker
        label="Start"
        value="2026-03-14T14:30:00.000Z"
        onChange={() => {}}
        use24Hour
      />
    );
    // In 24h mode, no AM/PM select
    expect(screen.queryByLabelText("AM/PM")).not.toBeInTheDocument();
    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    // Value depends on timezone display but should be a 24h value
    expect(parseInt(hourSelect.value, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(hourSelect.value, 10)).toBeLessThan(24);
  });
});
