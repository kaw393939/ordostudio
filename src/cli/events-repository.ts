import { openCliDb } from "@/platform/db";
import { AppConfig } from "./types";

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  capacity: number | null;
  description?: string | null;
  metadata_json?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const listEvents = (
  config: AppConfig,
  filters: { status?: string; fromIso?: string; toIso?: string },
): EventRecord[] => {
  const db = openCliDb(config);
  try {
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (filters.status) {
      clauses.push("status = ?");
      params.push(filters.status.toUpperCase());
    }

    if (filters.fromIso) {
      clauses.push("start_at >= ?");
      params.push(filters.fromIso);
    }

    if (filters.toIso) {
      clauses.push("start_at <= ?");
      params.push(filters.toIso);
    }

    const query = `
SELECT *
FROM events
${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
ORDER BY start_at ASC
`;

    return db.prepare(query).all(...params) as EventRecord[];
  } finally {
    db.close();
  }
};
