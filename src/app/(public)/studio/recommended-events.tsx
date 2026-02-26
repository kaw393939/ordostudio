"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "@/components/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { getRoot, requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";
import { mapRootToEventsHref } from "@/lib/view-models/events";
import { formatEventPrimaryRange } from "@/lib/event-date-ui";

type EventItem = {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  status: string;
};

type EventsResponse = {
  count: number;
  items: EventItem[];
};

export function RecommendedEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const rootResult = await getRoot();
      if (!alive) return;

      if (!rootResult.ok) {
        setProblem(rootResult.problem);
        setPending(false);
        return;
      }

      const eventsHref = mapRootToEventsHref(rootResult.data as HalResource);
      if (!eventsHref) {
        setPending(false);
        return;
      }

      const from = new Date().toISOString();
      const query = new URLSearchParams({
        status: "PUBLISHED",
        from,
        limit: "3",
        offset: "0",
      });

      const result = await requestHal<EventsResponse>(`${eventsHref}?${query.toString()}`);
      if (!alive) return;

      if (!result.ok) {
        setProblem(result.problem);
        setPending(false);
        return;
      }

      setProblem(null);
      setEvents(result.data.items ?? []);
      setPending(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (pending) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (problem) {
    return (
      <Card className="p-4">
        <ProblemDetailsPanel problem={problem} />
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-4">
        <p className="type-body-sm text-text-secondary">No upcoming events right now.</p>
        <div className="mt-3">
          <Link href="/events" className="type-label underline">
            Browse all events
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => {
        const timeRange = formatEventPrimaryRange({
          startIso: event.start_at,
          endIso: event.end_at,
          timezone: event.timezone,
        });

        return (
          <Card key={event.slug} className="p-3">
            <p className="type-meta text-text-secondary">{timeRange}</p>
            <p className="mt-1 type-label text-text-primary">{event.title}</p>
            <Link
              href={`/events/${event.slug}`}
              className="mt-2 inline-block type-meta text-text-secondary underline hover:text-text-primary"
            >
              View details &rarr;
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
