"use client";

import Link from "next/link";
import { Card } from "@/components/primitives";
import { Button } from "@/components/primitives";
import { EventCard } from "@/components/events/event-card";
import { LoadingState } from "@/components/patterns";
import {
  toCalendarMonthGrid,
  toAgendaGroups,
  shiftMonthKey,
  formatEventTimeContext,
} from "@/lib/calendar-date-ui";
import type { EventListItemViewModel } from "@/lib/view-models/events";

export type EventsMonthViewProps = {
  events: EventListItemViewModel[];
  monthKey: string | null;
  onMonthChange: (key: string) => void;
  loading: boolean;
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function EventsMonthView({ events, monthKey, onMonthChange, loading }: EventsMonthViewProps) {
  if (loading) {
    return <LoadingState title="Loading events" rows={5} />;
  }

  const monthGrid = toCalendarMonthGrid(events, monthKey);

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <Button intent="secondary" size="sm" onClick={() => onMonthChange(shiftMonthKey(monthGrid.monthKey, -1))}>
            Previous
          </Button>
          <p className="type-title">{monthGrid.monthLabel}</p>
          <Button intent="secondary" size="sm" onClick={() => onMonthChange(shiftMonthKey(monthGrid.monthKey, 1))}>
            Next
          </Button>
        </div>
      </Card>

      {/* Desktop: 7-column calendar grid (hidden on mobile) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_HEADERS.map((d) => (
            <p key={d} className="text-center type-meta text-text-muted py-1">{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthGrid.weeks.flat().map((day) => (
            <div
              key={day.dateKey}
              className={`min-h-20 rounded-sm border border-border-subtle p-2 ${day.inMonth ? "bg-surface" : "bg-surface-muted opacity-60"}`}
            >
              <p className="type-meta text-text-muted">{day.dayOfMonth}</p>
              <div className="mt-1 space-y-0.5">
                {day.items.slice(0, 2).map((evt) => (
                  <Link
                    key={evt.id}
                    href={evt.detailHref}
                    className="block truncate rounded-sm bg-action-primary/10 px-1.5 py-0.5 type-meta text-text-primary hover:bg-action-primary/20 motion-base"
                  >
                    {evt.title}
                  </Link>
                ))}
                {day.items.length > 2 ? (
                  <p className="type-meta text-text-muted">+{day.items.length - 2} more</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: agenda-style fallback (hidden on desktop) */}
      <div className="md:hidden space-y-3">
        <MobileMonthList events={events} />
      </div>
    </div>
  );
}

/** Mobile fallback: renders month events as a date-grouped list using EventCards */
function MobileMonthList({ events }: { events: EventListItemViewModel[] }) {
  const groups = toAgendaGroups(events);

  if (groups.length === 0) {
    return <p className="type-body-sm text-text-muted py-4 text-center">No events this month.</p>;
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.dateKey}>
          <p className="type-label text-text-secondary mb-2">{group.dateKey}</p>
          <div className="space-y-2">
            {group.items.map((evt) => (
              <EventCard
                key={evt.id}
                model={{
                  id: evt.id,
                  slug: evt.slug,
                  title: evt.title,
                  status: evt.status,
                  startAt: evt.startAt,
                  endAt: evt.endAt,
                  timezone: evt.timezone,
                  detailHref: evt.detailHref,
                  locationText: evt.locationText ?? null,
                  meetingUrl: evt.meetingUrl ?? null,
                  description: evt.description ?? null,
                  metadataJson: evt.metadataJson ?? null,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
