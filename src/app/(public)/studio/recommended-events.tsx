"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { formatEventPrimaryRange } from "@/lib/event-date-ui";

type EventItem = {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  status: string;
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  location_text: string | null;
  meeting_url: string | null;
  _links: Record<string, { href: string }>;
};

type EventsResponse = {
  count: number;
  items: EventItem[];
};

const deliveryLabel = (mode: EventItem["delivery_mode"]): string => {
  if (mode === "IN_PERSON") return "In person";
  if (mode === "HYBRID") return "Hybrid";
  return "Online";
};

export function RecommendedEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pending, setPending] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const queryHref = useMemo(() => {
    const from = new Date().toISOString();
    const query = new URLSearchParams({
      status: "PUBLISHED",
      from,
      limit: "3",
      offset: "0",
    });
    return `/api/v1/events?${query.toString()}`;
  }, []);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const result = await requestHal<EventsResponse>(queryHref);
      if (!alive) return;

      if (!result.ok) {
        setProblem(result.problem);
        setEvents([]);
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
  }, [queryHref]);

  if (pending) {
    return (
      <Card className="p-4">
        <p className="type-meta text-text-muted">Loading recommended events…</p>
      </Card>
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
        <p className="type-label text-text-primary">Recommended events</p>
        <p className="mt-1 type-body-sm text-text-secondary">No upcoming published events right now.</p>
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
          <Card key={event.slug} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="type-label text-text-primary">{event.title}</p>
                <p className="mt-1 type-meta text-text-muted">{timeRange}</p>
                <p className="type-meta text-text-secondary">
                  {deliveryLabel(event.delivery_mode)}
                  {event.location_text ? ` · ${event.location_text}` : ""}
                </p>
              </div>
              {event.status === "PUBLISHED" ? <Badge variant="secondary">Recommended</Badge> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link href={`/events/${event.slug}`} className="type-label underline">
                Attend
              </Link>
              <Link href={`/studio/report?event=${encodeURIComponent(event.slug)}`} className="type-label underline">
                Submit report
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
