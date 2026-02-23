import type { HalResource } from "@/lib/hal-client";

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_text?: string | null;
  meeting_url?: string | null;
  description?: string | null;
  metadata_json?: string | null;
  instructor_id?: string | null;
  instructor_name?: string | null;
  _links: Record<string, { href: string }>;
};

export type EventsPayload = {
  count: number;
  items: EventItem[];
};

export type EventListItemViewModel = {
  id: string;
  slug: string;
  title: string;
  status: string;
  statusLabel: string;
  startAt: string;
  endAt: string;
  timezone: string;
  detailHref: string;
  locationText?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  metadataJson?: string | null;
  instructorId?: string | null;
  instructorName?: string | null;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CANCELLED: "Cancelled",
};

export function mapEventsToListItems(payload: EventsPayload): EventListItemViewModel[] {
  return (payload.items ?? []).map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    status: event.status,
    statusLabel: statusLabel[event.status] ?? event.status,
    startAt: event.start_at,
    endAt: event.end_at,
    timezone: event.timezone,
    detailHref: `/events/${event.slug}`,
    locationText: event.location_text ?? null,
    meetingUrl: event.meeting_url ?? null,
    description: event.description ?? null,
    metadataJson: event.metadata_json ?? null,
    instructorId: event.instructor_id ?? null,
    instructorName: event.instructor_name ?? null,
  }));
}

export function mapRootToEventsHref(root: HalResource): string | null {
  const eventsHref = root._links?.events?.href;
  return typeof eventsHref === "string" && eventsHref.length > 0 ? eventsHref : null;
}
