import { randomUUID } from "node:crypto";
import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { EventNotFoundError, InvalidInputError } from "../../core/domain/errors";
import {
  InstructorAssignmentState,
  transitionInstructorAssignment,
} from "../../core/use-cases/instructor-assignment";
import { parseISO } from "@/lib/date-time";

export type InstructorRecord = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  capabilities: string[];
  created_at: string;
  updated_at: string;
};

export type AvailabilityRecord = {
  id: string;
  instructor_id: string;
  start_at: string;
  end_at: string;
  timezone: string;
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  created_at: string;
  updated_at: string;
};

export type EventInstructorAssignmentRecord = {
  event_id: string;
  event_slug: string;
  event_title: string;
  event_start_at: string;
  event_end_at: string;
  event_delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  state: InstructorAssignmentState;
  instructor_id: string | null;
  instructor_name: string | null;
  note: string | null;
  updated_at: string;
};

const isValidDeliveryMode = (value: string): value is "ONLINE" | "IN_PERSON" | "HYBRID" =>
  value === "ONLINE" || value === "IN_PERSON" || value === "HYBRID";

const requireIso = (value: string, field: string): string => {
  try {
    return parseISO(value).toISOString();
  } catch {
    throw new InvalidInputError(`invalid_${field}`);
  }
};

const parseCapabilities = (value?: string[] | null): string[] => {
  if (!value) {
    return [];
  }

  const capabilities = value
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);

  return Array.from(new Set(capabilities));
};

const hasInstructorTables = (db: ReturnType<typeof openCliDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'instructors'")
    .get() as { present?: number } | undefined;

  return row?.present === 1;
};

const hasAssignmentTables = (db: ReturnType<typeof openCliDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'event_instructor_assignments'")
    .get() as { present?: number } | undefined;

  return row?.present === 1;
};

const ensureInstructorTables = (db: ReturnType<typeof openCliDb>): void => {
  db.exec(`
CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  capabilities_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE IF NOT EXISTS instructor_availability (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  delivery_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
  CHECK (delivery_mode IN ('ONLINE','IN_PERSON','HYBRID'))
);

CREATE TABLE IF NOT EXISTS event_instructor_assignments (
  event_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  instructor_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL,
  CHECK (state IN ('TBA','PROPOSED','ASSIGNED','CONFIRMED','REASSIGNED'))
);

CREATE TABLE IF NOT EXISTS event_instructor_assignment_history (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  from_instructor_id TEXT,
  to_instructor_id TEXT,
  note TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (from_instructor_id) REFERENCES instructors(id) ON DELETE SET NULL,
  FOREIGN KEY (to_instructor_id) REFERENCES instructors(id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (to_state IN ('TBA','PROPOSED','ASSIGNED','CONFIRMED','REASSIGNED'))
);
`);
};

const getEventProjection = (
  db: ReturnType<typeof openCliDb>,
  eventSlug: string,
): {
  event_id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string;
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
} => {
  const row = db
    .prepare(
      `
SELECT e.id AS event_id, e.slug, e.title, e.start_at, e.end_at, COALESCE(d.delivery_mode, 'ONLINE') AS delivery_mode
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
WHERE e.slug = ?
`,
    )
    .get(eventSlug) as
    | {
        event_id: string;
        slug: string;
        title: string;
        start_at: string;
        end_at: string;
        delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
      }
    | undefined;

  if (!row) {
    throw new EventNotFoundError(eventSlug);
  }

  return row;
};

const parseCapabilitiesFromJson = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => String(item).trim().toUpperCase()).filter((item) => item.length > 0);
  } catch {
    return [];
  }
};

export const listInstructors = (): InstructorRecord[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasInstructorTables(db)) {
      return [];
    }

    const rows = db
      .prepare(
        `
SELECT id, name, email, status, capabilities_json, created_at, updated_at
FROM instructors
ORDER BY name ASC
`,
      )
      .all() as Array<{
      id: string;
      name: string;
      email: string;
      status: "ACTIVE" | "INACTIVE";
      capabilities_json: string | null;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      ...row,
      capabilities: parseCapabilitiesFromJson(row.capabilities_json),
    }));
  } finally {
    db.close();
  }
};

export const createInstructor = (
  args: {
    name: string;
    email: string;
    status?: "ACTIVE" | "INACTIVE";
    capabilities?: string[];
  },
  actorId: string,
  requestId: string,
): InstructorRecord => {
  const name = args.name.trim();
  const email = args.email.trim().toLowerCase();
  if (!name || !email.includes("@")) {
    throw new InvalidInputError("invalid_instructor_profile");
  }

  const status = args.status ?? "ACTIVE";
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    throw new InvalidInputError("invalid_instructor_status");
  }

  const capabilities = parseCapabilities(args.capabilities);
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    ensureInstructorTables(db);

    const existing = db.prepare("SELECT id FROM instructors WHERE email = ?").get(email) as { id: string } | undefined;
    if (existing) {
      throw new InvalidInputError("instructor_email_exists");
    }

    const now = new Date().toISOString();
    const created: InstructorRecord = {
      id: randomUUID(),
      name,
      email,
      status,
      capabilities,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
INSERT INTO instructors (id, name, email, status, capabilities_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`,
    ).run(created.id, created.name, created.email, created.status, JSON.stringify(created.capabilities), now, now);

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.instructor.create",
      targetType: "instructor",
      requestId,
      metadata: {
        instructorId: created.id,
        status: created.status,
      },
    });

    return created;
  } finally {
    db.close();
  }
};

export const addInstructorAvailability = (
  instructorId: string,
  args: {
    start: string;
    end: string;
    timezone: string;
    deliveryMode: "ONLINE" | "IN_PERSON" | "HYBRID";
  },
  actorId: string,
  requestId: string,
): AvailabilityRecord => {
  const startAt = requireIso(args.start, "availability_start");
  const endAt = requireIso(args.end, "availability_end");
  if (startAt >= endAt) {
    throw new InvalidInputError("invalid_availability_window");
  }

  const timezone = args.timezone.trim();
  if (!timezone) {
    throw new InvalidInputError("invalid_availability_timezone");
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    ensureInstructorTables(db);

    const instructor = db.prepare("SELECT id FROM instructors WHERE id = ?").get(instructorId) as { id: string } | undefined;
    if (!instructor) {
      throw new InvalidInputError("instructor_not_found");
    }

    const now = new Date().toISOString();
    const created: AvailabilityRecord = {
      id: randomUUID(),
      instructor_id: instructorId,
      start_at: startAt,
      end_at: endAt,
      timezone,
      delivery_mode: args.deliveryMode,
      created_at: now,
      updated_at: now,
    };

    db.prepare(
      `
INSERT INTO instructor_availability (id, instructor_id, start_at, end_at, timezone, delivery_mode, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
    ).run(
      created.id,
      created.instructor_id,
      created.start_at,
      created.end_at,
      created.timezone,
      created.delivery_mode,
      created.created_at,
      created.updated_at,
    );

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.instructor.availability.add",
      targetType: "instructor",
      requestId,
      metadata: {
        instructorId,
        availabilityId: created.id,
        deliveryMode: created.delivery_mode,
      },
    });

    return created;
  } finally {
    db.close();
  }
};

export const getEventInstructorAssignment = (eventSlug: string): EventInstructorAssignmentRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasAssignmentTables(db)) {
      const event = getEventProjection(db, eventSlug);
      return {
        event_id: event.event_id,
        event_slug: event.slug,
        event_title: event.title,
        event_start_at: event.start_at,
        event_end_at: event.end_at,
        event_delivery_mode: event.delivery_mode,
        state: "TBA",
        instructor_id: null,
        instructor_name: null,
        note: null,
        updated_at: event.start_at,
      };
    }

    const row = db
      .prepare(
        `
SELECT
  e.id AS event_id,
  e.slug AS event_slug,
  e.title AS event_title,
  e.start_at AS event_start_at,
  e.end_at AS event_end_at,
  COALESCE(d.delivery_mode, 'ONLINE') AS event_delivery_mode,
  COALESCE(a.state, 'TBA') AS state,
  a.instructor_id,
  i.name AS instructor_name,
  a.note,
  COALESCE(a.updated_at, e.updated_at) AS updated_at
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_instructor_assignments a ON a.event_id = e.id
LEFT JOIN instructors i ON i.id = a.instructor_id
WHERE e.slug = ?
`,
      )
      .get(eventSlug) as EventInstructorAssignmentRecord | undefined;

    if (!row) {
      throw new EventNotFoundError(eventSlug);
    }

    return {
      ...row,
      state: row.state ?? "TBA",
      instructor_id: row.instructor_id ?? null,
      instructor_name: row.instructor_name ?? null,
      note: row.note ?? null,
    };
  } finally {
    db.close();
  }
};

const supportsDeliveryMode = (availabilityMode: string, eventMode: "ONLINE" | "IN_PERSON" | "HYBRID"): boolean => {
  if (availabilityMode === "HYBRID") {
    return true;
  }

  if (eventMode === "HYBRID") {
    return availabilityMode === "HYBRID";
  }

  return availabilityMode === eventMode;
};

const validateInstructorForEvent = (
  db: ReturnType<typeof openCliDb>,
  args: {
    instructorId: string;
    eventId: string;
    eventStart: string;
    eventEnd: string;
    eventDeliveryMode: "ONLINE" | "IN_PERSON" | "HYBRID";
  },
): void => {
  const instructor = db
    .prepare("SELECT id, status, capabilities_json FROM instructors WHERE id = ?")
    .get(args.instructorId) as { id: string; status: "ACTIVE" | "INACTIVE"; capabilities_json: string | null } | undefined;

  if (!instructor) {
    throw new InvalidInputError("instructor_not_found");
  }

  if (instructor.status !== "ACTIVE") {
    throw new InvalidInputError("instructor_not_active");
  }

  const capabilities = parseCapabilitiesFromJson(instructor.capabilities_json);
  if (capabilities.length > 0 && !capabilities.includes(args.eventDeliveryMode)) {
    throw new InvalidInputError("instructor_capability_mismatch");
  }

  const windows = db
    .prepare(
      `
SELECT start_at, end_at, delivery_mode
FROM instructor_availability
WHERE instructor_id = ?
`,
    )
    .all(args.instructorId) as Array<{ start_at: string; end_at: string; delivery_mode: string }>;

  const hasWindow = windows.some(
    (window) =>
      window.start_at <= args.eventStart &&
      window.end_at >= args.eventEnd &&
      supportsDeliveryMode(window.delivery_mode, args.eventDeliveryMode),
  );

  if (!hasWindow) {
    throw new InvalidInputError("instructor_unavailable_for_event");
  }
};

export const transitionEventInstructorAssignment = (
  eventSlug: string,
  args: {
    state: InstructorAssignmentState;
    instructorId?: string;
    note?: string;
  },
  actorId: string,
  requestId: string,
): EventInstructorAssignmentRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    ensureInstructorTables(db);

    const event = getEventProjection(db, eventSlug);
    const existing = db
      .prepare(
        "SELECT event_id, state, instructor_id, note, created_at, updated_at FROM event_instructor_assignments WHERE event_id = ?",
      )
      .get(event.event_id) as
      | {
          event_id: string;
          state: InstructorAssignmentState;
          instructor_id: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    const currentState: InstructorAssignmentState = existing?.state ?? "TBA";
    const currentInstructorId = existing?.instructor_id ?? null;

    const next = transitionInstructorAssignment(
      {
        state: currentState,
        instructorId: currentInstructorId,
      },
      {
        nextState: args.state,
        instructorId: args.instructorId,
      },
    );

    if (next.instructorId) {
      validateInstructorForEvent(db, {
        instructorId: next.instructorId,
        eventId: event.event_id,
        eventStart: event.start_at,
        eventEnd: event.end_at,
        eventDeliveryMode: event.delivery_mode,
      });
    }

    const note = args.note?.trim() || null;
    const now = new Date().toISOString();
    const createdAt = existing?.created_at ?? now;

    db.prepare(
      `
INSERT INTO event_instructor_assignments (event_id, state, instructor_id, note, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(event_id) DO UPDATE SET
  state = excluded.state,
  instructor_id = excluded.instructor_id,
  note = excluded.note,
  updated_at = excluded.updated_at
`,
    ).run(event.event_id, next.state, next.instructorId, note, createdAt, now);

    db.prepare(
      `
INSERT INTO event_instructor_assignment_history (
  id, event_id, from_state, to_state, from_instructor_id, to_instructor_id, note, changed_by, changed_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
    ).run(
      randomUUID(),
      event.event_id,
      currentState,
      next.state,
      currentInstructorId,
      next.instructorId,
      note,
      actorId,
      now,
    );

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.event.instructor.transition",
      targetType: "event",
      requestId,
      metadata: {
        eventId: event.event_id,
        eventSlug: event.slug,
        fromState: currentState,
        toState: next.state,
        fromInstructorId: currentInstructorId,
        toInstructorId: next.instructorId,
      },
    });

    return getEventInstructorAssignment(eventSlug);
  } finally {
    db.close();
  }
};

export const listEventInstructorHistory = (eventSlug: string) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    if (!hasAssignmentTables(db)) {
      return [] as Array<{
        id: string;
        from_state: string | null;
        to_state: string;
        from_instructor_id: string | null;
        to_instructor_id: string | null;
        note: string | null;
        changed_by: string | null;
        changed_at: string;
      }>;
    }

    const event = getEventProjection(db, eventSlug);

    return db
      .prepare(
        `
SELECT id, from_state, to_state, from_instructor_id, to_instructor_id, note, changed_by, changed_at
FROM event_instructor_assignment_history
WHERE event_id = ?
ORDER BY changed_at DESC
`,
      )
      .all(event.event_id) as Array<{
      id: string;
      from_state: string | null;
      to_state: string;
      from_instructor_id: string | null;
      to_instructor_id: string | null;
      note: string | null;
      changed_by: string | null;
      changed_at: string;
    }>;
  } finally {
    db.close();
  }
};

export const normalizeAssignmentState = (value: string): InstructorAssignmentState => {
  const candidate = value.trim().toUpperCase();
  if (
    candidate !== "TBA" &&
    candidate !== "PROPOSED" &&
    candidate !== "ASSIGNED" &&
    candidate !== "CONFIRMED" &&
    candidate !== "REASSIGNED"
  ) {
    throw new InvalidInputError("invalid_assignment_state");
  }

  return candidate;
};

export const normalizeAvailabilityMode = (value: string): "ONLINE" | "IN_PERSON" | "HYBRID" => {
  const candidate = value.trim().toUpperCase();
  if (!isValidDeliveryMode(candidate)) {
    throw new InvalidInputError("invalid_delivery_mode");
  }

  return candidate;
};
