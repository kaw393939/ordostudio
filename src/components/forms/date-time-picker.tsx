"use client";

import * as React from "react";
import { DatePicker } from "@/components/forms/date-picker";
import { TimePicker } from "@/components/forms/time-picker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/ui/index";
import { parseISO } from "@/lib/date-time";

export type DateTimePickerProps = {
  /** Visible label text */
  label: string;
  /** Full UTC ISO string value, or "" */
  value: string;
  /** Called with UTC ISO string */
  onChange: (iso: string) => void;
  /** Min date constraint (ISO) */
  minDate?: string;
  /** Max date constraint (ISO) */
  maxDate?: string;
  /** Use 24-hour time format */
  use24Hour?: boolean;
  /** Error message */
  error?: string;
  /** Additional className */
  className?: string;
};

/**
 * Compound date + time picker.
 * Splits a UTC ISO string into a date part (for DatePicker) and a time
 * part (for TimePicker), then recombines on change.
 */
export function DateTimePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  use24Hour,
  error,
  className,
}: DateTimePickerProps) {
  // Split the ISO value into date and time parts
  const parsed = value ? parseISO(value) : null;

  // Date part: midnight UTC ISO for the date
  const dateValue = parsed
    ? new Date(
        Date.UTC(
          parsed.getUTCFullYear(),
          parsed.getUTCMonth(),
          parsed.getUTCDate()
        )
      ).toISOString()
    : "";

  // Time part: HH:mm in UTC
  const timeValue = parsed
    ? `${String(parsed.getUTCHours()).padStart(2, "0")}:${String(
        parsed.getUTCMinutes()
      ).padStart(2, "0")}`
    : "";

  function handleDateChange(newDateIso: string) {
    if (!newDateIso) {
      onChange("");
      return;
    }
    const newDate = parseISO(newDateIso);
    // Combine with existing time, or default to noon UTC
    const hours = parsed ? parsed.getUTCHours() : 12;
    const minutes = parsed ? parsed.getUTCMinutes() : 0;
    const combined = new Date(
      Date.UTC(
        newDate.getUTCFullYear(),
        newDate.getUTCMonth(),
        newDate.getUTCDate(),
        hours,
        minutes,
        0,
        0
      )
    );
    onChange(combined.toISOString());
  }

  function handleTimeChange(newTime: string) {
    if (!newTime) return;
    const [h, m] = newTime.split(":").map(Number);
    // Combine with existing date, or use today
    const base = parsed ?? new Date();
    const combined = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate(),
        h,
        m,
        0,
        0
      )
    );
    onChange(combined.toISOString());
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Label>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <DatePicker
            label="Date"
            value={dateValue}
            onChange={handleDateChange}
            min={minDate}
            max={maxDate}
          />
        </div>
        <div className="w-auto">
          <TimePicker
            label="Time"
            value={timeValue}
            onChange={handleTimeChange}
            use24Hour={use24Hour}
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
