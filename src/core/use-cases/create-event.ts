import { EventAlreadyExistsError, InvalidInputError } from "../domain/errors";
import { Event, EventRepository } from "../ports/repositories";
import { parseDeliveryLogistics } from "./event-delivery";
import { parseEngagementType } from "./event-engagement";
import { parseISO } from "@/platform/date-time";

const requireIso = (value: string, field: string): string => {
  try {
    return parseISO(value).toISOString();
  } catch {
    throw new InvalidInputError(`Invalid ISO datetime for ${field}: ${value}`);
  }
};

const parseTimezone = (timezone: string): string => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    throw new InvalidInputError(`Invalid IANA timezone: ${timezone}`);
  }
};

const parseCapacity = (value?: number): number | null => {
  if (value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidInputError("Capacity must be a non-negative integer.");
  }
  return value;
};

export const createEvent = (
  input: {
    slug: string;
    title: string;
    start: string;
    end: string;
    timezone: string;
    capacity?: number;
    engagementType?: string;
    deliveryMode?: string;
    locationText?: string;
    meetingUrl?: string;
    description?: string;
    metadataJson?: string;
    createdBy?: string | null;
  },
  deps: {
    events: EventRepository;
    now: () => string;
    id: () => string;
  },
): Event => {
  const slug = input.slug.trim();
  const title = input.title.trim();

  if (!slug) {
    throw new InvalidInputError("Slug is required.");
  }
  if (!title) {
    throw new InvalidInputError("Title is required.");
  }

  if (deps.events.findBySlug(slug)) {
    throw new EventAlreadyExistsError(slug);
  }

  const startAt = requireIso(input.start, "start");
  const endAt = requireIso(input.end, "end");
  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw new InvalidInputError("Event start must be before end.");
  }

  const logistics = parseDeliveryLogistics({
    deliveryMode: input.deliveryMode,
    locationText: input.locationText,
    meetingUrl: input.meetingUrl,
  });

  const event: Event = {
    id: deps.id(),
    slug,
    title,
    start_at: startAt,
    end_at: endAt,
    timezone: parseTimezone(input.timezone),
    delivery_mode: logistics.delivery_mode,
    engagement_type: parseEngagementType(input.engagementType),
    location_text: logistics.location_text,
    meeting_url: logistics.meeting_url,
    instructor_state: "TBA",
    instructor_id: null,
    instructor_name: null,
    status: "DRAFT",
    capacity: parseCapacity(input.capacity),
    description: input.description?.trim() || null,
    metadata_json: input.metadataJson ?? null,
    created_by: input.createdBy ?? null,
    created_at: deps.now(),
    updated_at: deps.now(),
  };

  deps.events.create(event);
  return event;
};
