import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  CancelledRegistrationCheckinError,
  EventNotFoundError,
  RegistrationNotFoundError,
  UserNotFoundError,
} from "../core/domain/errors";
import { Registration } from "../core/ports/repositories";
import { checkInParticipant } from "../core/use-cases/check-in-participant";
import { removeParticipant } from "../core/use-cases/remove-participant";
import { registerParticipant } from "../core/use-cases/register-participant";
import { notFoundError, preconditionError } from "./errors";
import { createRegistrationUseCaseDeps } from "./audited-repository-factories";
import {
  getEventExportRows,
  listRegistrations,
  RegistrationListRow,
} from "./registrations-repository";
import { recordAudit } from "./audit";
import { requireSchemaCurrent } from "./schema-guard";
import { AppConfig } from "./types";
import { requireWriteAuth } from "./write-auth";

export const regAdd = (
  config: AppConfig,
  requestId: string,
  eventSlug: string,
  userIdentifier: string,
  token?: string,
): Registration => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  const { users, events, registrations } = createRegistrationUseCaseDeps(config, {
    action: "registration.add",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventSlug,
      userIdentifier,
      userId: args.registration?.user_id,
      registrationId: args.registration?.id ?? args.registrationId,
      status: args.registration?.status ?? args.status,
    }),
  });

  try {
    return registerParticipant(
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
    );
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      throw notFoundError(error.message);
    }
    if (error instanceof UserNotFoundError) {
      throw notFoundError(error.message);
    }
    throw error;
  }
};

export const regRemove = (
  config: AppConfig,
  requestId: string,
  eventSlug: string,
  userIdentifier: string,
  token?: string,
  reason?: string,
): Registration => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  const { users, events, registrations } = createRegistrationUseCaseDeps(config, {
    action: "registration.cancel",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventSlug,
      userIdentifier,
      reason: reason ?? null,
      userId: args.registration?.user_id,
      registrationId: args.registration?.id ?? args.registrationId,
      status: args.registration?.status ?? args.status,
    }),
  });

  try {
    return removeParticipant(
      {
        eventSlug,
        userIdentifier,
      },
      {
        users,
        events,
        registrations,
      },
    );
  } catch (error) {
    if (error instanceof EventNotFoundError || error instanceof UserNotFoundError || error instanceof RegistrationNotFoundError) {
      throw notFoundError(error.message);
    }
    throw error;
  }
};

export const regList = (
  config: AppConfig,
  eventSlug: string,
  status?: string,
): RegistrationListRow[] => {
  requireSchemaCurrent(config);

  return listRegistrations(config, { eventSlug, status });
};

export const regCheckin = (
  config: AppConfig,
  requestId: string,
  eventSlug: string,
  userIdentifier: string,
  token?: string,
): Registration => {
  requireSchemaCurrent(config);
  requireWriteAuth(config, token);

  const { users, events, registrations } = createRegistrationUseCaseDeps(config, {
    action: "registration.checkin",
    requestId,
    metadata: (args) => ({
      operation: args.operation,
      eventSlug,
      userIdentifier,
      userId: args.registration?.user_id,
      registrationId: args.registration?.id ?? args.registrationId,
      status: args.registration?.status ?? args.status,
    }),
  });

  try {
    return checkInParticipant(
      {
        eventSlug,
        userIdentifier,
      },
      {
        users,
        events,
        registrations,
      },
    );
  } catch (error) {
    if (error instanceof EventNotFoundError || error instanceof UserNotFoundError || error instanceof RegistrationNotFoundError) {
      throw notFoundError(error.message);
    }
    if (error instanceof CancelledRegistrationCheckinError) {
      throw preconditionError(error.message);
    }
    throw error;
  }
};

export interface ExportResult {
  slug: string;
  format: "csv" | "json";
  out: string;
  count: number;
  includeEmail: boolean;
}

export const eventExport = (
  config: AppConfig,
  requestId: string,
  args: {
    slug: string;
    format: "csv" | "json";
    out: string;
    includeEmail: boolean;
  },
  token?: string,
): ExportResult => {
  requireSchemaCurrent(config);

  if (args.includeEmail && config.env !== "local") {
    requireWriteAuth(config, token);
  }

  const rows = getEventExportRows(config, args.slug);

  const includeEmail = args.includeEmail;

  const serializable = rows.map((row) =>
    includeEmail
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

  const outputPath = resolve(args.out);
  mkdirSync(dirname(outputPath), { recursive: true });

  if (args.format === "json") {
    writeFileSync(outputPath, `${JSON.stringify(serializable, null, 2)}\n`, "utf8");
  } else {
    const headers = includeEmail ? ["id", "status", "user_id", "user_email"] : ["id", "status", "user_id"];
    const body = serializable
      .map((row) => headers.map((header) => JSON.stringify((row as Record<string, string>)[header] ?? "")).join(","))
      .join("\n");
    const csv = `${headers.join(",")}\n${body}${body ? "\n" : ""}`;
    writeFileSync(outputPath, csv, "utf8");
  }

  recordAudit(config, {
    action: "event.export",
    requestId,
    targetType: "event",
    metadata: {
      slug: args.slug,
      format: args.format,
      out: outputPath,
      includeEmail,
      count: rows.length,
    },
  });

  return {
    slug: args.slug,
    format: args.format,
    out: outputPath,
    count: rows.length,
    includeEmail,
  };
};
