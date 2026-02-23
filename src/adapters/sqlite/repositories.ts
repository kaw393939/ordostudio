import { openDb } from "@/platform/db";
import type { AppConfig } from "@/platform/types";
import { Event, EventRepository, Registration, RegistrationRepository, User, UserRepository } from "@/core/ports/repositories";

const hasEventDeliveryTable = (db: ReturnType<typeof openDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'event_delivery'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
};

const ensureEventDeliveryTable = (db: ReturnType<typeof openDb>): void => {
  db.exec(`
CREATE TABLE IF NOT EXISTS event_delivery (
  event_id TEXT PRIMARY KEY,
  delivery_mode TEXT NOT NULL,
  location_text TEXT,
  meeting_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CHECK (delivery_mode IN ('ONLINE','IN_PERSON','HYBRID'))
)
`);
};

const hasEventInstructorAssignmentsTable = (db: ReturnType<typeof openDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'event_instructor_assignments'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
};

const ensureEventInstructorTables = (db: ReturnType<typeof openDb>): void => {
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
)
`);
};

const hasEventEngagementTable = (db: ReturnType<typeof openDb>): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'event_engagement'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
};

const ensureEventEngagementTable = (db: ReturnType<typeof openDb>): void => {
  db.exec(`
CREATE TABLE IF NOT EXISTS event_engagement (
  event_id TEXT PRIMARY KEY,
  engagement_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CHECK (engagement_type IN ('INDIVIDUAL','GROUP'))
)
`);
};

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly config: AppConfig) {}

  findByEmail(email: string): User | undefined {
    const db = openDb(this.config);
    try {
      return db.prepare("SELECT id, email, status, created_at, updated_at FROM users WHERE email = ?").get(email) as
        | User
        | undefined;
    } finally {
      db.close();
    }
  }

  findByIdentifier(identifier: string): User | undefined {
    const db = openDb(this.config);
    try {
      if (identifier.includes("@")) {
        return db.prepare("SELECT id, email, status, created_at, updated_at FROM users WHERE email = ?").get(identifier.toLowerCase()) as
          | User
          | undefined;
      }
      return db.prepare("SELECT id, email, status, created_at, updated_at FROM users WHERE id = ?").get(identifier) as
        | User
        | undefined;
    } finally {
      db.close();
    }
  }

  create(user: User): void {
    const db = openDb(this.config);
    try {
      db.prepare("INSERT INTO users (id, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
        user.id,
        user.email,
        user.status,
        user.created_at,
        user.updated_at,
      );
    } finally {
      db.close();
    }
  }
}

export class SqliteEventRepository implements EventRepository {
  constructor(private readonly config: AppConfig) {}

  findBySlug(slug: string): Event | undefined {
    const db = openDb(this.config);
    try {
      const hasInstructorAssignments = hasEventInstructorAssignmentsTable(db);
      const hasEngagement = hasEventEngagementTable(db);
      const query = hasEventDeliveryTable(db)
        ? hasInstructorAssignments && hasEngagement
          ? `
SELECT
  e.*, d.delivery_mode, d.location_text, d.meeting_url, COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type,
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
SELECT e.*, d.delivery_mode, d.location_text, d.meeting_url, COALESCE(eg.engagement_type, 'INDIVIDUAL') AS engagement_type
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
LEFT JOIN event_engagement eg ON eg.event_id = e.id
WHERE e.slug = ?
`
          : `
SELECT e.*, d.delivery_mode, d.location_text, d.meeting_url
FROM events e
LEFT JOIN event_delivery d ON d.event_id = e.id
WHERE e.slug = ?
`
        : `
SELECT e.*, 'ONLINE' AS delivery_mode, NULL AS location_text, NULL AS meeting_url
FROM events e
WHERE e.slug = ?
`;

      const row = db.prepare(query).get(slug) as
        | (Event & {
            delivery_mode?: "ONLINE" | "IN_PERSON" | "HYBRID";
            engagement_type?: "INDIVIDUAL" | "GROUP";
            location_text?: string | null;
            meeting_url?: string | null;
            instructor_state?: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
            instructor_id?: string | null;
            instructor_name?: string | null;
          })
        | undefined;

      if (!row) {
        return undefined;
      }

      return {
        ...row,
        delivery_mode: row.delivery_mode ?? "ONLINE",
        engagement_type: row.engagement_type ?? "INDIVIDUAL",
        location_text: row.location_text ?? null,
        meeting_url: row.meeting_url ?? null,
        instructor_state: row.instructor_state ?? "TBA",
        instructor_id: row.instructor_id ?? null,
        instructor_name: row.instructor_name ?? null,
        description: row.description ?? null,
        metadata_json: row.metadata_json ?? null,
      };
    } finally {
      db.close();
    }
  }

  create(event: Event): void {
    const db = openDb(this.config);
    try {
      db.prepare(
        `
INSERT INTO events (
  id, slug, title, start_at, end_at, timezone, status, capacity, description, metadata_json, created_by, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      ).run(
        event.id,
        event.slug,
        event.title,
        event.start_at,
        event.end_at,
        event.timezone,
        event.status,
        event.capacity,
        event.description ?? null,
        event.metadata_json ?? null,
        event.created_by,
        event.created_at,
        event.updated_at,
      );

      ensureEventDeliveryTable(db);
      ensureEventInstructorTables(db);
      ensureEventEngagementTable(db);

      db.prepare(
        `
INSERT INTO event_delivery (
  event_id, delivery_mode, location_text, meeting_url, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?)
`,
      ).run(
        event.id,
        event.delivery_mode ?? "ONLINE",
        event.location_text ?? null,
        event.meeting_url ?? null,
        event.created_at,
        event.updated_at,
      );

      db.prepare(
        `
INSERT OR IGNORE INTO event_engagement (event_id, engagement_type, created_at, updated_at)
VALUES (?, ?, ?, ?)
`,
      ).run(event.id, event.engagement_type ?? "INDIVIDUAL", event.created_at, event.updated_at);

      db.prepare(
        `
INSERT OR IGNORE INTO event_instructor_assignments (event_id, state, instructor_id, note, created_at, updated_at)
VALUES (?, 'TBA', NULL, NULL, ?, ?)
`,
      ).run(event.id, event.created_at, event.updated_at);
    } finally {
      db.close();
    }
  }

  update(event: Event): void {
    const db = openDb(this.config);
    try {
      db.prepare(
        `
UPDATE events
SET title = ?, start_at = ?, end_at = ?, timezone = ?, status = ?, capacity = ?, description = ?, metadata_json = ?, updated_at = ?
WHERE id = ?
`,
      ).run(
        event.title,
        event.start_at,
        event.end_at,
        event.timezone,
        event.status,
        event.capacity,
        event.description ?? null,
        event.metadata_json ?? null,
        event.updated_at,
        event.id,
      );

      ensureEventDeliveryTable(db);
      ensureEventInstructorTables(db);
      ensureEventEngagementTable(db);

      db.prepare(
        `
INSERT INTO event_delivery (event_id, delivery_mode, location_text, meeting_url, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(event_id) DO UPDATE SET
  delivery_mode = excluded.delivery_mode,
  location_text = excluded.location_text,
  meeting_url = excluded.meeting_url,
  updated_at = excluded.updated_at
`,
      ).run(
        event.id,
        event.delivery_mode ?? "ONLINE",
        event.location_text ?? null,
        event.meeting_url ?? null,
        event.created_at,
        event.updated_at,
      );

      db.prepare(
        `
INSERT INTO event_engagement (event_id, engagement_type, created_at, updated_at)
VALUES (?, ?, ?, ?)
ON CONFLICT(event_id) DO UPDATE SET
  engagement_type = excluded.engagement_type,
  updated_at = excluded.updated_at
`,
      ).run(event.id, event.engagement_type ?? "INDIVIDUAL", event.created_at, event.updated_at);

      db.prepare(
        `
INSERT OR IGNORE INTO event_instructor_assignments (event_id, state, instructor_id, note, created_at, updated_at)
VALUES (?, 'TBA', NULL, NULL, ?, ?)
`,
      ).run(event.id, event.created_at, event.updated_at);
    } finally {
      db.close();
    }
  }

  countActiveRegistrations(eventId: string): number {
    const db = openDb(this.config);
    try {
      const row = db
        .prepare(
          "SELECT COUNT(*) AS count FROM event_registrations WHERE event_id = ? AND status IN ('REGISTERED','CHECKED_IN')",
        )
        .get(eventId) as { count: number };
      return row.count;
    } finally {
      db.close();
    }
  }
}

export class SqliteRegistrationRepository implements RegistrationRepository {
  constructor(private readonly config: AppConfig) {}

  findByEventAndUser(eventId: string, userId: string): Registration | undefined {
    const db = openDb(this.config);
    try {
      return db
        .prepare("SELECT id, event_id, user_id, status FROM event_registrations WHERE event_id = ? AND user_id = ?")
        .get(eventId, userId) as Registration | undefined;
    } finally {
      db.close();
    }
  }

  create(registration: Registration): void {
    const db = openDb(this.config);
    try {
      db.prepare("INSERT INTO event_registrations (id, event_id, user_id, status) VALUES (?, ?, ?, ?)").run(
        registration.id,
        registration.event_id,
        registration.user_id,
        registration.status,
      );
    } finally {
      db.close();
    }
  }

  updateStatus(id: string, status: Registration["status"]): void {
    const db = openDb(this.config);
    try {
      db.prepare("UPDATE event_registrations SET status = ? WHERE id = ?").run(status, id);
    } finally {
      db.close();
    }
  }
}
