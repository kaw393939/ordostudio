import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimePicker } from "@/components/forms/time-picker";

describe("TimePicker", () => {
  it("renders with a label and hour/minute selects", () => {
    render(<TimePicker label="Start time" value="" onChange={() => {}} />);
    expect(screen.getByText("Start time")).toBeInTheDocument();
    expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    expect(screen.getByLabelText("Minute")).toBeInTheDocument();
  });

  it("shows 12h format with AM/PM toggle by default", () => {
    render(<TimePicker label="Time" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("AM/PM")).toBeInTheDocument();
  });

  it("shows 24h format when use24Hour is true", () => {
    render(
      <TimePicker label="Time" value="" onChange={() => {}} use24Hour />
    );
    expect(screen.queryByLabelText("AM/PM")).not.toBeInTheDocument();
  });

  it("displays the given time value correctly in 12h format", () => {
    render(
      <TimePicker label="Time" value="14:30" onChange={() => {}} />
    );
    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;
    const ampmSelect = screen.getByLabelText("AM/PM") as HTMLSelectElement;
    expect(hourSelect.value).toBe("2");
    expect(minuteSelect.value).toBe("30");
    expect(ampmSelect.value).toBe("PM");
  });

  it("displays the given time value correctly in 24h format", () => {
    render(
      <TimePicker label="Time" value="14:30" onChange={() => {}} use24Hour />
    );
    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;
    expect(hourSelect.value).toBe("14");
    expect(minuteSelect.value).toBe("30");
  });

  it("calls onChange with HH:mm when hour changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TimePicker label="Time" value="09:00" onChange={onChange} />
    );
    const hourSelect = screen.getByLabelText("Hour");
    await user.selectOptions(hourSelect, "10");
    expect(onChange).toHaveBeenCalledWith("10:00");
  });

  it("calls onChange with HH:mm when minute changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TimePicker label="Time" value="09:00" onChange={onChange} />
    );
    const minuteSelect = screen.getByLabelText("Minute");
    await user.selectOptions(minuteSelect, "30");
    expect(onChange).toHaveBeenCalledWith("09:30");
  });

  it("calls onChange when AM/PM toggles", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TimePicker label="Time" value="09:00" onChange={onChange} />
    );
    const ampmSelect = screen.getByLabelText("AM/PM");
    await user.selectOptions(ampmSelect, "PM");
    expect(onChange).toHaveBeenCalledWith("21:00");
  });

  it("provides smart default with roundToQuarter when value is empty and user picks hour", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TimePicker label="Time" value="" onChange={onChange} />
    );
    const hourSelect = screen.getByLabelText("Hour");
    await user.selectOptions(hourSelect, "9");
    // Should call with 09:00 (defaults minute to 00)
    expect(onChange).toHaveBeenCalledWith("09:00");
  });

  it("generates minute options in 15-minute increments by default", () => {
    render(<TimePicker label="Time" value="09:00" onChange={() => {}} />);
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;
    const options = Array.from(minuteSelect.options).map((o) => o.value);
    expect(options).toEqual(["0", "15", "30", "45"]);
  });

  it("accepts minuteStep to customize increments", () => {
    render(
      <TimePicker label="Time" value="09:00" onChange={() => {}} minuteStep={5} />
    );
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;
    const options = Array.from(minuteSelect.options).map((o) => o.value);
    expect(options).toEqual(["0", "5", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
  });

  it("supports error message display", () => {
    render(
      <TimePicker
        label="Time"
        value=""
        onChange={() => {}}
        error="Please select a time"
      />
    );
    expect(screen.getByText("Please select a time")).toBeInTheDocument();
  });
});
