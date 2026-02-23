import Database from "better-sqlite3";
import { notFoundError } from "./errors";
import { openCliDb } from "@/platform/db";
import { AppConfig } from "./types";

interface EventRow {
  id: string;
  slug: string;
  capacity: number | null;
}

export interface RegistrationListRow {
  id: string;
  event_slug: string;
  user_id: string;
  user_email: string;
  status: "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";
}

export interface ExportRegistrationRow {
  id: string;
  status: string;
  user_id: string;
  user_email: string;
}

const resolveEvent = (db: Database.Database, slug: string): EventRow => {
  const event = db.prepare("SELECT id, slug, capacity FROM events WHERE slug = ?").get(slug) as
    | EventRow
    | undefined;

  if (!event) {
    throw notFoundError(`Event not found: ${slug}`);
  }

  return event;
};


export const listRegistrations = (
  config: AppConfig,
  args: { eventSlug: string; status?: string },
): RegistrationListRow[] => {
  const db = openCliDb(config);
  try {
    const event = resolveEvent(db, args.eventSlug);
    const params: unknown[] = [event.id];
    const clauses = ["r.event_id = ?"];

    if (args.status) {
      clauses.push("r.status = ?");
      params.push(args.status.toUpperCase());
    }

    return db
      .prepare(
        `
SELECT r.id, e.slug AS event_slug, u.id AS user_id, u.email AS user_email, r.status
FROM event_registrations r
JOIN events e ON e.id = r.event_id
JOIN users u ON u.id = r.user_id
WHERE ${clauses.join(" AND ")}
ORDER BY u.email ASC
`,
      )
      .all(...params) as RegistrationListRow[];
  } finally {
    db.close();
  }
};

export const getEventExportRows = (
  config: AppConfig,
  slug: string,
): ExportRegistrationRow[] => {
  const db = openCliDb(config);
  try {
    const event = resolveEvent(db, slug);

    return db
      .prepare(
        `
SELECT r.id, r.status, u.id AS user_id, u.email AS user_email
FROM event_registrations r
JOIN users u ON u.id = r.user_id
WHERE r.event_id = ?
ORDER BY u.email ASC
`,
      )
      .all(event.id) as ExportRegistrationRow[];
  } finally {
    db.close();
  }
};
