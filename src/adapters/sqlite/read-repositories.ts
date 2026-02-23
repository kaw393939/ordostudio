import { openDb } from "@/platform/db";
import type { AppConfig } from "@/platform/types";

const hasEventDeliveryTable = (db: ReturnType<typeof openDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'event_delivery'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
};

const hasEventInstructorAssignmentsTable = (db: ReturnType<typeof openDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'event_instructor_assignments'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
};

const hasEventEngagementTable = (db: ReturnType<typeof openDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'event_engagement'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
};

export interface EventReadRecord {
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
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  capacity: number | null;
  description: string | null;
  metadata_json: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserReadRecord {
  id: string;
  email: string;
  status: string;
  display_name?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  created_at: string;
  updated_at: string;
  roles: string[];
}

export interface EventRegistrationReadEvent {
  id: string;
  slug: string;
  capacity: number | null;
}

export interface EventRegistrationReadRow {
  id: string;
  event_slug: string;
  user_id: string;
  user_email: string;
  status: "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";
}

export interface EventRegistrationExportRow {
  id: string;
  status: "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";
  user_id: string;
  user_email: string;
}

export interface UserRegistrationHistoryReadRow {
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
  status: "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";
}

export class SqliteEventReadRepository {
  constructor(private readonly config: AppConfig) {}

  list(args: {
    status?: string;
    q?: string;
    fromIso?: string;
    toIso?: string;
    limit: number;
    offset: number;
  }): EventReadRecord[] {
    const db = openDb(this.config);
    try {
      const clauses: string[] = [];
      const params: unknown[] = [];
      const hasDeliveryTable = hasEventDeliveryTable(db);
      const hasInstructorAssignments = hasEventInstructorAssignmentsTable(db);
      const hasEngagement = hasEventEngagementTable(db);

      if (args.status) {
        clauses.push("e.status = ?");
        params.push(args.status.toUpperCase());
      }

      if (args.q) {
        clauses.push("e.title LIKE ?");
        params.push(`%${args.q}%`);
      }

      if (args.fromIso) {
        clauses.push("e.start_at >= ?");
        params.push(args.fromIso);
      }

      if (args.toIso) {
        clauses.push("e.start_at <= ?");
        params.push(args.toIso);
      }

      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

      const query = hasDeliveryTable
        ? hasInstructorAssignments && hasEngagement
          ? `
SELECT
  e.*,
  d.delivery_mode,
  COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type,
  d.location_text,
  d.meeting_url,
  COALESCE(ia.state, 'TBA') AS instructor_state,
  ia.instructor_id,
  i.name AS instructor_name
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_engagement eg ON eg.event_id = e.id
LEFT JOIN event_instructor_assignments ia ON ia.event_id = e.id
LEFT JOIN instructors i ON i.id = ia.instructor_id
${whereClause}
ORDER BY start_at ASC
LIMIT ? OFFSET ?
`
          : hasEngagement
            ? `
SELECT
  e.*,
  d.delivery_mode,
  COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type,
  d.location_text,
  d.meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_id,
  NULL AS instructor_name
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_engagement eg ON eg.event_id = e.id
${whereClause}
ORDER BY start_at ASC
LIMIT ? OFFSET ?
`
          : `
SELECT
  e.*,
  d.delivery_mode,
  'INDIVIDUAL' AS engagement_type,
  d.location_text,
  d.meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_id,
  NULL AS instructor_name
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
${whereClause}
ORDER BY start_at ASC
LIMIT ? OFFSET ?
`
        : `
SELECT
  e.*,
  'ONLINE' AS delivery_mode,
  'INDIVIDUAL' AS engagement_type,
  NULL AS location_text,
  NULL AS meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_id,
  NULL AS instructor_name
FROM events e
${whereClause}
ORDER BY start_at ASC
LIMIT ? OFFSET ?
`;

      return db
        .prepare(query)
        .all(...params, args.limit, args.offset)
        .map((row) => ({
          ...(row as Record<string, unknown>),
          delivery_mode: ((row as Record<string, unknown>).delivery_mode as string | undefined) ?? "ONLINE",
          engagement_type: ((row as Record<string, unknown>).engagement_type as string | undefined) ?? "INDIVIDUAL",
          location_text: ((row as Record<string, unknown>).location_text as string | null | undefined) ?? null,
          meeting_url: ((row as Record<string, unknown>).meeting_url as string | null | undefined) ?? null,
          instructor_state:
            ((row as Record<string, unknown>).instructor_state as
              | "TBA"
              | "PROPOSED"
              | "ASSIGNED"
              | "CONFIRMED"
              | "REASSIGNED"
              | undefined) ?? "TBA",
          instructor_id: ((row as Record<string, unknown>).instructor_id as string | null | undefined) ?? null,
          instructor_name: ((row as Record<string, unknown>).instructor_name as string | null | undefined) ?? null,
          description: ((row as Record<string, unknown>).description as string | null | undefined) ?? null,
          metadata_json: ((row as Record<string, unknown>).metadata_json as string | null | undefined) ?? null,
        })) as EventReadRecord[];
    } finally {
      db.close();
    }
  }

  findBySlug(slug: string): EventReadRecord | undefined {
    const db = openDb(this.config);
    try {
      const hasDeliveryTable = hasEventDeliveryTable(db);
      const hasInstructorAssignments = hasEventInstructorAssignmentsTable(db);
      const hasEngagement = hasEventEngagementTable(db);
      const query = hasDeliveryTable
        ? hasInstructorAssignments && hasEngagement
          ? `
SELECT
  e.*,
  d.delivery_mode,
  COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type,
  d.location_text,
  d.meeting_url,
  COALESCE(ia.state, 'TBA') AS instructor_state,
  ia.instructor_id,
  i.name AS instructor_name
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_engagement eg ON eg.event_id = e.id
LEFT JOIN event_instructor_assignments ia ON ia.event_id = e.id
LEFT JOIN instructors i ON i.id = ia.instructor_id
WHERE e.slug = ?
`
          : hasEngagement
            ? `
SELECT
  e.*,
  d.delivery_mode,
  COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type,
  d.location_text,
  d.meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_id,
  NULL AS instructor_name
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_engagement eg ON eg.event_id = e.id
WHERE e.slug = ?
`
          : `
SELECT
  e.*,
  d.delivery_mode,
  'INDIVIDUAL' AS engagement_type,
  d.location_text,
  d.meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_id,
  NULL AS instructor_name
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
WHERE e.slug = ?
`
        : `
SELECT
  e.*,
  'ONLINE' AS delivery_mode,
  'INDIVIDUAL' AS engagement_type,
  NULL AS location_text,
  NULL AS meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_id,
  NULL AS instructor_name
FROM events e
WHERE e.slug = ?
`;
      const found = db
        .prepare(query)
        .get(slug) as
        | (EventReadRecord & {
            delivery_mode?: "ONLINE" | "IN_PERSON" | "HYBRID";
            engagement_type?: "INDIVIDUAL" | "GROUP";
            instructor_state?: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
          })
        | undefined;

      if (!found) {
        return undefined;
      }

      return {
        ...found,
        delivery_mode: found.delivery_mode ?? "ONLINE",
        engagement_type: found.engagement_type ?? "INDIVIDUAL",
        location_text: found.location_text ?? null,
        meeting_url: found.meeting_url ?? null,
        instructor_state: found.instructor_state ?? "TBA",
        instructor_id: found.instructor_id ?? null,
        instructor_name: found.instructor_name ?? null,
        description: found.description ?? null,
        metadata_json: found.metadata_json ?? null,
      };
    } finally {
      db.close();
    }
  }
}

export class SqliteUserReadRepository {
  constructor(private readonly config: AppConfig) {}

  private getRolesForUser(db: ReturnType<typeof openDb>, userId: string): string[] {
    const rows = db
      .prepare(
        `
SELECT r.name
FROM roles r
JOIN user_roles ur ON ur.role_id = r.id
WHERE ur.user_id = ?
ORDER BY r.name ASC
`,
      )
      .all(userId) as { name: string }[];
    return rows.map((row) => row.name);
  }

  list(args: { role?: string; status?: string; search?: string; limit: number; offset: number }): UserReadRecord[] {
    const db = openDb(this.config);
    try {
      const joins: string[] = [];
      const clauses: string[] = [];
      const params: unknown[] = [];

      if (args.role) {
        joins.push("JOIN user_roles ur ON ur.user_id = u.id", "JOIN roles r ON r.id = ur.role_id");
        clauses.push("r.name = ?");
        params.push(args.role.toUpperCase());
      }

      if (args.status) {
        clauses.push("u.status = ?");
        params.push(args.status.toUpperCase());
      }

      if (args.search) {
        clauses.push("u.email LIKE ?");
        params.push(`%${args.search}%`);
      }

      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
      const query = `
SELECT DISTINCT u.id, u.email, u.status, u.display_name, u.bio, u.profile_picture_url, u.created_at, u.updated_at
FROM users u
${joins.join(" ")}
${whereClause}
ORDER BY u.created_at ASC
LIMIT ? OFFSET ?
`;

      const rows = db.prepare(query).all(...params, args.limit, args.offset) as {
        id: string;
        email: string;
        status: string;
        display_name: string | null;
        bio: string | null;
        profile_picture_url: string | null;
        created_at: string;
        updated_at: string;
      }[];

      return rows.map((row) => ({
        ...row,
        roles: this.getRolesForUser(db, row.id),
      }));
    } finally {
      db.close();
    }
  }

  findById(id: string): UserReadRecord | undefined {
    const db = openDb(this.config);
    try {
      const row = db
        .prepare("SELECT id, email, status, display_name, bio, profile_picture_url, created_at, updated_at FROM users WHERE id = ?")
        .get(id) as
        | {
            id: string;
            email: string;
            status: string;
            display_name: string | null;
            bio: string | null;
            profile_picture_url: string | null;
            created_at: string;
            updated_at: string;
          }
        | undefined;

      if (!row) {
        return undefined;
      }

      return {
        ...row,
        roles: this.getRolesForUser(db, row.id),
      };
    } finally {
      db.close();
    }
  }
}

export class SqliteRegistrationReadRepository {
  constructor(private readonly config: AppConfig) {}

  findEventBySlug(slug: string): EventRegistrationReadEvent | undefined {
    const db = openDb(this.config);
    try {
      return db.prepare("SELECT id, slug, capacity FROM events WHERE slug = ?").get(slug) as
        | EventRegistrationReadEvent
        | undefined;
    } finally {
      db.close();
    }
  }

  listByEvent(args: { eventId: string; status?: string }): EventRegistrationReadRow[] {
    const db = openDb(this.config);
    try {
      const params: unknown[] = [args.eventId];
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
        .all(...params) as EventRegistrationReadRow[];
    } finally {
      db.close();
    }
  }

  listForExport(eventId: string): EventRegistrationExportRow[] {
    const db = openDb(this.config);
    try {
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
        .all(eventId) as EventRegistrationExportRow[];
    } finally {
      db.close();
    }
  }

  listForUser(userId: string): UserRegistrationHistoryReadRow[] {
    const db = openDb(this.config);
    try {
      const hasDeliveryTable = hasEventDeliveryTable(db);
      const hasInstructorAssignments = hasEventInstructorAssignmentsTable(db);
      const hasEngagement = hasEventEngagementTable(db);
      const query = hasDeliveryTable
        ? hasInstructorAssignments && hasEngagement
          ? `
SELECT
  r.id AS registration_id,
  e.id AS event_id,
  e.slug AS event_slug,
  e.title AS event_title,
  e.status AS event_status,
  e.start_at,
  e.end_at,
  e.timezone,
  COALESCE(d.delivery_mode, 'ONLINE') AS delivery_mode,
  COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type,
  d.location_text,
  d.meeting_url,
  COALESCE(ia.state, 'TBA') AS instructor_state,
  i.name AS instructor_name,
  r.status
FROM event_registrations r
JOIN events e ON e.id = r.event_id
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_engagement eg ON eg.event_id = e.id
LEFT JOIN event_instructor_assignments ia ON ia.event_id = e.id
LEFT JOIN instructors i ON i.id = ia.instructor_id
WHERE r.user_id = ?
ORDER BY e.start_at ASC
`
          : hasEngagement
            ? `
SELECT
  r.id AS registration_id,
  e.id AS event_id,
  e.slug AS event_slug,
  e.title AS event_title,
  e.status AS event_status,
  e.start_at,
  e.end_at,
  e.timezone,
  COALESCE(d.delivery_mode, 'ONLINE') AS delivery_mode,
  COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type,
  d.location_text,
  d.meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_name,
  r.status
FROM event_registrations r
JOIN events e ON e.id = r.event_id
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_engagement eg ON eg.event_id = e.id
WHERE r.user_id = ?
ORDER BY e.start_at ASC
`
          : `
SELECT
  r.id AS registration_id,
  e.id AS event_id,
  e.slug AS event_slug,
  e.title AS event_title,
  e.status AS event_status,
  e.start_at,
  e.end_at,
  e.timezone,
  COALESCE(d.delivery_mode, 'ONLINE') AS delivery_mode,
  'INDIVIDUAL' AS engagement_type,
  d.location_text,
  d.meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_name,
  r.status
FROM event_registrations r
JOIN events e ON e.id = r.event_id
LEFT JOIN event_delivery d ON d.event_id = e.id
WHERE r.user_id = ?
ORDER BY e.start_at ASC
`
        : `
SELECT
  r.id AS registration_id,
  e.id AS event_id,
  e.slug AS event_slug,
  e.title AS event_title,
  e.status AS event_status,
  e.start_at,
  e.end_at,
  e.timezone,
  'ONLINE' AS delivery_mode,
  'INDIVIDUAL' AS engagement_type,
  NULL AS location_text,
  NULL AS meeting_url,
  'TBA' AS instructor_state,
  NULL AS instructor_name,
  r.status
FROM event_registrations r
JOIN events e ON e.id = r.event_id
WHERE r.user_id = ?
ORDER BY e.start_at ASC
`;
      return db
        .prepare(query)
        .all(userId) as UserRegistrationHistoryReadRow[];
    } finally {
      db.close();
    }
  }
}
