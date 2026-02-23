"use client";

import * as React from "react";
import { CalendarIcon, XIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/ui/index";
import { parseISO, formatCompact } from "@/lib/date-time";

export type DateRangeValue = { from: string; to: string };

export type DateRangePickerProps = {
  /** Visible label text */
  label: string;
  /** Current value with from/to as ISO strings, or "" for empty */
  value: DateRangeValue;
  /** Called with { from, to } ISO strings */
  onChange: (range: DateRangeValue) => void;
  /** Show quick-select preset buttons */
  presets?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional className */
  className?: string;
};

function toMidnightUTC(d: Date): string {
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  ).toISOString();
}

/**
 * Date range picker using shadcn Calendar in "range" mode
 * with optional quick-select presets (Today, This week, This month, Last 30 days).
 */
export function DateRangePicker({
  label,
  value,
  onChange,
  presets = false,
  error,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const fromDate = value.from ? parseISO(value.from) : undefined;
  const toDate = value.to ? parseISO(value.to) : undefined;
  const hasValue = !!fromDate || !!toDate;

  const selected: DateRange | undefined =
    fromDate || toDate ? { from: fromDate, to: toDate } : undefined;

  const displayText = hasValue
    ? `${fromDate ? formatCompact(value.from) : "..."} – ${toDate ? formatCompact(value.to) : "..."}`
    : "Pick a date range";

  function handleSelect(range: DateRange | undefined) {
    if (!range) return;
    const from = range.from ? toMidnightUTC(range.from) : "";
    const to = range.to ? toMidnightUTC(range.to) : "";
    onChange({ from, to });
    // Close when both dates selected
    if (range.from && range.to) {
      setOpen(false);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange({ from: "", to: "" });
  }

  function handlePreset(getName: () => { from: Date; to: Date }) {
    const { from, to } = getName();
    onChange({ from: toMidnightUTC(from), to: toMidnightUTC(to) });
    setOpen(false);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative flex items-center">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !hasValue && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {displayText}
            </Button>
          </PopoverTrigger>
          {hasValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 size-7"
              onClick={handleClear}
              aria-label="Clear date range"
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col md:flex-row">
            {presets && (
              <div className="flex flex-col gap-1 border-b p-3 md:border-b-0 md:border-r">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    handlePreset(() => {
                      const now = new Date();
                      return { from: now, to: now };
                    })
                  }
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    handlePreset(() => {
                      const now = new Date();
                      const day = now.getDay();
                      const start = new Date(now);
                      start.setDate(now.getDate() - day);
                      const end = new Date(start);
                      end.setDate(start.getDate() + 6);
                      return { from: start, to: end };
                    })
                  }
                >
                  This week
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    handlePreset(() => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth(), 1);
                      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      return { from: start, to: end };
                    })
                  }
                >
                  This month
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    handlePreset(() => {
                      const now = new Date();
                      const start = new Date(now);
                      start.setDate(now.getDate() - 30);
                      return { from: start, to: now };
                    })
                  }
                >
                  Last 30 days
                </Button>
              </div>
            )}
            <Calendar
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              numberOfMonths={2}
              defaultMonth={fromDate}
              autoFocus
            />
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
