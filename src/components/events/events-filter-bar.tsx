"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DateRangePicker, type DateRangeValue } from "@/components/forms/date-range-picker";
import type { PublicStatusFilter } from "@/lib/events-discovery-ui";
import { addDays } from "@/lib/date-time";

export type EventsFilterBarProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (range: DateRangeValue) => void;
  status: PublicStatusFilter;
  onStatusChange: (status: PublicStatusFilter) => void;
  onQuickFilter: (preset: "this-week" | "this-month" | "upcoming" | "clear") => void;
};

function countActiveFilters(dateRange: DateRangeValue, status: PublicStatusFilter): number {
  let count = 0;
  if (dateRange.from.trim().length > 0 || dateRange.to.trim().length > 0) count++;
  if (status !== "upcoming") count++;
  return count;
}

export function EventsFilterBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  dateRange,
  onDateRangeChange,
  status,
  onStatusChange,
  onQuickFilter,
}: EventsFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = countActiveFilters(dateRange, status);

  return (
    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
      {/* Always-visible: search + filters toggle */}
      <div className="flex flex-wrap items-end gap-2">
        <form
          className="flex flex-1 min-w-[200px] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="events-search" className="sr-only">Search events</Label>
            <Input
              id="events-search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events..."
            />
          </div>
          <Button type="submit" intent="primary" size="sm">
            Search
          </Button>
        </form>

        <CollapsibleTrigger asChild>
          <Button intent="secondary" size="sm" aria-expanded={filtersOpen}>
            <SlidersHorizontal className="size-4 mr-1.5" />
            Filters
            {activeCount > 0 ? (
              <Badge className="ml-1.5 px-1.5 py-0 text-xs">{activeCount}</Badge>
            ) : null}
          </Button>
        </CollapsibleTrigger>
      </div>

      {/* Collapsible filter panel */}
      <CollapsibleContent>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="region" aria-label="Event filters">
          <div className="space-y-1.5">
            <DateRangePicker
              label="Date range"
              value={dateRange}
              onChange={onDateRangeChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="events-visibility">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => onStatusChange(value as PublicStatusFilter)}
            >
              <SelectTrigger id="events-visibility" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Button
              intent="secondary"
              size="sm"
              onClick={() => onQuickFilter("this-week")}
            >
              This week
            </Button>
            <Button
              intent="secondary"
              size="sm"
              onClick={() => onQuickFilter("this-month")}
            >
              This month
            </Button>
            <Button
              intent="secondary"
              size="sm"
              onClick={() => onQuickFilter("clear")}
            >
              Clear all
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Helper to compute quick-filter date ranges. Used by the parent page. */
export function computeQuickFilterDates(preset: "this-week" | "this-month" | "upcoming" | "clear"): {
  from: string;
  to: string;
  status?: PublicStatusFilter;
} {
  if (preset === "clear") return { from: "", to: "" };
  if (preset === "upcoming") return { from: "", to: "", status: "upcoming" };

  const now = new Date();
  if (preset === "this-week") {
    return { from: now.toISOString(), to: addDays(now.toISOString(), 7) };
  }
  // this-month
  const endOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  ).toISOString();
  return { from: now.toISOString(), to: endOfMonth };
}
