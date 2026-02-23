import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";

export type MeasurementEventKey =
  | "CTA_CLICK_VIEW_TRAINING_TRACKS"
  | "CTA_CLICK_BOOK_TECHNICAL_CONSULT"
  | "PAGE_VIEW_HOME"
  | "PAGE_VIEW_SERVICES"
  | "PAGE_VIEW_SERVICE_DETAIL"
  | "PAGE_VIEW_SERVICES_REQUEST"
  | "FORM_START_CONSULT_REQUEST"
  | "FORM_SUBMIT_CONSULT_REQUEST_SUCCESS"
  | "EMAIL_CAPTURE"
  | "LEAD_MAGNET_DOWNLOAD"
  | "NEWSLETTER_SUBSCRIBE"
  | "COMMUNITY_EVENT_REGISTER";

const ALLOWED_KEYS: MeasurementEventKey[] = [
  "CTA_CLICK_VIEW_TRAINING_TRACKS",
  "CTA_CLICK_BOOK_TECHNICAL_CONSULT",
  "PAGE_VIEW_HOME",
  "PAGE_VIEW_SERVICES",
  "PAGE_VIEW_SERVICE_DETAIL",
  "PAGE_VIEW_SERVICES_REQUEST",
  "FORM_START_CONSULT_REQUEST",
  "FORM_SUBMIT_CONSULT_REQUEST_SUCCESS",
  "EMAIL_CAPTURE",
  "LEAD_MAGNET_DOWNLOAD",
  "NEWSLETTER_SUBSCRIBE",
  "COMMUNITY_EVENT_REGISTER",
];

export class InvalidMeasurementEventError extends Error {
  constructor(public readonly reason: "invalid_key" | "invalid_path" | "metadata_too_large") {
    super(`Invalid measurement event: ${reason}`);
    this.name = "InvalidMeasurementEventError";
  }
}

const ensureMeasurementSchema = (db: Database.Database): void => {
  db.exec(`
CREATE TABLE IF NOT EXISTS measurement_events (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  path TEXT NOT NULL,
  actor_user_id TEXT,
  anonymous_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_measurement_events_key_time ON measurement_events(event_key, created_at);
CREATE INDEX IF NOT EXISTS idx_measurement_events_time ON measurement_events(created_at);
CREATE INDEX IF NOT EXISTS idx_measurement_events_path_time ON measurement_events(path, created_at);
`);
};

const normalizePath = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.length > 256) return null;
  return trimmed;
};

const safeJson = (value: unknown): string | null => {
  if (value === undefined) return null;
  if (value === null) return null;

  const raw = JSON.stringify(value);
  if (raw.length > 4096) {
    throw new InvalidMeasurementEventError("metadata_too_large");
  }
  return raw;
};

export const recordMeasurementEvent = (input: {
  key: string;
  path: string;
  actorUserId: string | null;
  anonymousId: string | null;
  metadata?: unknown;
  createdAtIso?: string;
}): void => {
  const normalizedKey = input.key.trim().toUpperCase();
  if (!ALLOWED_KEYS.includes(normalizedKey as MeasurementEventKey)) {
    throw new InvalidMeasurementEventError("invalid_key");
  }

  const path = normalizePath(input.path);
  if (!path) {
    throw new InvalidMeasurementEventError("invalid_path");
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    ensureMeasurementSchema(db);
    db.prepare(
      "INSERT INTO measurement_events (id, event_key, path, actor_user_id, anonymous_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      normalizedKey,
      path,
      input.actorUserId,
      input.anonymousId,
      safeJson(input.metadata),
      input.createdAtIso ?? new Date().toISOString(),
    );
  } finally {
    db.close();
  }
};

export type MeasurementSummary = {
  window: "7d" | "30d";
  totals: Array<{ event_key: MeasurementEventKey; count: number }>;
  funnel: {
    label: string;
    view: number;
    start: number;
    submit: number;
  };
  topCtas: Array<{ event_key: MeasurementEventKey; count: number }>;
};

const startIsoForWindow = (window: "7d" | "30d"): string => {
  const now = Date.now();
  const ms = window === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return new Date(now - ms).toISOString();
};

const countByKeySince = (db: ReturnType<typeof openCliDb>, keys: MeasurementEventKey[], sinceIso: string) => {
  const placeholders = keys.map(() => "?").join(",");
  const rows = db
    .prepare(
      `
SELECT event_key as event_key, COUNT(1) as count
FROM measurement_events
WHERE created_at >= ? AND event_key IN (${placeholders})
GROUP BY event_key
ORDER BY count DESC
`,
    )
    .all(sinceIso, ...keys) as Array<{ event_key: MeasurementEventKey; count: number }>;

  const map = new Map<MeasurementEventKey, number>();
  for (const row of rows) {
    map.set(row.event_key, row.count);
  }

  return keys.map((key) => ({ event_key: key, count: map.get(key) ?? 0 }));
};

const countSingleKeySince = (db: ReturnType<typeof openCliDb>, key: MeasurementEventKey, sinceIso: string): number => {
  const row = db
    .prepare("SELECT COUNT(1) as count FROM measurement_events WHERE created_at >= ? AND event_key = ?")
    .get(sinceIso, key) as { count: number };
  return row.count;
};

export const getMeasurementSummaryAdmin = (window: "7d" | "30d"): MeasurementSummary => {
  const sinceIso = startIsoForWindow(window);
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    ensureMeasurementSchema(db);
    const totals = countByKeySince(db, ALLOWED_KEYS, sinceIso);

    const funnel = {
      label: "Consult request (services/request)",
      view: countSingleKeySince(db, "PAGE_VIEW_SERVICES_REQUEST", sinceIso),
      start: countSingleKeySince(db, "FORM_START_CONSULT_REQUEST", sinceIso),
      submit: countSingleKeySince(db, "FORM_SUBMIT_CONSULT_REQUEST_SUCCESS", sinceIso),
    };

    const topCtas = countByKeySince(
      db,
      ["CTA_CLICK_BOOK_TECHNICAL_CONSULT", "CTA_CLICK_VIEW_TRAINING_TRACKS"],
      sinceIso,
    );

    return {
      window,
      totals,
      funnel,
      topCtas,
    };
  } finally {
    db.close();
  }
};
