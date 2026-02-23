import { randomUUID } from "node:crypto";
import { EventAlreadyExistsError, EventNotFoundError, InvalidInputError } from "../../core/domain/errors";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import { SqliteEventReadRepository } from "@/adapters/sqlite/read-repositories";
import { SqliteEventRepository } from "@/adapters/sqlite/repositories";
import { cancelEvent as cancelEventUseCase } from "../../core/use-cases/cancel-event";
import { createEvent as createEventUseCase } from "../../core/use-cases/create-event";
import { publishEvent as publishEventUseCase } from "../../core/use-cases/publish-event";
import { parseISO } from "@/lib/date-time";
import { updateEvent as updateEventUseCase } from "../../core/use-cases/update-event";
import { executeWithAudit } from "../../core/use-cases/with-audit";

import { resolveConfig } from "@/platform/config";

export class EventConflictAdapterError extends Error {
  constructor(public readonly slug: string) {
    super(`Event conflict: ${slug}`);
    this.name = "EventConflictAdapterError";
  }
}

export class InvalidEventPayloadAdapterError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid event payload: ${reason}`);
    this.name = "InvalidEventPayloadAdapterError";
  }
}

export class CancelReasonRequiredError extends Error {
  constructor() {
    super("Cancel reason required");
    this.name = "CancelReasonRequiredError";
  }
}

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  engagement_type: "INDIVIDUAL" | "GROUP";
  location_text: string | null;
  meeting_url: string | null;
  instructor_state: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
  instructor_id: string | null;
  instructor_name: string | null;
  status: EventStatus;
  capacity: number | null;
  description: string | null;
  metadata_json: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const requireIso = (value: string, field: string): string => {
  try {
    return parseISO(value).toISOString();
  } catch {
    throw new Error(`invalid_${field}`);
  }
};

const baseEventLinks = (slug: string) => ({
  self: { href: `/api/v1/events/${slug}` },
  collection: { href: "/api/v1/events" },
});

export const eventLinksForState = (slug: string, status: EventStatus) => {
  const links: Record<string, { href: string }> = {
    ...baseEventLinks(slug),
    "app:instructor-assignment": { href: `/api/v1/events/${slug}/instructor` },
  };

  if (status === "DRAFT") {
    links["app:publish"] = { href: `/api/v1/events/${slug}/publish` };
  }

  if (status === "PUBLISHED") {
    links["app:cancel"] = { href: `/api/v1/events/${slug}/cancel` };
    links["app:ics"] = { href: `/api/v1/events/${slug}/ics` };
  }

  return links;
};

export const listEvents = (filters: {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const reads = new SqliteEventReadRepository(config);
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const rows = reads.list({
    status: filters.status,
    q: filters.q,
    fromIso: filters.from ? requireIso(filters.from, "from") : undefined,
    toIso: filters.to ? requireIso(filters.to, "to") : undefined,
    limit,
    offset,
  });

  return {
    count: rows.length,
    limit,
    offset,
    items: rows,
  };
};

export const getEventBySlug = (slug: string): EventRecord => {
  const config = resolveConfig({ envVars: process.env });
  const reads = new SqliteEventReadRepository(config);
  const found = reads.findBySlug(slug);
  if (!found) {
    throw new EventNotFoundError(slug);
  }
  return found;
};

export const createEvent = (
  args: {
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
  },
  actorId: string,
  requestId: string,
) => {
  const config = resolveConfig({ envVars: process.env });
  const events = new SqliteEventRepository(config);
  const audit = new SqliteAuditSink(config);

  try {
    return executeWithAudit({
      action: "api.event.create",
      requestId,
      targetType: "event",
      audit,
      execute: () =>
        createEventUseCase(
          {
            slug: args.slug,
            title: args.title,
            start: args.start,
            end: args.end,
            timezone: args.timezone,
            capacity: args.capacity,
            engagementType: args.engagementType,
            deliveryMode: args.deliveryMode,
            locationText: args.locationText,
            meetingUrl: args.meetingUrl,
            description: args.description,
            metadataJson: args.metadataJson,
            createdBy: actorId,
          },
          {
            events,
            id: () => randomUUID(),
            now: () => new Date().toISOString(),
          },
        ),
      metadata: (result) => ({
        eventId: result.id,
        slug: result.slug,
        actorId,
      }),
    });
  } catch (error) {
    if (error instanceof EventAlreadyExistsError) {
      throw new EventConflictAdapterError(args.slug);
    }
    if (error instanceof InvalidInputError) {
      throw new InvalidEventPayloadAdapterError(error.message);
    }
    throw error;
  }
};

export const updateEvent = (
  slug: string,
  changes: {
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
  actorId: string,
  requestId: string,
) => {
  const config = resolveConfig({ envVars: process.env });
  const events = new SqliteEventRepository(config);
  const audit = new SqliteAuditSink(config);

  try {
    return executeWithAudit({
      action: "api.event.update",
      requestId,
      targetType: "event",
      audit,
      execute: () =>
        updateEventUseCase(
          {
            slug,
            title: changes.title,
            start: changes.start,
            end: changes.end,
            capacity: changes.capacity,
            engagementType: changes.engagementType,
            deliveryMode: changes.deliveryMode,
            locationText: changes.locationText,
            meetingUrl: changes.meetingUrl,
            description: changes.description,
            metadataJson: changes.metadataJson,
          },
          {
            events,
            now: () => new Date().toISOString(),
          },
        ),
      metadata: () => ({ slug, actorId }),
    });
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw error;
    }
    if (error instanceof InvalidInputError) {
      throw new InvalidEventPayloadAdapterError(error.message);
    }
    throw error;
  }
};

export const publishEvent = (slug: string, actorId: string, requestId: string) => {
  const config = resolveConfig({ envVars: process.env });
  const events = new SqliteEventRepository(config);
  const audit = new SqliteAuditSink(config);

  try {
    const result = executeWithAudit({
      action: "api.event.publish",
      requestId,
      targetType: "event",
      audit,
      execute: () =>
        publishEventUseCase(
          { slug },
          {
            events,
            now: () => new Date().toISOString(),
          },
        ),
      metadata: (out) => ({ slug, actorId, idempotent: out.idempotent }),
    });

    return result.event;
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw error;
    }
    throw error;
  }
};

export const cancelEvent = (slug: string, reason: string, actorId: string, requestId: string) => {
  const config = resolveConfig({ envVars: process.env });
  const events = new SqliteEventRepository(config);
  const audit = new SqliteAuditSink(config);

  try {
    return executeWithAudit({
      action: "api.event.cancel",
      requestId,
      targetType: "event",
      audit,
      execute: () =>
        cancelEventUseCase(
          { slug, reason },
          {
            events,
            now: () => new Date().toISOString(),
          },
        ),
      metadata: () => ({ slug, actorId, reason: reason.trim() }),
    });
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw error;
    }
    if (error instanceof InvalidInputError) {
      throw new CancelReasonRequiredError();
    }
    throw error;
  }
};
