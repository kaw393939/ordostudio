import { randomUUID } from "node:crypto";
import { conflictError, notFoundError, usageError } from "./errors";
import { recordAudit } from "./audit";
import { createAuditedEventRepository } from "./audited-repository-factories";
import {
  EventRecord,
  listEvents,
} from "./events-repository";
import { EventAlreadyExistsError, EventNotFoundError, InvalidInputError } from "../core/domain/errors";
import { cancelEvent as cancelEventUseCase } from "../core/use-cases/cancel-event";
import { createEvent as createEventUseCase } from "../core/use-cases/create-event";
import { publishEvent as publishEventUseCase } from "../core/use-cases/publish-event";
import { updateEvent as updateEventUseCase } from "../core/use-cases/update-event";
import { requireSchemaCurrent } from "./schema-guard";
import { AppConfig } from "./types";
import { requireWriteAuth } from "./write-auth";

const parseIso = (value: string, field: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw usageError(`Invalid ISO datetime for ${field}: ${value}`);
  }

  return parsed.toISOString();
};

export const eventCreate = (
  config: AppConfig,
  requestId: string,
  args: {
    slug: string;
    title: string;
    start: string;
    end: string;
    timezone: string;
    capacity?: number;
  },
  token?: string,
): EventRecord => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);
  const events = createAuditedEventRepository(config, {
    action: "event.create",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventId: args.event.id,
      slug: args.event.slug,
    }),
  });

  try {
    return createEventUseCase(args, {
      events,
      id: () => randomUUID(),
      now: () => new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof EventAlreadyExistsError) {
      throw conflictError(`Event already exists for slug: ${args.slug.trim()}`);
    }
    if (error instanceof InvalidInputError) {
      throw usageError(error.message);
    }
    throw error;
  }
};

export const eventUpdate = (
  config: AppConfig,
  requestId: string,
  slug: string,
  changes: {
    title?: string;
    start?: string;
    end?: string;
    capacity?: number;
  },
  token?: string,
): EventRecord => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  const events = createAuditedEventRepository(config, {
    action: "event.update",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventId: args.event.id,
      slug: args.event.slug,
    }),
  });
  try {
    return updateEventUseCase(
      {
        slug,
        title: changes.title,
        start: changes.start,
        end: changes.end,
        capacity: changes.capacity,
      },
      {
        events,
        now: () => new Date().toISOString(),
      },
    );
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw notFoundError(error.message);
    }
    if (error instanceof InvalidInputError) {
      throw usageError(error.message);
    }
    throw error;
  }
};

export const eventPublish = (
  config: AppConfig,
  requestId: string,
  slug: string,
  token?: string,
): EventRecord => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  const events = createAuditedEventRepository(config, {
    action: "event.publish",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventId: args.event.id,
      slug: args.event.slug,
      status: args.event.status,
    }),
  });
  try {
    const result = publishEventUseCase(
      { slug },
      {
        events,
        now: () => new Date().toISOString(),
      },
    );

    if (result.idempotent) {
      recordAudit(config, {
        action: "event.publish",
        requestId,
        targetType: "event",
        metadata: {
          slug,
          idempotent: true,
        },
      });
    }

    return result.event;
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw notFoundError(error.message);
    }
    throw error;
  }
};

export const eventCancel = (
  config: AppConfig,
  requestId: string,
  slug: string,
  reason: string,
  token?: string,
): EventRecord => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  const events = createAuditedEventRepository(config, {
    action: "event.cancel",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventId: args.event.id,
      slug: args.event.slug,
      reason: reason.trim(),
    }),
  });
  try {
    return cancelEventUseCase(
      {
        slug,
        reason,
      },
      {
        events,
        now: () => new Date().toISOString(),
      },
    );
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw notFoundError(error.message);
    }
    if (error instanceof InvalidInputError) {
      throw usageError(error.message);
    }
    throw error;
  }
};

export const eventList = (
  config: AppConfig,
  filters: { status?: string; from?: string; to?: string },
): EventRecord[] => {
  requireSchemaCurrent(config);

  return listEvents(config, {
    status: filters.status,
    fromIso: filters.from ? parseIso(filters.from, "from") : undefined,
    toIso: filters.to ? parseIso(filters.to, "to") : undefined,
  });
};
