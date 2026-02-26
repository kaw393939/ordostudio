"use client";

import { EventCard } from "@/components/events/event-card";
import { EventCardSkeleton } from "@/components/events/event-card-skeleton";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion-wrapper";
import { Button } from "@/components/primitives";
import type { EventListItemViewModel } from "@/lib/view-models/events";

export type EventsListViewProps = {
  events: EventListItemViewModel[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  isFirstRender: boolean;
};

export function EventsListView({ events, page, pageSize, onPageChange, loading, isFirstRender }: EventsListViewProps) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const Container = isFirstRender ? StaggerContainer : "div";
  const Item = isFirstRender ? StaggerItem : "div";

  return (
    <>
      <Container className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events.map((evt) => (
          <Item key={evt.id}>
            <EventCard
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
          </Item>
        ))}
      </Container>

      <div className="mt-4 flex items-center gap-2">
        <Button intent="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="type-label text-text-secondary">Page {page}</span>
        <Button intent="secondary" size="sm" disabled={events.length < pageSize} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </>
  );
}
