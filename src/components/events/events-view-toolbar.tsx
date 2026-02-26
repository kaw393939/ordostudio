"use client";

import Link from "next/link";
import { List, CalendarDays, ListOrdered } from "lucide-react";
import { Button } from "@/components/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DiscoveryView } from "@/lib/calendar-date-ui";
import type { EventSort } from "@/lib/events-discovery-ui";

export type EventsViewToolbarProps = {
  view: DiscoveryView;
  onViewChange: (view: DiscoveryView) => void;
  sort: EventSort;
  onSortChange: (sort: EventSort) => void;
};

export function EventsViewToolbar({ view, onViewChange, sort, onSortChange }: EventsViewToolbarProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(val) => {
          if (val) onViewChange(val as DiscoveryView);
        }}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="list" aria-label="List view">
          <List className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="month" aria-label="Calendar view">
          <CalendarDays className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="agenda" aria-label="Agenda view">
          <ListOrdered className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex items-center gap-2">
        <Button asChild intent="secondary" size="sm">
          <Link href="/studio/report">Submit report</Link>
        </Button>
        <Select value={sort} onValueChange={(val) => onSortChange(val as EventSort)}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc">Earliest first</SelectItem>
            <SelectItem value="date-desc">Latest first</SelectItem>
            <SelectItem value="status">By status</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
