import { createHmac, randomUUID } from "node:crypto";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { fkUserId, type ApiActor } from "./actor";

export type NewsletterStatus = "DRAFT" | "REVIEWED" | "PUBLISHED";
export type NewsletterSection = "MODELS" | "MONEY" | "PEOPLE" | "FROM_FIELD" | "NEXT_STEPS";

export type NewsletterIssueRecord = {
  id: string;
  title: string;
  issue_date: string;
  status: NewsletterStatus;
  scheduled_for?: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsletterBlockRecord = {
  id: string;
  issue_id: string;
  section: NewsletterSection;
  content_md: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type NewsletterProvenance = {
  field_reports: Array<{ id: string; event_title: string; user_email: string }>;
  research_sources: Array<{ url: string; title: string | null }>;
};

export type NewsletterIssueDetail = NewsletterIssueRecord & {
  blocks: Record<NewsletterSection, NewsletterBlockRecord>;
  provenance: Record<NewsletterSection, NewsletterProvenance>;
};

export class NewsletterIssueNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Newsletter issue not found: ${id}`);
    this.name = "NewsletterIssueNotFoundError";
  }
}

export class NewsletterPublishGuardrailError extends Error {
  constructor(public readonly reason: "not_reviewed" | "already_published") {
    super(`Publish guardrail: ${reason}`);
    this.name = "NewsletterPublishGuardrailError";
  }
}

const SECTION_ORDER: Record<NewsletterSection, number> = {
  MODELS: 10,
  MONEY: 20,
  PEOPLE: 30,
  FROM_FIELD: 40,
  NEXT_STEPS: 50,
};

const normalizeDate = (value: string): string => value.trim();

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const isValidEmail = (value: string): boolean => /^\S+@\S+\.\S+$/.test(value);

const unsubscribeSecret = (): string => process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ?? "local-dev-newsletter-unsubscribe";

const signUnsubscribeToken = (subscriberId: string, unsubscribeSeed: string): string =>
  createHmac("sha256", unsubscribeSecret()).update(`${subscriberId}:${unsubscribeSeed}`).digest("hex");

const buildUnsubscribeToken = (subscriberId: string, unsubscribeSeed: string): string =>
  `${subscriberId}.${signUnsubscribeToken(subscriberId, unsubscribeSeed)}`;

const parseUnsubscribeToken = (token: string): { subscriberId: string; signature: string } => {
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 2 || parts[0]!.length === 0 || parts[1]!.length === 0) {
    throw new Error("invalid_unsubscribe_token");
  }

  return { subscriberId: parts[0]!, signature: parts[1]! };
};

export type NewsletterSubscriberStatus = "ACTIVE" | "UNSUBSCRIBED";

export type NewsletterSubscriberRecord = {
  id: string;
  email: string;
  status: NewsletterSubscriberStatus;
  unsubscribe_seed: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};

const ensureIssue = (db: ReturnType<typeof openCliDb>, id: string): NewsletterIssueRecord => {
  const row = db
    .prepare(
      "SELECT id, title, issue_date, status, scheduled_for, published_at, published_by, created_by, created_at, updated_at FROM newsletter_issues WHERE id = ?",
    )
    .get(id) as NewsletterIssueRecord | undefined;

  if (!row) {
    throw new NewsletterIssueNotFoundError(id);
  }

  return row;
};

export const createNewsletterIssue = (input: {
  title: string;
  issueDate: string;
  actor: ApiActor;
  requestId: string;
}): NewsletterIssueRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();
    const id = randomUUID();
    const title = input.title.trim();
    const issueDate = normalizeDate(input.issueDate);

    if (title.length === 0) {
      throw new Error("title_required");
    }

    if (issueDate.length === 0) {
      throw new Error("issue_date_required");
    }

    db.prepare(
      "INSERT INTO newsletter_issues (id, title, issue_date, status, published_at, published_by, created_by, created_at, updated_at) VALUES (?, ?, ?, 'DRAFT', NULL, NULL, ?, ?, ?)",
    ).run(id, title, issueDate, fkUserId(input.actor), now, now);

    for (const section of Object.keys(SECTION_ORDER) as NewsletterSection[]) {
      db.prepare(
        "INSERT INTO newsletter_blocks (id, issue_id, section, content_md, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(randomUUID(), id, section, "", SECTION_ORDER[section], now, now);
    }

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.issue.create",
      targetType: "newsletter_issue",
      requestId: input.requestId,
      metadata: { issueId: id, title, issueDate },
    });

    return ensureIssue(db, id);
  } finally {
    db.close();
  }
};

export const listNewsletterIssues = (): { count: number; items: NewsletterIssueRecord[] } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const countRow = db.prepare("SELECT COUNT(*) as count FROM newsletter_issues").get() as { count: number };
    const items = db
      .prepare(
        "SELECT id, title, issue_date, status, scheduled_for, published_at, published_by, created_by, created_at, updated_at FROM newsletter_issues ORDER BY issue_date DESC, created_at DESC",
      )
      .all() as NewsletterIssueRecord[];

    return { count: countRow.count, items };
  } finally {
    db.close();
  }
};

const loadBlocks = (db: ReturnType<typeof openCliDb>, issueId: string) => {
  const blocks = db
    .prepare(
      "SELECT id, issue_id, section, content_md, sort_order, created_at, updated_at FROM newsletter_blocks WHERE issue_id = ? ORDER BY sort_order ASC",
    )
    .all(issueId) as NewsletterBlockRecord[];

  const bySection = {} as Record<NewsletterSection, NewsletterBlockRecord>;
  for (const block of blocks) {
    bySection[block.section] = block;
  }

  return bySection;
};

const loadProvenance = (db: ReturnType<typeof openCliDb>, issueId: string): Record<NewsletterSection, NewsletterProvenance> => {
  const sources = db
    .prepare(
      `
SELECT
  tag,
  fr.id as field_report_id,
  e.title as event_title,
  u.email as user_email
FROM newsletter_issue_field_reports nfr
JOIN field_reports fr ON fr.id = nfr.field_report_id
JOIN events e ON e.id = fr.event_id
JOIN users u ON u.id = fr.user_id
WHERE nfr.issue_id = ?
ORDER BY fr.created_at DESC
`,
    )
    .all(issueId) as Array<{ tag: NewsletterSection; field_report_id: string; event_title: string; user_email: string }>;

  const research = db
    .prepare("SELECT url, title FROM newsletter_issue_research_sources WHERE issue_id = ? ORDER BY created_at DESC")
    .all(issueId) as Array<{ url: string; title: string | null }>;

  const base: Record<NewsletterSection, NewsletterProvenance> = {
    MODELS: { field_reports: [], research_sources: [] },
    MONEY: { field_reports: [], research_sources: [] },
    PEOPLE: { field_reports: [], research_sources: [] },
    FROM_FIELD: { field_reports: [], research_sources: [] },
    NEXT_STEPS: { field_reports: [], research_sources: [] },
  };

  for (const row of sources) {
    const tag = row.tag;
    if (!base[tag]) continue;
    base[tag].field_reports.push({ id: row.field_report_id, event_title: row.event_title, user_email: row.user_email });
  }

  for (const section of Object.keys(base) as NewsletterSection[]) {
    base[section].research_sources = research;
  }

  return base;
};

export const getNewsletterIssue = (id: string): NewsletterIssueDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const issue = ensureIssue(db, id);
    const blocks = loadBlocks(db, id);
    const provenance = loadProvenance(db, id);

    return { ...issue, blocks, provenance };
  } finally {
    db.close();
  }
};

export const updateNewsletterIssue = (input: {
  id: string;
  title?: string;
  issueDate?: string;
  scheduledFor?: string | null;
  blocks?: Partial<Record<NewsletterSection, string>>;
  actor: ApiActor;
  requestId: string;
}): NewsletterIssueDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const issue = ensureIssue(db, input.id);
    const now = new Date().toISOString();

    const nextTitle = typeof input.title === "string" ? input.title.trim() : issue.title;
    const nextDate = typeof input.issueDate === "string" ? normalizeDate(input.issueDate) : issue.issue_date;
    const nextScheduled = input.scheduledFor === undefined ? (issue.scheduled_for ?? null) : input.scheduledFor;

    db.prepare("UPDATE newsletter_issues SET title = ?, issue_date = ?, scheduled_for = ?, updated_at = ? WHERE id = ?").run(
      nextTitle,
      nextDate,
      nextScheduled,
      now,
      input.id,
    );

    if (input.blocks) {
      for (const [section, content] of Object.entries(input.blocks) as Array<[NewsletterSection, string]>) {
        if (typeof content !== "string") continue;
        db.prepare("UPDATE newsletter_blocks SET content_md = ?, updated_at = ? WHERE issue_id = ? AND section = ?").run(
          content,
          now,
          input.id,
          section,
        );
      }
    }

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.issue.update",
      targetType: "newsletter_issue",
      requestId: input.requestId,
      metadata: { issueId: input.id },
    });

    return getNewsletterIssue(input.id);
  } finally {
    db.close();
  }
};

export const attachFieldReportToNewsletterIssue = (input: {
  issueId: string;
  fieldReportId: string;
  tag?: NewsletterSection;
  actor: ApiActor;
  requestId: string;
}): NewsletterIssueDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    ensureIssue(db, input.issueId);
    const now = new Date().toISOString();

    const report = db
      .prepare(
        "SELECT fr.id as id FROM field_reports fr WHERE fr.id = ?",
      )
      .get(input.fieldReportId) as { id: string } | undefined;

    if (!report) {
      throw new Error("field_report_not_found");
    }

    const tag: NewsletterSection = input.tag ?? "FROM_FIELD";

    db.prepare(
      "INSERT OR IGNORE INTO newsletter_issue_field_reports (id, issue_id, field_report_id, tag, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(randomUUID(), input.issueId, input.fieldReportId, tag, now);

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.issue.attach_field_report",
      targetType: "newsletter_issue",
      requestId: input.requestId,
      metadata: { issueId: input.issueId, fieldReportId: input.fieldReportId, tag },
    });

    return getNewsletterIssue(input.issueId);
  } finally {
    db.close();
  }
};

export const attachIngestedItemToNewsletterIssue = (input: {
  issueId: string;
  ingestedItemId: string;
  tag?: NewsletterSection;
  actor: ApiActor;
  requestId: string;
}): NewsletterIssueDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    ensureIssue(db, input.issueId);
    const now = new Date().toISOString();

    const item = db
      .prepare(
        "SELECT id FROM ingested_items WHERE id = ?",
      )
      .get(input.ingestedItemId) as { id: string } | undefined;

    if (!item) {
      throw new Error("ingested_item_not_found");
    }

    const tag: NewsletterSection = input.tag ?? "FROM_FIELD";

    db.prepare(
      "INSERT OR IGNORE INTO newsletter_issue_ingested_items (id, issue_id, ingested_item_id, tag, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(randomUUID(), input.issueId, input.ingestedItemId, tag, now);

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.issue.attach_ingested_item",
      targetType: "newsletter_issue",
      requestId: input.requestId,
      metadata: { issueId: input.issueId, ingestedItemId: input.ingestedItemId, tag },
    });

    return getNewsletterIssue(input.issueId);
  } finally {
    db.close();
  }
};

export const subscribeNewsletter = (input: { email: string; requestId: string }): { ok: true } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();
    const email = normalizeEmail(input.email);

    if (!isValidEmail(email)) {
      throw new Error("invalid_email");
    }

    const existing = db
      .prepare(
        "SELECT id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at FROM newsletter_subscribers WHERE email = ?",
      )
      .get(email) as NewsletterSubscriberRecord | undefined;

    if (!existing) {
      db.prepare(
        "INSERT INTO newsletter_subscribers (id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at) VALUES (?, ?, 'ACTIVE', ?, NULL, ?, ?)",
      ).run(randomUUID(), email, randomUUID(), now, now);
      return { ok: true };
    }

    if (existing.status === "ACTIVE") {
      return { ok: true };
    }

    db.prepare(
      "UPDATE newsletter_subscribers SET status = 'ACTIVE', unsubscribe_seed = ?, unsubscribed_at = NULL, updated_at = ? WHERE id = ?",
    ).run(randomUUID(), now, existing.id);

    return { ok: true };
  } finally {
    db.close();
  }
};

export const unsubscribeNewsletter = (input: { token: string; requestId: string }): { ok: true } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();
    const parsed = parseUnsubscribeToken(input.token);

    const subscriber = db
      .prepare(
        "SELECT id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at FROM newsletter_subscribers WHERE id = ?",
      )
      .get(parsed.subscriberId) as NewsletterSubscriberRecord | undefined;

    if (!subscriber) {
      throw new Error("invalid_unsubscribe_token");
    }

    const expectedSignature = signUnsubscribeToken(subscriber.id, subscriber.unsubscribe_seed);
    if (expectedSignature !== parsed.signature) {
      throw new Error("invalid_unsubscribe_token");
    }

    if (subscriber.status === "UNSUBSCRIBED") {
      return { ok: true };
    }

    db.prepare(
      "UPDATE newsletter_subscribers SET status = 'UNSUBSCRIBED', unsubscribed_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, subscriber.id);

    return { ok: true };
  } finally {
    db.close();
  }
};

export const listActiveNewsletterSubscribers = (): Array<{ id: string; email: string; unsubscribeToken: string }> => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const rows = db
      .prepare("SELECT id, email, unsubscribe_seed FROM newsletter_subscribers WHERE status = 'ACTIVE' ORDER BY created_at ASC")
      .all() as Array<{ id: string; email: string; unsubscribe_seed: string }>;

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      unsubscribeToken: buildUnsubscribeToken(row.id, row.unsubscribe_seed),
    }));
  } finally {
    db.close();
  }
};

const takeFirstLine = (value: string): string | null => {
  const line = value
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return line ?? null;
};

export const generateNewsletterDraft = (input: {
  id: string;
  actor: ApiActor;
  requestId: string;
  fieldReportIds?: string[];
  researchUrls?: Array<{ url: string; title?: string | null }>;
}): NewsletterIssueDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    ensureIssue(db, input.id);
    const now = new Date().toISOString();

    const selectedFieldReports = (() => {
      const ids = Array.isArray(input.fieldReportIds) ? input.fieldReportIds.filter(Boolean) : [];
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        return db
          .prepare(
            `
SELECT fr.id, fr.models, fr.money, fr.people, fr.key_insights, fr.what_i_tried, fr.client_advice, fr.summary,
       e.title as event_title, u.email as user_email
FROM field_reports fr
JOIN events e ON e.id = fr.event_id
JOIN users u ON u.id = fr.user_id
WHERE fr.id IN (${placeholders})
ORDER BY fr.created_at DESC
`,
          )
          .all(...ids) as Array<{
          id: string;
          models: string;
          money: string;
          people: string;
          key_insights: string;
          what_i_tried: string;
          client_advice: string;
          summary: string | null;
          event_title: string;
          user_email: string;
        }>;
      }

      return db
        .prepare(
          `
SELECT fr.id, fr.models, fr.money, fr.people, fr.key_insights, fr.what_i_tried, fr.client_advice, fr.summary,
       e.title as event_title, u.email as user_email
FROM field_reports fr
JOIN events e ON e.id = fr.event_id
JOIN users u ON u.id = fr.user_id
WHERE fr.featured = 1
ORDER BY fr.created_at DESC
LIMIT 5
`,
        )
        .all() as Array<{
        id: string;
        models: string;
        money: string;
        people: string;
        key_insights: string;
        what_i_tried: string;
        client_advice: string;
        summary: string | null;
        event_title: string;
        user_email: string;
      }>;
    })();

    db.prepare("DELETE FROM newsletter_issue_field_reports WHERE issue_id = ?").run(input.id);
    db.prepare("DELETE FROM newsletter_issue_research_sources WHERE issue_id = ?").run(input.id);

    const research = Array.isArray(input.researchUrls) ? input.researchUrls : [];
    for (const source of research) {
      const url = source.url?.trim();
      if (!url) continue;
      db.prepare(
        "INSERT OR IGNORE INTO newsletter_issue_research_sources (id, issue_id, url, title, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(randomUUID(), input.id, url, source.title ?? null, now);
    }

    const tagFieldReports = (tag: Exclude<NewsletterSection, "NEXT_STEPS">) => {
      for (const report of selectedFieldReports) {
        db.prepare(
          "INSERT OR IGNORE INTO newsletter_issue_field_reports (id, issue_id, field_report_id, tag, created_at) VALUES (?, ?, ?, ?, ?)",
        ).run(randomUUID(), input.id, report.id, tag, now);
      }
    };

    tagFieldReports("MODELS");
    tagFieldReports("MONEY");
    tagFieldReports("PEOPLE");
    tagFieldReports("FROM_FIELD");

    const bullets = (items: Array<string | null | undefined>) =>
      items
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => `- ${v.trim()}`)
        .join("\n");

    const modelsBlock = bullets(selectedFieldReports.map((r) => takeFirstLine(r.models) ?? takeFirstLine(r.key_insights)));
    const moneyBlock = bullets(selectedFieldReports.map((r) => takeFirstLine(r.money) ?? takeFirstLine(r.key_insights)));
    const peopleBlock = bullets(selectedFieldReports.map((r) => takeFirstLine(r.people) ?? takeFirstLine(r.key_insights)));

    const fromFieldBlock = selectedFieldReports
      .map((r) => {
        const summary = (r.summary ?? takeFirstLine(r.key_insights) ?? "Field report").trim();
        return `- ${summary} (Event: ${r.event_title} · Reporter: ${r.user_email})`;
      })
      .join("\n");

    const nextStepsBlock = bullets([
      "Pick one workflow and define an evaluation gate before you scale tooling.",
      "Write a short rubric for review: what passes, what fails, and what must be proven.",
      "Turn insights into actions with owners and deadlines (don’t let it stay a memo).",
    ]);

    const upsertBlock = (section: NewsletterSection, content: string) => {
      db.prepare("UPDATE newsletter_blocks SET content_md = ?, updated_at = ? WHERE issue_id = ? AND section = ?").run(
        content,
        now,
        input.id,
        section,
      );
    };

    upsertBlock("MODELS", modelsBlock);
    upsertBlock("MONEY", moneyBlock);
    upsertBlock("PEOPLE", peopleBlock);
    upsertBlock("FROM_FIELD", fromFieldBlock);
    upsertBlock("NEXT_STEPS", nextStepsBlock);

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.issue.generate",
      targetType: "newsletter_issue",
      requestId: input.requestId,
      metadata: { issueId: input.id, fieldReports: selectedFieldReports.map((r) => r.id), researchCount: research.length },
    });

    return getNewsletterIssue(input.id);
  } finally {
    db.close();
  }
};

export const markNewsletterReviewed = (input: { id: string; actor: ApiActor; requestId: string }): NewsletterIssueDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const issue = ensureIssue(db, input.id);
    const now = new Date().toISOString();

    if (issue.status === "PUBLISHED") {
      return getNewsletterIssue(input.id);
    }

    db.prepare("UPDATE newsletter_issues SET status = 'REVIEWED', updated_at = ? WHERE id = ?").run(now, input.id);

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.issue.review",
      targetType: "newsletter_issue",
      requestId: input.requestId,
      metadata: { issueId: input.id },
    });

    return getNewsletterIssue(input.id);
  } finally {
    db.close();
  }
};

export const publishNewsletterIssue = (input: { id: string; actor: ApiActor; requestId: string }): NewsletterIssueDetail => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const issue = ensureIssue(db, input.id);
    const now = new Date().toISOString();

    if (issue.status === "PUBLISHED") {
      throw new NewsletterPublishGuardrailError("already_published");
    }

    if (issue.status !== "REVIEWED") {
      throw new NewsletterPublishGuardrailError("not_reviewed");
    }

    db.prepare("UPDATE newsletter_issues SET status = 'PUBLISHED', published_at = ?, published_by = ?, updated_at = ? WHERE id = ?").run(
      now,
      fkUserId(input.actor),
      now,
      input.id,
    );

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.issue.publish",
      targetType: "newsletter_issue",
      requestId: input.requestId,
      metadata: { issueId: input.id },
    });

    return getNewsletterIssue(input.id);
  } finally {
    db.close();
  }
};

const sectionTitle = (section: NewsletterSection): string => {
  if (section === "MODELS") return "Models";
  if (section === "MONEY") return "Money";
  if (section === "PEOPLE") return "People";
  if (section === "FROM_FIELD") return "From the field";
  return "What to do next";
};

export const exportNewsletterMarkdown = (input: { id: string; baseUrl?: string }): string => {
  const issue = getNewsletterIssue(input.id);
  const baseUrl = input.baseUrl?.replace(/\/$/, "") ?? "";

  const parts: string[] = [];
  parts.push(`# ${issue.title}`);
  parts.push("");
  parts.push(`Issue date: ${issue.issue_date}`);
  parts.push(`Status: ${issue.status}`);
  parts.push("");

  const sections: NewsletterSection[] = ["MODELS", "MONEY", "PEOPLE", "FROM_FIELD", "NEXT_STEPS"];

  for (const section of sections) {
    const block = issue.blocks[section];
    const prov = issue.provenance[section];
    parts.push(`## ${sectionTitle(section)}`);
    parts.push("");
    parts.push(block?.content_md?.trim() ? block.content_md.trim() : "- (Empty)"
    );
    parts.push("");
    parts.push("Provenance:");

    if (prov.field_reports.length === 0 && prov.research_sources.length === 0) {
      parts.push("- (None)");
    } else {
      for (const fr of prov.field_reports) {
        const href = baseUrl ? `${baseUrl}/admin/field-reports/${fr.id}` : `/admin/field-reports/${fr.id}`;
        parts.push(`- Field report: ${fr.event_title} (${fr.user_email}) — ${href}`);
      }

      for (const rs of prov.research_sources) {
        const label = rs.title ? `${rs.title} — ${rs.url}` : rs.url;
        parts.push(`- Research: ${label}`);
      }
    }

    parts.push("");
  }

  return parts.join("\n").trim() + "\n";
};

export type NewsletterSendRunRecord = {
  id: string;
  issue_id: string;
  scheduled_for: string;
  sent_at: string | null;
  attempted_count: number;
  sent_count: number;
  bounced_count: number;
  created_at: string;
  updated_at: string;
};

export type NewsletterDeliveryEventType = "DELIVERED" | "BOUNCED" | "COMPLAINT";

export type NewsletterDeliveryEventRecord = {
  id: string;
  run_id: string;
  email: string;
  event_type: NewsletterDeliveryEventType;
  error_message: string | null;
  created_at: string;
};

export class NewsletterScheduleGuardrailError extends Error {
  constructor(public readonly reason: "not_published" | "invalid_scheduled_for") {
    super(`Schedule guardrail: ${reason}`);
    this.name = "NewsletterScheduleGuardrailError";
  }
}

export const scheduleNewsletterSend = (input: {
  issueId: string;
  scheduledFor: string;
  actor: ApiActor;
  requestId: string;
}): NewsletterSendRunRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const issue = ensureIssue(db, input.issueId);
    const now = new Date().toISOString();
    const scheduledFor = input.scheduledFor.trim();

    if (Number.isNaN(Date.parse(scheduledFor))) {
      throw new NewsletterScheduleGuardrailError("invalid_scheduled_for");
    }

    if (issue.status !== "PUBLISHED") {
      throw new NewsletterScheduleGuardrailError("not_published");
    }

    const pending = db
      .prepare(
        "SELECT id, issue_id, scheduled_for, sent_at, attempted_count, sent_count, bounced_count, created_at, updated_at FROM newsletter_send_runs WHERE issue_id = ? AND sent_at IS NULL",
      )
      .get(input.issueId) as NewsletterSendRunRecord | undefined;

    if (pending) {
      db.prepare("UPDATE newsletter_send_runs SET scheduled_for = ?, updated_at = ? WHERE id = ?").run(
        scheduledFor,
        now,
        pending.id,
      );
      db.prepare("UPDATE newsletter_issues SET scheduled_for = ?, updated_at = ? WHERE id = ?").run(
        scheduledFor,
        now,
        input.issueId,
      );

      appendAuditLog(db, {
        actorType: input.actor.type,
        actorId: input.actor.id,
        action: "api.newsletter.send.schedule",
        targetType: "newsletter_send_run",
        requestId: input.requestId,
        metadata: { issueId: input.issueId, runId: pending.id, scheduledFor },
      });

      return db
        .prepare(
          "SELECT id, issue_id, scheduled_for, sent_at, attempted_count, sent_count, bounced_count, created_at, updated_at FROM newsletter_send_runs WHERE id = ?",
        )
        .get(pending.id) as NewsletterSendRunRecord;
    }

    const runId = randomUUID();
    db.prepare(
      "INSERT INTO newsletter_send_runs (id, issue_id, scheduled_for, sent_at, attempted_count, sent_count, bounced_count, created_at, updated_at) VALUES (?, ?, ?, NULL, 0, 0, 0, ?, ?)",
    ).run(runId, input.issueId, scheduledFor, now, now);

    db.prepare("UPDATE newsletter_issues SET scheduled_for = ?, updated_at = ? WHERE id = ?").run(scheduledFor, now, input.issueId);

    appendAuditLog(db, {
      actorType: input.actor.type,
      actorId: input.actor.id,
      action: "api.newsletter.send.schedule",
      targetType: "newsletter_send_run",
      requestId: input.requestId,
      metadata: { issueId: input.issueId, runId, scheduledFor },
    });

    return db
      .prepare(
        "SELECT id, issue_id, scheduled_for, sent_at, attempted_count, sent_count, bounced_count, created_at, updated_at FROM newsletter_send_runs WHERE id = ?",
      )
      .get(runId) as NewsletterSendRunRecord;
  } finally {
    db.close();
  }
};

export const listNewsletterSendRuns = (issueId: string): NewsletterSendRunRecord[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    ensureIssue(db, issueId);
    return db
      .prepare(
        "SELECT id, issue_id, scheduled_for, sent_at, attempted_count, sent_count, bounced_count, created_at, updated_at FROM newsletter_send_runs WHERE issue_id = ? ORDER BY created_at DESC",
      )
      .all(issueId) as NewsletterSendRunRecord[];
  } finally {
    db.close();
  }
};

type EmailProviderResult = { ok: true; provider: string; messageId?: string } | { ok: false; provider: string; error: string };

const newsletterBaseUrl = (): string => (process.env.NEWSLETTER_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const toEmailHtml = (markdown: string): string => {
  const escaped = markdown
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<!doctype html><html><body><pre style="white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${escaped}</pre></body></html>`;
};

const sendNewsletterEmail = async (input: {
  to: string;
  subject: string;
  markdownBody: string;
}): Promise<EmailProviderResult> => {
  const provider = (process.env.NEWSLETTER_EMAIL_PROVIDER ?? "console").toLowerCase();

  if (provider === "console") {
    return { ok: true, provider: "console" };
  }

  if (provider === "postmark") {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    const from = process.env.NEWSLETTER_FROM_EMAIL;

    if (!token || !from) {
      return { ok: false, provider: "postmark", error: "missing_postmark_config" };
    }

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: input.to,
        Subject: input.subject,
        TextBody: input.markdownBody,
        HtmlBody: toEmailHtml(input.markdownBody),
        MessageStream: process.env.POSTMARK_MESSAGE_STREAM ?? "outbound",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, provider: "postmark", error: `postmark_http_${response.status}:${body}` };
    }

    const json = (await response.json()) as { MessageID?: string };
    return { ok: true, provider: "postmark", messageId: json.MessageID };
  }

  return { ok: false, provider, error: "unsupported_provider" };
};

export const dispatchDueNewsletterRuns = async (input?: { nowIso?: string; limitRuns?: number }): Promise<{ dispatched: number }> => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = input?.nowIso ?? new Date().toISOString();
    const limit = typeof input?.limitRuns === "number" && input.limitRuns > 0 ? input.limitRuns : 10;

    const dueRuns = db
      .prepare(
        `
SELECT id, issue_id, scheduled_for, sent_at, attempted_count, sent_count, bounced_count, created_at, updated_at
FROM newsletter_send_runs
WHERE sent_at IS NULL AND scheduled_for <= ?
ORDER BY scheduled_for ASC
LIMIT ?
`,
      )
      .all(now, limit) as NewsletterSendRunRecord[];

    if (dueRuns.length === 0) {
      return { dispatched: 0 };
    }

    const baseUrl = newsletterBaseUrl();
    const fromLabel = "Ordo Brief";

    for (const run of dueRuns) {
      const issue = ensureIssue(db, run.issue_id);
      if (issue.status !== "PUBLISHED") {
        db.prepare("UPDATE newsletter_send_runs SET sent_at = ?, updated_at = ? WHERE id = ?").run(now, now, run.id);
        continue;
      }

      const subscribers = db
        .prepare(
          "SELECT id, email, unsubscribe_seed FROM newsletter_subscribers WHERE status = 'ACTIVE' ORDER BY created_at ASC",
        )
        .all() as Array<{ id: string; email: string; unsubscribe_seed: string }>;

      const subject = `${fromLabel} — ${issue.issue_date}`;
      const md = exportNewsletterMarkdown({ id: issue.id, baseUrl });

      let attempted = 0;
      let sent = 0;
      let bounced = 0;

      for (const subscriber of subscribers) {
        attempted += 1;
        const token = buildUnsubscribeToken(subscriber.id, subscriber.unsubscribe_seed);
        const unsubscribeUrl = `${baseUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
        const body = `${md}\n\n---\n\nUnsubscribe: ${unsubscribeUrl}\n`;

        let result: EmailProviderResult;
        try {
          result = await sendNewsletterEmail({ to: subscriber.email, subject, markdownBody: body });
        } catch (error) {
          const message = error instanceof Error ? error.message : "send_failed";
          result = { ok: false, provider: "unknown", error: message };
        }

        const eventId = randomUUID();
        const eventType: NewsletterDeliveryEventType = result.ok ? "DELIVERED" : "BOUNCED";
        const errorMessage = result.ok ? null : result.error;

        if (result.ok) {
          sent += 1;
        } else {
          bounced += 1;
        }

        db.prepare(
          "INSERT INTO newsletter_delivery_events (id, run_id, email, event_type, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(eventId, run.id, subscriber.email, eventType, errorMessage, now);
      }

      db.prepare(
        "UPDATE newsletter_send_runs SET sent_at = ?, attempted_count = ?, sent_count = ?, bounced_count = ?, updated_at = ? WHERE id = ?",
      ).run(now, attempted, sent, bounced, now, run.id);
      db.prepare("UPDATE newsletter_issues SET scheduled_for = NULL, updated_at = ? WHERE id = ?").run(now, issue.id);

      appendAuditLog(db, {
        actorType: "SERVICE",
        actorId: null,
        action: "api.newsletter.send.dispatch",
        targetType: "newsletter_send_run",
        requestId: randomUUID(),
        metadata: {
          issueId: issue.id,
          runId: run.id,
          attempted,
          sent,
          bounced,
          provider: process.env.NEWSLETTER_EMAIL_PROVIDER ?? "console",
        },
      });
    }

    return { dispatched: dueRuns.length };
  } finally {
    db.close();
  }
};
