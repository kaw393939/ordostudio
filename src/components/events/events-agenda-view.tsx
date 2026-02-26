"use client";

import Link from "next/link";
import { Card } from "@/components/primitives";
import { LoadingState } from "@/components/patterns";
import { toAgendaGroups, formatEventTimeContext } from "@/lib/calendar-date-ui";
import type { EventListItemViewModel } from "@/lib/view-models/events";

export type EventsAgendaViewProps = {
  events: EventListItemViewModel[];
  loading: boolean;
};

export function EventsAgendaView({ events, loading }: EventsAgendaViewProps) {
  if (loading) {
    return <LoadingState title="Loading events" rows={5} />;
  }

  const groups = toAgendaGroups(events);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <Card key={group.dateKey} className="p-4">
          <p className="type-title">{group.dateKey}</p>
          <ul className="mt-2 space-y-2">
            {group.items.map((evt) => {
              const ctx = formatEventTimeContext(evt);
              return (
                <li
                  key={evt.id}
                  className="flex items-center justify-between gap-3 rounded-sm border border-border-default p-2"
                >
                  <div className="text-left min-w-0">
                    <p className="type-label truncate">{evt.title}</p>
                    <p className="type-meta text-text-muted">
                      {ctx.eventRange} ({ctx.eventTimezone})
                    </p>
                  </div>
                  <Link href={evt.detailHref} prefetch className="type-label underline shrink-0">
                    View
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
