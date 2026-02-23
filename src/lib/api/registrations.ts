import { randomUUID } from "node:crypto";
import {
  EventNotFoundError,
} from "../../core/domain/errors";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import {
  EventRegistrationExportRow,
  SqliteRegistrationReadRepository,
  UserRegistrationHistoryReadRow,
} from "@/adapters/sqlite/read-repositories";
import {
  SqliteEventRepository,
  SqliteRegistrationRepository,
  SqliteUserRepository,
} from "@/adapters/sqlite/repositories";
import { checkInParticipant } from "../../core/use-cases/check-in-participant";
import { removeParticipant } from "../../core/use-cases/remove-participant";
import { registerParticipant } from "../../core/use-cases/register-participant";
import { executeWithAudit } from "../../core/use-cases/with-audit";

import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";

export type RegistrationStatus = "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";

export interface RegistrationRecord {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
}

export interface RegistrationListRow {
  id: string;
  event_slug: string;
  user_id: string;
  user_email: string;
  status: RegistrationStatus;
}

export interface UserRegistrationHistoryRow {
  registration_id: string;
  event_id: string;
  event_slug: string;
  event_title: string;
  event_status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  start_at: string;
  end_at: string;
  timezone: string;
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  engagement_type: "INDIVIDUAL" | "GROUP";
  location_text: string | null;
  meeting_url: string | null;
  instructor_state: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
  instructor_name: string | null;
  status: RegistrationStatus;
}

export const addRegistration = (
  eventSlug: string,
  userIdentifier: string,
  actorId: string,
  requestId: string,
): RegistrationRecord => {
  const config = resolveConfig({ envVars: process.env });
  const users = new SqliteUserRepository(config);
  const events = new SqliteEventRepository(config);
  const registrations = new SqliteRegistrationRepository(config);
  const audit = new SqliteAuditSink(config);

  return executeWithAudit({
    action: "api.registration.add",
    requestId,
    targetType: "registration",
    audit,
    execute: () =>
      registerParticipant(
        {
          eventSlug,
          userIdentifier,
        },
        {
          users,
          events,
          registrations,
          id: () => randomUUID(),
        },
      ),
    metadata: (result) => ({ eventSlug, userId: result.user_id, actorId }),
  });
};

export const removeRegistration = (
  eventSlug: string,
  userIdentifier: string,
  actorId: string,
  requestId: string,
  reason?: string,
): RegistrationRecord => {
  const config = resolveConfig({ envVars: process.env });
  const users = new SqliteUserRepository(config);
  const events = new SqliteEventRepository(config);
  const registrations = new SqliteRegistrationRepository(config);
  const audit = new SqliteAuditSink(config);

  return executeWithAudit({
    action: "api.registration.cancel",
    requestId,
    targetType: "registration",
    audit,
    execute: () =>
      removeParticipant(
        {
          eventSlug,
          userIdentifier,
        },
        {
          users,
          events,
          registrations,
        },
      ),
    metadata: (result) => ({
      eventSlug,
      userId: result.user_id,
      actorId,
      reason: reason ?? null,
    }),
  });
};

export const listRegistrations = (eventSlug: string, status?: string): RegistrationListRow[] => {
  const config = resolveConfig({ envVars: process.env });
  const reads = new SqliteRegistrationReadRepository(config);
  const event = reads.findEventBySlug(eventSlug);
  if (!event) {
    throw new EventNotFoundError(eventSlug);
  }
  return reads.listByEvent({ eventId: event.id, status }) as RegistrationListRow[];
};

export const checkinRegistration = (
  eventSlug: string,
  userIdentifier: string,
  actorId: string,
  requestId: string,
): RegistrationRecord => {
  const config = resolveConfig({ envVars: process.env });
  const users = new SqliteUserRepository(config);
  const events = new SqliteEventRepository(config);
  const registrations = new SqliteRegistrationRepository(config);
  const audit = new SqliteAuditSink(config);

  return executeWithAudit({
    action: "api.registration.checkin",
    requestId,
    targetType: "registration",
    audit,
    execute: () =>
      checkInParticipant(
        {
          eventSlug,
          userIdentifier,
        },
        {
          users,
          events,
          registrations,
        },
      ),
    metadata: (result) => ({ eventSlug, userId: result.user_id, actorId }),
  });
};

export const exportEventData = (args: {
  slug: string;
  format: "csv" | "json";
  includeEmail: boolean;
  actorId: string;
  requestId: string;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const reads = new SqliteRegistrationReadRepository(config);
  const event = reads.findEventBySlug(args.slug);
  if (!event) {
    throw new EventNotFoundError(args.slug);
  }

  const rows = reads.listForExport(event.id) as EventRegistrationExportRow[];
  const db = openCliDb(config);
  try {
    const serializable = rows.map((row) =>
      args.includeEmail
        ? {
            id: row.id,
            status: row.status,
            user_id: row.user_id,
            user_email: row.user_email,
          }
        : {
            id: row.id,
            status: row.status,
            user_id: row.user_id,
          },
    );

    appendAuditLog(db, {
      actorType: "USER",
      actorId: args.actorId,
      action: "api.event.export",
      targetType: "registration",
      requestId: args.requestId,
      metadata: {
        slug: args.slug,
        format: args.format,
        includeEmail: args.includeEmail,
        count: rows.length,
      },
    });

    if (args.format === "json") {
      return {
        format: "json" as const,
        body: JSON.stringify(serializable, null, 2),
      };
    }

    const headers = args.includeEmail ? ["id", "status", "user_id", "user_email"] : ["id", "status", "user_id"];
    const bodyRows = serializable
      .map((row) => headers.map((header) => JSON.stringify((row as Record<string, string>)[header] ?? "")).join(","))
      .join("\n");
    const csv = `${headers.join(",")}\n${bodyRows}${bodyRows ? "\n" : ""}`;

    return {
      format: "csv" as const,
      body: csv,
    };
  } finally {
    db.close();
  }
};

export const listRegistrationsForUser = (userId: string): UserRegistrationHistoryRow[] => {
  const config = resolveConfig({ envVars: process.env });
  const reads = new SqliteRegistrationReadRepository(config);
  return reads.listForUser(userId) as UserRegistrationHistoryReadRow[];
};
