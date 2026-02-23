"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/ui/index";

export type TimePickerProps = {
  /** Visible label text */
  label: string;
  /** Value in "HH:mm" 24h format, or "" for empty */
  value: string;
  /** Called with "HH:mm" 24h format string */
  onChange: (time: string) => void;
  /** Use 24-hour format instead of 12h with AM/PM */
  use24Hour?: boolean;
  /** Minute step interval (default: 15) */
  minuteStep?: number;
  /** Error message to display */
  error?: string;
  /** Additional className for the wrapper */
  className?: string;
};

function parse12h(value: string): { hour12: number; minute: number; ampm: "AM" | "PM" } {
  if (!value) return { hour12: 12, minute: 0, ampm: "AM" };
  const [hStr, mStr] = value.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour12: h, minute: m, ampm };
}

function to24h(hour12: number, minute: number, ampm: "AM" | "PM"): string {
  let h = hour12;
  if (ampm === "AM" && h === 12) h = 0;
  else if (ampm === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Time picker with hour and minute select dropdowns.
 * Supports 12h (with AM/PM) and 24h modes.
 * Minute options in configurable increments (default 15).
 */
export function TimePicker({
  label,
  value,
  onChange,
  use24Hour = false,
  minuteStep = 15,
  error,
  className,
}: TimePickerProps) {
  const step = Math.max(1, Math.min(60, minuteStep));

  // Parse current value
  const parsed24h = value ? { hour: parseInt(value.split(":")[0], 10), minute: parseInt(value.split(":")[1], 10) } : null;
  const { hour12, ampm } = parse12h(value);

  // Generate minute options
  const minuteOptions: number[] = [];
  for (let m = 0; m < 60; m += step) {
    minuteOptions.push(m);
  }

  function handleHourChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newHour = parseInt(e.target.value, 10);
    const currentMinute = parsed24h?.minute ?? 0;
    if (use24Hour) {
      onChange(`${String(newHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`);
    } else {
      const currentAmpm = parsed24h ? ampm : "AM";
      onChange(to24h(newHour, currentMinute, currentAmpm));
    }
  }

  function handleMinuteChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newMinute = parseInt(e.target.value, 10);
    if (use24Hour) {
      const currentHour = parsed24h?.hour ?? 0;
      onChange(`${String(currentHour).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`);
    } else {
      const currentHour12 = parsed24h ? hour12 : 12;
      const currentAmpm = parsed24h ? ampm : "AM";
      onChange(to24h(currentHour12, newMinute, currentAmpm));
    }
  }

  function handleAmpmChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newAmpm = e.target.value as "AM" | "PM";
    const currentHour12 = parsed24h ? hour12 : 12;
    const currentMinute = parsed24h?.minute ?? 0;
    onChange(to24h(currentHour12, currentMinute, newAmpm));
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        {/* Hour select */}
        <select
          aria-label="Hour"
          className={cn(selectClass, "w-16")}
          value={use24Hour ? (parsed24h?.hour ?? "") : (parsed24h ? hour12 : "")}
          onChange={handleHourChange}
        >
          {!parsed24h && <option value="">--</option>}
          {use24Hour
            ? Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}
                </option>
              ))
            : Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
        </select>

        <span className="text-muted-foreground font-medium">:</span>

        {/* Minute select */}
        <select
          aria-label="Minute"
          className={cn(selectClass, "w-16")}
          value={parsed24h?.minute ?? ""}
          onChange={handleMinuteChange}
        >
          {!parsed24h && <option value="">--</option>}
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>

        {/* AM/PM select (12h mode only) */}
        {!use24Hour && (
          <select
            aria-label="AM/PM"
            className={cn(selectClass, "w-16")}
            value={parsed24h ? ampm : ""}
            onChange={handleAmpmChange}
          >
            {!parsed24h && <option value="">--</option>}
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
