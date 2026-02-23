import { randomUUID } from "node:crypto";
import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { fkUserId, type ApiActor } from "./actor";

export type FieldReportRecord = {
  id: string;
  event_id: string;
  event_slug: string;
  event_title: string;
  user_id: string;
  user_email: string;
  key_insights: string;
  models: string;
  money: string;
  people: string;
  what_i_tried: string;
  client_advice: string;
  summary: string | null;
  featured: 0 | 1;
  featured_at: string | null;
  featured_by: string | null;
  created_at: string;
  updated_at: string;
};

export class InvalidFieldReportInputError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid field report input: ${reason}`);
    this.name = "InvalidFieldReportInputError";
  }
}

export class FieldReportNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Field report not found: ${id}`);
    this.name = "FieldReportNotFoundError";
  }
}

const toSummaryFallback = (input: { summary?: string; keyInsights: string }): string | null => {
  if (input.summary && input.summary.trim().length > 0) {
    return input.summary.trim();
  }

  const firstLine = input.keyInsights
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return null;
  }

  return firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine;
};

const assertCreateInput = (input: {
  eventSlug?: string;
  keyInsights?: string;
  models?: string;
  money?: string;
  people?: string;
  whatITried?: string;
  clientAdvice?: string;
}): void => {
  if (!input.eventSlug || input.eventSlug.trim().length === 0) {
    throw new InvalidFieldReportInputError("event_required");
  }
  if (!input.keyInsights || input.keyInsights.trim().length === 0) {
    throw new InvalidFieldReportInputError("key_insights_required");
  }
  if (!input.models || input.models.trim().length === 0) {
    throw new InvalidFieldReportInputError("models_required");
  }
  if (!input.money || input.money.trim().length === 0) {
    throw new InvalidFieldReportInputError("money_required");
  }
  if (!input.people || input.people.trim().length === 0) {
    throw new InvalidFieldReportInputError("people_required");
  }
  if (!input.whatITried || input.whatITried.trim().length === 0) {
    throw new InvalidFieldReportInputError("what_i_tried_required");
  }
  if (!input.clientAdvice || input.clientAdvice.trim().length === 0) {
    throw new InvalidFieldReportInputError("client_advice_required");
  }
};

export const createFieldReport = (input: {
  userId: string;
  eventSlug: string;
  keyInsights: string;
  models: string;
  money: string;
  people: string;
  whatITried: string;
  clientAdvice: string;
  summary?: string;
  requestId: string;
}): FieldReportRecord => {
  assertCreateInput(input);

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = db
      .prepare("SELECT id, slug, title, status FROM events WHERE slug = ?")
      .get(input.eventSlug.trim()) as { id: string; slug: string; title: string; status: string } | undefined;

    if (!event) {
      throw new InvalidFieldReportInputError("event_not_found");
    }

    if (event.status !== "PUBLISHED") {
      throw new InvalidFieldReportInputError("event_not_published");
    }

    const user = db
      .prepare("SELECT id, email FROM users WHERE id = ?")
      .get(input.userId) as { id: string; email: string } | undefined;

    if (!user) {
      throw new InvalidFieldReportInputError("user_not_found");
    }

    const now = new Date().toISOString();
    const id = randomUUID();

    const summary = toSummaryFallback({ summary: input.summary, keyInsights: input.keyInsights });

    try {
      db.prepare(
        `
INSERT INTO field_reports (
  id, event_id, user_id, key_insights, models, money, people, what_i_tried, client_advice,
  summary, featured, featured_at, featured_by, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)
`,
      ).run(
        id,
        event.id,
        user.id,
        input.keyInsights.trim(),
        input.models.trim(),
        input.money.trim(),
        input.people.trim(),
        input.whatITried.trim(),
        input.clientAdvice.trim(),
        summary,
        now,
        now,
      );
    } catch (error) {
      if (String(error).includes("UNIQUE") || String(error).includes("unique")) {
        throw new InvalidFieldReportInputError("report_already_exists");
      }
      throw error;
    }

    appendAuditLog(db, {
      actorType: "USER",
      actorId: user.id,
      action: "api.field_report.create",
      targetType: "field_report",
      requestId: input.requestId,
      metadata: {
        fieldReportId: id,
        eventId: event.id,
        eventSlug: event.slug,
      },
    });

    return {
      id,
      event_id: event.id,
      event_slug: event.slug,
      event_title: event.title,
      user_id: user.id,
      user_email: user.email,
      key_insights: input.keyInsights.trim(),
      models: input.models.trim(),
      money: input.money.trim(),
      people: input.people.trim(),
      what_i_tried: input.whatITried.trim(),
      client_advice: input.clientAdvice.trim(),
      summary,
      featured: 0,
      featured_at: null,
      featured_by: null,
      created_at: now,
      updated_at: now,
    };
  } finally {
    db.close();
  }
};

export const listFieldReportsForUser = (input: { userId: string; limit?: number; offset?: number }) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const limit = typeof input.limit === "number" ? input.limit : 20;
    const offset = typeof input.offset === "number" ? input.offset : 0;

    const countRow = db
      .prepare("SELECT COUNT(*) as count FROM field_reports WHERE user_id = ?")
      .get(input.userId) as { count: number };

    const rows = db
      .prepare(
        `
SELECT
  fr.id,
  fr.event_id,
  e.slug as event_slug,
  e.title as event_title,
  fr.user_id,
  u.email as user_email,
  fr.key_insights,
  fr.models,
  fr.money,
  fr.people,
  fr.what_i_tried,
  fr.client_advice,
  fr.summary,
  fr.featured,
  fr.featured_at,
  fr.featured_by,
  fr.created_at,
  fr.updated_at
FROM field_reports fr
JOIN events e ON e.id = fr.event_id
JOIN users u ON u.id = fr.user_id
WHERE fr.user_id = ?
ORDER BY fr.created_at DESC
LIMIT ? OFFSET ?
`,
      )
      .all(input.userId, limit, offset) as FieldReportRecord[];

    return { count: countRow.count, limit, offset, items: rows };
  } finally {
    db.close();
  }
};

export const listFieldReportsAdmin = (input?: { limit?: number; offset?: number }) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const limit = typeof input?.limit === "number" ? input.limit : 50;
    const offset = typeof input?.offset === "number" ? input.offset : 0;

    const countRow = db.prepare("SELECT COUNT(*) as count FROM field_reports").get() as { count: number };

    const rows = db
      .prepare(
        `
SELECT
  fr.id,
  fr.event_id,
  e.slug as event_slug,
  e.title as event_title,
  fr.user_id,
  u.email as user_email,
  fr.key_insights,
  fr.models,
  fr.money,
  fr.people,
  fr.what_i_tried,
  fr.client_advice,
  fr.summary,
  fr.featured,
  fr.featured_at,
  fr.featured_by,
  fr.created_at,
  fr.updated_at
FROM field_reports fr
JOIN events e ON e.id = fr.event_id
JOIN users u ON u.id = fr.user_id
ORDER BY fr.created_at DESC
LIMIT ? OFFSET ?
`,
      )
      .all(limit, offset) as FieldReportRecord[];

    return { count: countRow.count, limit, offset, items: rows };
  } finally {
    db.close();
  }
};

export const getFieldReportAdmin = (id: string): FieldReportRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const row = db
      .prepare(
        `
SELECT
  fr.id,
  fr.event_id,
  e.slug as event_slug,
  e.title as event_title,
  fr.user_id,
  u.email as user_email,
  fr.key_insights,
  fr.models,
  fr.money,
  fr.people,
  fr.what_i_tried,
  fr.client_advice,
  fr.summary,
  fr.featured,
  fr.featured_at,
  fr.featured_by,
  fr.created_at,
  fr.updated_at
FROM field_reports fr
JOIN events e ON e.id = fr.event_id
JOIN users u ON u.id = fr.user_id
WHERE fr.id = ?
LIMIT 1
`,
      )
      .get(id) as FieldReportRecord | undefined;

    if (!row) {
      throw new FieldReportNotFoundError(id);
    }

    return row;
  } finally {
    db.close();
  }
};

export const setFieldReportFeatured = (input: {
  id: string;
  featured: boolean;
  actor: ApiActor;
  requestId: string;
}): FieldReportRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const existing = getFieldReportAdmin(input.id);

    const now = new Date().toISOString();
    const featuredValue: 0 | 1 = input.featured ? 1 : 0;

    db.prepare(
      `
UPDATE field_reports
SET featured = ?, featured_at = ?, featured_by = ?, updated_at = ?
WHERE id = ?
`,
    ).run(
      featuredValue,
      input.featured ? now : null,
      input.featured ? fkUserId(input.actor) : null,
      now,
      input.id,
    );

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: input.featured ? "api.field_report.feature" : "api.field_report.unfeature",
      targetType: "field_report",
      requestId: input.requestId,
      metadata: {
        fieldReportId: input.id,
        from: existing.featured,
        to: featuredValue,
      },
    });

    return getFieldReportAdmin(input.id);
  } finally {
    db.close();
  }
};

const escapeCsv = (value: string): string => {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return `"${normalized.replaceAll('"', '""')}"`;
};

export const exportFieldReportsCsv = (): string => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const rows = db
      .prepare(
        `
SELECT
  fr.id,
  e.slug as event_slug,
  e.title as event_title,
  u.email as user_email,
  fr.summary,
  fr.featured,
  fr.created_at,
  fr.key_insights,
  fr.models,
  fr.money,
  fr.people,
  fr.what_i_tried,
  fr.client_advice
FROM field_reports fr
JOIN events e ON e.id = fr.event_id
JOIN users u ON u.id = fr.user_id
ORDER BY fr.created_at DESC
`,
      )
      .all() as Array<Record<string, unknown>>;

    const header = [
      "id",
      "event_slug",
      "event_title",
      "user_email",
      "summary",
      "featured",
      "created_at",
      "key_insights",
      "models",
      "money",
      "people",
      "what_i_tried",
      "client_advice",
    ].join(",");

    const lines = rows.map((row) => {
      return [
        escapeCsv(String(row.id ?? "")),
        escapeCsv(String(row.event_slug ?? "")),
        escapeCsv(String(row.event_title ?? "")),
        escapeCsv(String(row.user_email ?? "")),
        escapeCsv(String(row.summary ?? "")),
        escapeCsv(String(row.featured ?? 0)),
        escapeCsv(String(row.created_at ?? "")),
        escapeCsv(String(row.key_insights ?? "")),
        escapeCsv(String(row.models ?? "")),
        escapeCsv(String(row.money ?? "")),
        escapeCsv(String(row.people ?? "")),
        escapeCsv(String(row.what_i_tried ?? "")),
        escapeCsv(String(row.client_advice ?? "")),
      ].join(",");
    });

    return [header, ...lines].join("\n");
  } finally {
    db.close();
  }
};
