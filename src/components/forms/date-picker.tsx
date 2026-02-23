"use client";

import * as React from "react";
import { CalendarIcon, XIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/ui/index";
import { parseISO, formatCompact } from "@/lib/date-time";

export type DatePickerProps = {
  /** Visible label text */
  label: string;
  /** Current value as UTC ISO string, or "" for no selection */
  value: string;
  /** Called with ISO string on selection, or "" on clear */
  onChange: (iso: string) => void;
  /** Optional id for form integration */
  id?: string;
  /** Min date as ISO string — dates before this are disabled */
  min?: string;
  /** Max date as ISO string — dates after this are disabled */
  max?: string;
  /** Error message to display */
  error?: string;
  /** Additional className for the wrapper */
  className?: string;
};

/**
 * Date picker combining a shadcn Calendar in a Popover with:
 * - Click-to-open calendar with month/year navigation
 * - Min/max constraints with disabled-date styling
 * - Clear button to reset value
 * - Keyboard-navigable (arrow keys, Enter, Escape)
 */
export function DatePicker({
  label,
  value,
  onChange,
  id,
  min,
  max,
  error,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;
  const minDate = min ? parseISO(min) : undefined;
  const maxDate = max ? parseISO(max) : undefined;

  const displayText = selected ? formatCompact(value) : "Pick a date";

  function handleSelect(date: Date | undefined) {
    if (date) {
      // Normalize to midnight UTC
      const iso = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      ).toISOString();
      onChange(iso);
    }
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  // Disable matcher for min/max constraints
  const disabledMatchers: Array<{ before: Date } | { after: Date }> = [];
  if (minDate) disabledMatchers.push({ before: minDate });
  if (maxDate) disabledMatchers.push({ after: maxDate });

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative flex items-center">
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selected && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {displayText}
            </Button>
          </PopoverTrigger>
          {selected && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 size-7"
              onClick={handleClear}
              aria-label="Clear date"
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
            autoFocus
          />
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
