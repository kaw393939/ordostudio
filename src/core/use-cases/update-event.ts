import { EventNotFoundError, InvalidInputError } from "../domain/errors";
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

const parseCapacity = (value?: number): number | null => {
  if (value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidInputError("Capacity must be a non-negative integer.");
  }
  return value;
};

export const updateEvent = (
  input: {
    slug: string;
    title?: string;
    start?: string;
    end?: string;
    capacity?: number;
    engagementType?: string;
    deliveryMode?: string;
    locationText?: string;
    meetingUrl?: string;
    description?: string;
    metadataJson?: string;
  },
  deps: {
    events: EventRepository;
    now: () => string;
  },
): Event => {
  const existing = deps.events.findBySlug(input.slug);
  if (!existing) {
    throw new EventNotFoundError(input.slug);
  }

  const title = input.title?.trim() || existing.title;
  const startAt = input.start ? requireIso(input.start, "start") : existing.start_at;
  const endAt = input.end ? requireIso(input.end, "end") : existing.end_at;

  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw new InvalidInputError("Event start must be before end.");
  }

  const parsedCapacity = input.capacity === undefined ? existing.capacity : parseCapacity(input.capacity);
  const hasDeliveryPatch =
    input.deliveryMode !== undefined || input.locationText !== undefined || input.meetingUrl !== undefined;

  const logistics = hasDeliveryPatch
    ? parseDeliveryLogistics({
        deliveryMode: input.deliveryMode ?? existing.delivery_mode,
        locationText: input.locationText ?? existing.location_text ?? undefined,
        meetingUrl: input.meetingUrl ?? existing.meeting_url ?? undefined,
      })
    : {
        delivery_mode: existing.delivery_mode ?? "ONLINE",
        location_text: existing.location_text ?? null,
        meeting_url: existing.meeting_url ?? null,
      };

  const next: Event = {
    ...existing,
    title,
    start_at: startAt,
    end_at: endAt,
    capacity: parsedCapacity,
    description:
      input.description !== undefined
        ? input.description.trim() || null
        : existing.description ?? null,
    metadata_json:
      input.metadataJson !== undefined
        ? input.metadataJson
        : existing.metadata_json ?? null,
    engagement_type:
      input.engagementType === undefined
        ? existing.engagement_type ?? "INDIVIDUAL"
        : parseEngagementType(input.engagementType),
    delivery_mode: logistics.delivery_mode,
    location_text: logistics.location_text,
    meeting_url: logistics.meeting_url,
    updated_at: deps.now(),
  };

  deps.events.update(next);
  return next;
};
