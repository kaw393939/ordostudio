import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { InvalidInputError } from "../../core/domain/errors";
import {
  normalizeEngagementOutcomeInput,
  parseEngagementSessionStatus,
  sortEngagementTimeline,
} from "../../core/use-cases/engagement-outcomes";
import {
  classifyReminderType,
  normalizeFollowUpDueAt,
  parseFollowUpStatus,
  transitionFollowUpStatus,
} from "../../core/use-cases/follow-up-lifecycle";
import type { SessionUser } from "./auth";
import { listRegistrationsForUser } from "./registrations";

export class ForbiddenEngagementAccessError extends Error {
  constructor() {
    super("forbidden_engagement_access");
    this.name = "ForbiddenEngagementAccessError";
  }
}

export class EngagementNotFoundError extends Error {
  constructor(public readonly slug: string) {
    super("engagement_not_found");
    this.name = "EngagementNotFoundError";
  }
}

export class EngagementActionNotFoundError extends Error {
  constructor(public readonly actionId: string) {
    super("engagement_action_not_found");
    this.name = "EngagementActionNotFoundError";
  }
}

export class EngagementReminderNotFoundError extends Error {
  constructor(public readonly reminderId: string) {
    super("engagement_reminder_not_found");
    this.name = "EngagementReminderNotFoundError";
  }
}

const hasTable = (db: Database.Database, name: string): boolean => {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { present?: number } | undefined;
  return Boolean(row?.present);
};

const parseOutcomes = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

const getEventBySlug = (db: Database.Database, slug: string): { id: string; slug: string; title: string } => {
  const found = db
    .prepare("SELECT id, slug, title FROM events WHERE slug = ?")
    .get(slug) as { id: string; slug: string; title: string } | undefined;

  if (!found) {
    throw new EngagementNotFoundError(slug);
  }

  return found;
};

const hasAccessToEvent = (db: Database.Database, eventId: string, user: SessionUser): boolean => {
  if (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN")) {
    return true;
  }

  const registration = db
    .prepare(
      `
SELECT id
FROM event_registrations
WHERE event_id = ? AND user_id = ? AND status IN ('REGISTERED','WAITLISTED','CHECKED_IN','CANCELLED')
LIMIT 1
`,
    )
    .get(eventId, user.id) as { id: string } | undefined;

  return Boolean(registration);
};

const requireEngagementAccess = (
  db: Database.Database,
  eventSlug: string,
  user: SessionUser,
): { id: string; slug: string; title: string } => {
  const event = getEventBySlug(db, eventSlug);
  if (!hasAccessToEvent(db, event.id, user)) {
    throw new ForbiddenEngagementAccessError();
  }
  return event;
};

export type MyEngagementTimelineItem = {
  registration_id: string;
  event_id: string;
  event_slug: string;
  event_title: string;
  event_status: string;
  start_at: string;
  end_at: string;
  timezone: string;
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  engagement_type: "INDIVIDUAL" | "GROUP";
  status: string;
  timeline_status: "UPCOMING" | "DELIVERED" | "CANCELLED";
  sessions_count: number;
  outcomes_count: number;
  open_action_items: number;
  blocked_action_items: number;
  artifacts_count: number;
  pending_reminders: number;
  next_step: string | null;
  feedback_submitted: boolean;
};

export const listMyEngagementTimeline = (userId: string): MyEngagementTimelineItem[] => {
  const registrations = listRegistrationsForUser(userId);
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const sessionsEnabled = hasTable(db, "engagement_sessions") && hasTable(db, "engagement_action_items");
    const artifactsEnabled = hasTable(db, "event_artifacts");
    const feedbackEnabled = hasTable(db, "engagement_feedback");

    const items: MyEngagementTimelineItem[] = registrations.map((registration): MyEngagementTimelineItem => {
      if (!sessionsEnabled && !artifactsEnabled && !feedbackEnabled) {
        return {
          ...registration,
          timeline_status: registration.status === "CANCELLED" ? "CANCELLED" : "UPCOMING",
          sessions_count: 0,
          outcomes_count: 0,
          open_action_items: 0,
          blocked_action_items: 0,
          artifacts_count: 0,
          pending_reminders: 0,
          next_step: null,
          feedback_submitted: false,
        };
      }

      const sessions = sessionsEnabled
        ? (db
            .prepare(
              `
SELECT id, outcomes_json, next_step, status, session_at
FROM engagement_sessions
WHERE event_id = ?
ORDER BY session_at DESC
`,
            )
            .all(registration.event_id) as {
            id: string;
            outcomes_json: string | null;
            next_step: string | null;
            status: "PLANNED" | "DELIVERED" | "FOLLOW_UP";
            session_at: string;
          }[])
        : [];

      const sessionsCount = sessions.length;
      const outcomesCount = sessions.reduce((total, session) => total + parseOutcomes(session.outcomes_json).length, 0);
      const nextStep = sessions.find((session) => (session.next_step ?? "").trim().length > 0)?.next_step ?? null;

      let openActionItems = 0;
      let blockedActionItems = 0;
      if (sessionsEnabled && sessions.length > 0) {
        const sessionIds = sessions.map((session) => session.id);
        const placeholders = sessionIds.map(() => "?").join(",");
        const row = db
          .prepare(
            `
SELECT
  SUM(CASE WHEN status IN ('OPEN', 'IN_PROGRESS', 'BLOCKED') THEN 1 ELSE 0 END) AS open_count,
  SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked_count
FROM engagement_action_items
WHERE session_id IN (${placeholders})
`,
          )
          .get(...sessionIds) as { open_count: number | null; blocked_count: number | null };
        openActionItems = row.open_count ?? 0;
        blockedActionItems = row.blocked_count ?? 0;
      }

      const artifactsCount = artifactsEnabled
        ? ((db
            .prepare("SELECT COUNT(1) AS count FROM event_artifacts WHERE event_id = ?")
            .get(registration.event_id) as { count: number }).count ?? 0)
        : 0;

      const feedbackSubmitted = feedbackEnabled
        ? Boolean(
            (db
              .prepare("SELECT id FROM engagement_feedback WHERE event_id = ? AND user_id = ? LIMIT 1")
              .get(registration.event_id, userId) as { id: string } | undefined)?.id,
          )
        : false;

      const pendingReminders = hasTable(db, "engagement_action_item_reminders")
        ? ((db
            .prepare(
              `
SELECT COUNT(1) AS count
FROM engagement_action_item_reminders
WHERE event_id = ?
  AND status = 'PENDING'
`,
            )
            .get(registration.event_id) as { count: number }).count ?? 0)
        : 0;

      const delivered = sessions.some((session) => session.status === "DELIVERED" || parseOutcomes(session.outcomes_json).length > 0);
      const timelineStatus: MyEngagementTimelineItem["timeline_status"] =
        registration.status === "CANCELLED" ? "CANCELLED" : delivered ? "DELIVERED" : "UPCOMING";

      return {
        ...registration,
        timeline_status: timelineStatus,
        sessions_count: sessionsCount,
        outcomes_count: outcomesCount,
        open_action_items: openActionItems,
        blocked_action_items: blockedActionItems,
        artifacts_count: artifactsCount,
        pending_reminders: pendingReminders,
        next_step: nextStep,
        feedback_submitted: feedbackSubmitted,
      };
    });

    const sorted = sortEngagementTimeline(
      items.map((item) => ({
        ...item,
        startAt: item.start_at,
      })),
    );

    return sorted.map((item) => {
      const { startAt, ...rest } = item;
      void startAt;
      return rest;
    });
  } finally {
    db.close();
  }
};

export const getAccountAttentionSummary = (userId: string): {
  open_actions: number;
  overdue_actions: number;
  pending_reminders: number;
} => {
  const registrations = listRegistrationsForUser(userId);
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    if (!hasTable(db, "engagement_sessions") || !hasTable(db, "engagement_action_items")) {
      return {
        open_actions: 0,
        overdue_actions: 0,
        pending_reminders: 0,
      };
    }

    const eventIds = Array.from(new Set(registrations.map((registration) => registration.event_id)));
    if (eventIds.length === 0) {
      return {
        open_actions: 0,
        overdue_actions: 0,
        pending_reminders: 0,
      };
    }

    const placeholders = eventIds.map(() => "?").join(",");
    const nowIso = new Date().toISOString();

    const openRow = db
      .prepare(
        `
SELECT
  COUNT(1) AS count
FROM engagement_action_items ai
JOIN engagement_sessions s ON s.id = ai.session_id
WHERE s.event_id IN (${placeholders})
  AND ai.status IN ('OPEN','IN_PROGRESS','BLOCKED')
  AND (ai.owner_user_id IS NULL OR ai.owner_user_id = ?)
`,
      )
      .get(...eventIds, userId) as { count: number | null };

    const overdueRow = db
      .prepare(
        `
SELECT
  COUNT(1) AS count
FROM engagement_action_items ai
JOIN engagement_sessions s ON s.id = ai.session_id
WHERE s.event_id IN (${placeholders})
  AND ai.status IN ('OPEN','IN_PROGRESS','BLOCKED')
  AND ai.due_at IS NOT NULL
  AND ai.due_at < ?
  AND (ai.owner_user_id IS NULL OR ai.owner_user_id = ?)
`,
      )
      .get(...eventIds, nowIso, userId) as { count: number | null };

    const pendingReminders = hasTable(db, "engagement_action_item_reminders")
      ? ((db
          .prepare(
            `
SELECT
  COUNT(1) AS count
FROM engagement_action_item_reminders r
JOIN engagement_action_items ai ON ai.id = r.action_item_id
WHERE r.event_id IN (${placeholders})
  AND r.status = 'PENDING'
  AND (ai.owner_user_id IS NULL OR ai.owner_user_id = ?)
`,
          )
          .get(...eventIds, userId) as { count: number | null }).count ?? 0)
      : 0;

    return {
      open_actions: openRow.count ?? 0,
      overdue_actions: overdueRow.count ?? 0,
      pending_reminders: pendingReminders,
    };
  } finally {
    db.close();
  }
};

export type EngagementArtifact = {
  id: string;
  title: string;
  resource_url: string;
  scope: "EVENT" | "USER";
  user_id: string | null;
  created_at: string;
};

export const listArtifactsForEngagement = (args: {
  eventSlug: string;
  user: SessionUser;
}): EngagementArtifact[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = requireEngagementAccess(db, args.eventSlug, args.user);
    if (!hasTable(db, "event_artifacts")) {
      return [];
    }

    const isAdmin = args.user.roles.includes("ADMIN") || args.user.roles.includes("SUPER_ADMIN");
    const artifacts = isAdmin
      ? (db
          .prepare(
            `
SELECT id, title, resource_url, scope, user_id, created_at
FROM event_artifacts
WHERE event_id = ?
ORDER BY created_at DESC
`,
          )
          .all(event.id) as EngagementArtifact[])
      : (db
          .prepare(
            `
SELECT id, title, resource_url, scope, user_id, created_at
FROM event_artifacts
WHERE event_id = ?
  AND (scope = 'EVENT' OR (scope = 'USER' AND user_id = ?))
ORDER BY created_at DESC
`,
          )
          .all(event.id, args.user.id) as EngagementArtifact[]);

    return artifacts;
  } finally {
    db.close();
  }
};

export const createSessionOutcome = (args: {
  eventSlug: string;
  actorId: string;
  requestId: string;
  title: string;
  sessionAt: string;
  summary?: string | null;
  status?: string;
  outcomes?: string[];
  actionItems?: Array<{ description: string; dueAt?: string | null }>;
  nextStep?: string | null;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    if (!hasTable(db, "engagement_sessions") || !hasTable(db, "engagement_action_items")) {
      throw new InvalidInputError("engagement_outcomes_unavailable");
    }

    const event = getEventBySlug(db, args.eventSlug);
    const normalized = normalizeEngagementOutcomeInput({
      outcomes: args.outcomes,
      actionItems: args.actionItems,
      nextStep: args.nextStep,
    });

    const title = args.title.trim();
    if (!title) {
      throw new InvalidInputError("engagement_session_title_required");
    }

    if (Number.isNaN(Date.parse(args.sessionAt))) {
      throw new InvalidInputError("invalid_session_at");
    }

    const status = parseEngagementSessionStatus(args.status);
    const now = new Date().toISOString();
    const sessionId = randomUUID();

    db.transaction(() => {
      db.prepare(
        `
INSERT INTO engagement_sessions (id, event_id, title, session_at, summary, outcomes_json, next_step, status, created_by, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      ).run(
        sessionId,
        event.id,
        title,
        new Date(args.sessionAt).toISOString(),
        args.summary?.trim() ? args.summary.trim() : null,
        normalized.outcomes.length > 0 ? JSON.stringify(normalized.outcomes) : null,
        normalized.nextStep,
        status,
        args.actorId,
        now,
        now,
      );

      for (const actionItem of normalized.actionItems) {
        db.prepare(
          `
INSERT INTO engagement_action_items (id, session_id, description, status, due_at, owner_user_id, created_at, updated_at)
VALUES (?, ?, ?, 'OPEN', ?, NULL, ?, ?)
`,
        ).run(randomUUID(), sessionId, actionItem.description, actionItem.dueAt, now, now);
      }

      appendAuditLog(db, {
        actorType: "USER",
        actorId: args.actorId,
        action: "api.engagement.outcome.create",
        targetType: "engagement",
        requestId: args.requestId,
        metadata: {
          eventSlug: args.eventSlug,
          sessionId,
          outcomesCount: normalized.outcomes.length,
          actionItemsCount: normalized.actionItems.length,
        },
      });
    })();

    return {
      id: sessionId,
      event_slug: event.slug,
      title,
      session_at: new Date(args.sessionAt).toISOString(),
      summary: args.summary?.trim() ? args.summary.trim() : null,
      status,
      outcomes: normalized.outcomes,
      action_items: normalized.actionItems,
      next_step: normalized.nextStep,
    };
  } finally {
    db.close();
  }
};

export const createArtifact = (args: {
  eventSlug: string;
  actorId: string;
  requestId: string;
  title: string;
  resourceUrl: string;
  scope?: string;
  userId?: string | null;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    if (!hasTable(db, "event_artifacts")) {
      throw new InvalidInputError("engagement_artifacts_unavailable");
    }

    const event = getEventBySlug(db, args.eventSlug);
    const title = args.title.trim();
    const resourceUrl = args.resourceUrl.trim();
    if (!title || !resourceUrl) {
      throw new InvalidInputError("artifact_title_and_url_required");
    }

    const scope = (args.scope ?? "EVENT").trim().toUpperCase();
    if (scope !== "EVENT" && scope !== "USER") {
      throw new InvalidInputError("invalid_artifact_scope");
    }

    if (scope === "USER" && !args.userId) {
      throw new InvalidInputError("artifact_user_scope_requires_user");
    }

    const artifactId = randomUUID();
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(
        `
INSERT INTO event_artifacts (id, event_id, title, resource_url, scope, user_id, created_by, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      ).run(artifactId, event.id, title, resourceUrl, scope, args.userId ?? null, args.actorId, now, now);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: args.actorId,
        action: "api.engagement.artifact.create",
        targetType: "engagement",
        requestId: args.requestId,
        metadata: {
          eventSlug: event.slug,
          artifactId,
          scope,
          userId: args.userId ?? null,
        },
      });
    })();

    return {
      id: artifactId,
      event_slug: event.slug,
      title,
      resource_url: resourceUrl,
      scope,
      user_id: args.userId ?? null,
      created_at: now,
    };
  } finally {
    db.close();
  }
};

export const submitEngagementFeedback = (args: {
  eventSlug: string;
  user: SessionUser;
  requestId: string;
  rating: number;
  comment?: string | null;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = requireEngagementAccess(db, args.eventSlug, args.user);
    if (!hasTable(db, "engagement_feedback")) {
      throw new InvalidInputError("engagement_feedback_unavailable");
    }

    const rating = Number(args.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new InvalidInputError("feedback_rating_invalid");
    }

    const now = new Date().toISOString();
    const feedbackId = randomUUID();

    db.transaction(() => {
      db.prepare(
        `
INSERT INTO engagement_feedback (id, event_id, user_id, rating, comment, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(event_id, user_id)
DO UPDATE SET rating = excluded.rating, comment = excluded.comment, updated_at = excluded.updated_at
`,
      ).run(feedbackId, event.id, args.user.id, rating, args.comment?.trim() ? args.comment.trim() : null, now, now);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: args.user.id,
        action: "api.engagement.feedback.submit",
        targetType: "engagement",
        requestId: args.requestId,
        metadata: {
          eventSlug: event.slug,
          rating,
        },
      });
    })();

    return {
      accepted: true as const,
      event_slug: event.slug,
      rating,
      comment: args.comment?.trim() ? args.comment.trim() : null,
      updated_at: now,
    };
  } finally {
    db.close();
  }
};

export const getFeedbackQualityReport = () => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    if (!hasTable(db, "engagement_feedback")) {
      return {
        count: 0,
        average_rating: null,
        by_event: [] as Array<{
          event_slug: string;
          event_title: string;
          responses: number;
          average_rating: number;
        }>,
      };
    }

    const byEvent = db
      .prepare(
        `
SELECT e.slug AS event_slug, e.title AS event_title, COUNT(ef.id) AS responses, ROUND(AVG(ef.rating), 2) AS average_rating
FROM engagement_feedback ef
JOIN events e ON e.id = ef.event_id
GROUP BY e.id, e.slug, e.title
ORDER BY responses DESC, e.start_at DESC
`,
      )
      .all() as Array<{
      event_slug: string;
      event_title: string;
      responses: number;
      average_rating: number;
    }>;

    const summary = db
      .prepare("SELECT COUNT(1) AS count, ROUND(AVG(rating), 2) AS average_rating FROM engagement_feedback")
      .get() as { count: number; average_rating: number | null };

    return {
      count: summary.count,
      average_rating: summary.average_rating,
      by_event: byEvent,
    };
  } finally {
    db.close();
  }
};

export type EngagementFollowUpAction = {
  id: string;
  session_id: string;
  session_title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  due_at: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EngagementActionReminder = {
  id: string;
  action_item_id: string;
  reminder_type: "UPCOMING" | "OVERDUE";
  reminder_for: string;
  status: "PENDING" | "ACKNOWLEDGED";
  acknowledged_at: string | null;
  created_at: string;
};

const canMutateActionAsUser = (args: {
  user: SessionUser;
  ownerUserId: string | null;
  requestedOwnerUserId?: string | null;
}) => {
  const isAdmin = args.user.roles.includes("ADMIN") || args.user.roles.includes("SUPER_ADMIN");
  if (isAdmin) {
    return true;
  }

  if (args.ownerUserId && args.ownerUserId !== args.user.id) {
    return false;
  }

  if (args.requestedOwnerUserId !== undefined) {
    const requested = args.requestedOwnerUserId ?? null;
    if (requested !== null && requested !== args.user.id) {
      return false;
    }
  }

  return true;
};

export const listFollowUpForEngagement = (args: {
  eventSlug: string;
  user: SessionUser;
}): {
  actions: EngagementFollowUpAction[];
  reminders: EngagementActionReminder[];
} => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = requireEngagementAccess(db, args.eventSlug, args.user);

    if (!hasTable(db, "engagement_action_items")) {
      return {
        actions: [],
        reminders: [],
      };
    }

    const isAdmin = args.user.roles.includes("ADMIN") || args.user.roles.includes("SUPER_ADMIN");

    const actions = (isAdmin
      ? db.prepare(
          `
SELECT ai.id, ai.session_id, s.title AS session_title, ai.description, ai.status, ai.due_at, ai.owner_user_id, ai.created_at, ai.updated_at
FROM engagement_action_items ai
JOIN engagement_sessions s ON s.id = ai.session_id
WHERE s.event_id = ?
ORDER BY ai.status ASC, COALESCE(ai.due_at, ai.created_at) ASC
`,
        ).all(event.id)
      : db.prepare(
          `
SELECT ai.id, ai.session_id, s.title AS session_title, ai.description, ai.status, ai.due_at, ai.owner_user_id, ai.created_at, ai.updated_at
FROM engagement_action_items ai
JOIN engagement_sessions s ON s.id = ai.session_id
WHERE s.event_id = ?
  AND (ai.owner_user_id IS NULL OR ai.owner_user_id = ?)
ORDER BY ai.status ASC, COALESCE(ai.due_at, ai.created_at) ASC
`,
        ).all(event.id, args.user.id)) as EngagementFollowUpAction[];

    const reminders = hasTable(db, "engagement_action_item_reminders")
      ? ((isAdmin
          ? db
              .prepare(
                `
SELECT r.id, r.action_item_id, r.reminder_type, r.reminder_for, r.status, r.acknowledged_at, r.created_at
FROM engagement_action_item_reminders r
WHERE r.event_id = ?
ORDER BY r.created_at DESC
`,
              )
              .all(event.id)
          : db
              .prepare(
                `
SELECT r.id, r.action_item_id, r.reminder_type, r.reminder_for, r.status, r.acknowledged_at, r.created_at
FROM engagement_action_item_reminders r
JOIN engagement_action_items ai ON ai.id = r.action_item_id
WHERE r.event_id = ?
  AND (ai.owner_user_id IS NULL OR ai.owner_user_id = ?)
ORDER BY r.created_at DESC
`,
              )
              .all(event.id, args.user.id)) as EngagementActionReminder[])
      : [];

    return {
      actions,
      reminders,
    };
  } finally {
    db.close();
  }
};

export const updateFollowUpAction = (args: {
  eventSlug: string;
  actionId: string;
  user: SessionUser;
  requestId: string;
  status?: string;
  dueAt?: string | null;
  ownerUserId?: string | null;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = requireEngagementAccess(db, args.eventSlug, args.user);

    const found = db
      .prepare(
        `
SELECT ai.id, ai.status, ai.owner_user_id, ai.session_id
FROM engagement_action_items ai
JOIN engagement_sessions s ON s.id = ai.session_id
WHERE ai.id = ? AND s.event_id = ?
LIMIT 1
`,
      )
      .get(args.actionId, event.id) as {
      id: string;
      status: "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";
      owner_user_id: string | null;
      session_id: string;
    } | undefined;

    if (!found) {
      throw new EngagementActionNotFoundError(args.actionId);
    }

    if (
      !canMutateActionAsUser({
        user: args.user,
        ownerUserId: found.owner_user_id,
        requestedOwnerUserId: args.ownerUserId,
      })
    ) {
      throw new ForbiddenEngagementAccessError();
    }

    const nextStatus = args.status ? transitionFollowUpStatus(found.status, parseFollowUpStatus(args.status)) : found.status;
    const nextDueAt = args.dueAt === undefined ? undefined : normalizeFollowUpDueAt(args.dueAt);
    const nextOwner = args.ownerUserId === undefined ? undefined : args.ownerUserId;
    const now = new Date().toISOString();

    const row = db.transaction(() => {
      db.prepare(
        `
UPDATE engagement_action_items
SET status = ?, due_at = COALESCE(?, due_at), owner_user_id = COALESCE(?, owner_user_id), updated_at = ?
WHERE id = ?
`,
      ).run(nextStatus, nextDueAt, nextOwner, now, found.id);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: args.user.id,
        action: "api.engagement.followup.update",
        targetType: "engagement",
        requestId: args.requestId,
        metadata: {
          eventSlug: args.eventSlug,
          actionId: found.id,
          fromStatus: found.status,
          toStatus: nextStatus,
          dueAt: nextDueAt ?? null,
          ownerUserId: nextOwner ?? null,
        },
      });

      return db
        .prepare(
          "SELECT id, session_id, description, status, due_at, owner_user_id, created_at, updated_at FROM engagement_action_items WHERE id = ?",
        )
        .get(found.id) as EngagementFollowUpAction;
    })();

    return row;
  } finally {
    db.close();
  }
};

export const generateFollowUpReminders = (args: {
  eventSlug: string;
  actorId: string;
  requestId: string;
  nowIso?: string;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    if (!hasTable(db, "engagement_action_item_reminders")) {
      throw new InvalidInputError("follow_up_reminders_unavailable");
    }

    const event = getEventBySlug(db, args.eventSlug);
    const nowIso = args.nowIso ?? new Date().toISOString();

    const actions = db
      .prepare(
        `
SELECT ai.id, ai.due_at, ai.status
FROM engagement_action_items ai
JOIN engagement_sessions s ON s.id = ai.session_id
WHERE s.event_id = ?
  AND ai.status IN ('OPEN','IN_PROGRESS','BLOCKED')
  AND ai.due_at IS NOT NULL
`,
      )
      .all(event.id) as Array<{
      id: string;
      due_at: string;
      status: "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";
    }>;

    const created: EngagementActionReminder[] = [];

    db.transaction(() => {
      for (const action of actions) {
        const reminderType = classifyReminderType(action.due_at, nowIso);
        if (!reminderType) {
          continue;
        }

        const reminderId = randomUUID();
        const now = new Date().toISOString();
        db.prepare(
          `
INSERT OR IGNORE INTO engagement_action_item_reminders (
  id,
  action_item_id,
  event_id,
  reminder_type,
  reminder_for,
  status,
  acknowledged_at,
  acknowledged_by,
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, NULL, ?, ?)
`,
        ).run(reminderId, action.id, event.id, reminderType, action.due_at, now, now);

        const inserted = db
          .prepare(
            `
SELECT id, action_item_id, reminder_type, reminder_for, status, acknowledged_at, created_at
FROM engagement_action_item_reminders
WHERE action_item_id = ? AND reminder_type = ? AND reminder_for = ?
LIMIT 1
`,
          )
          .get(action.id, reminderType, action.due_at) as EngagementActionReminder | undefined;

        if (inserted) {
          created.push(inserted);
        }
      }

      appendAuditLog(db, {
        actorType: "USER",
        actorId: args.actorId,
        action: "api.engagement.reminders.generate",
        targetType: "engagement",
        requestId: args.requestId,
        metadata: {
          eventSlug: event.slug,
          generatedCount: created.length,
        },
      });
    })();

    return {
      event_slug: event.slug,
      generated: created.length,
      reminders: created,
    };
  } finally {
    db.close();
  }
};

export const acknowledgeReminder = (args: {
  eventSlug: string;
  reminderId: string;
  user: SessionUser;
  requestId: string;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = requireEngagementAccess(db, args.eventSlug, args.user);
    if (!hasTable(db, "engagement_action_item_reminders")) {
      throw new InvalidInputError("follow_up_reminders_unavailable");
    }

    const found = db
      .prepare(
        `
SELECT r.id, r.status, ai.owner_user_id
FROM engagement_action_item_reminders r
JOIN engagement_action_items ai ON ai.id = r.action_item_id
WHERE r.id = ? AND r.event_id = ?
LIMIT 1
`,
      )
      .get(args.reminderId, event.id) as { id: string; status: "PENDING" | "ACKNOWLEDGED"; owner_user_id: string | null } | undefined;

    if (!found) {
      throw new EngagementReminderNotFoundError(args.reminderId);
    }

    const isAdmin = args.user.roles.includes("ADMIN") || args.user.roles.includes("SUPER_ADMIN");
    if (!isAdmin && found.owner_user_id && found.owner_user_id !== args.user.id) {
      throw new ForbiddenEngagementAccessError();
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(
        `
UPDATE engagement_action_item_reminders
SET status = 'ACKNOWLEDGED', acknowledged_at = ?, acknowledged_by = ?, updated_at = ?
WHERE id = ?
`,
      ).run(now, args.user.id, now, found.id);

      appendAuditLog(db, {
        actorType: "USER",
        actorId: args.user.id,
        action: "api.engagement.reminder.acknowledge",
        targetType: "engagement",
        requestId: args.requestId,
        metadata: {
          eventSlug: event.slug,
          reminderId: found.id,
        },
      });
    })();

    return {
      acknowledged: true as const,
      reminder_id: found.id,
      acknowledged_at: now,
    };
  } finally {
    db.close();
  }
};

export const snoozeReminder = (args: {
  eventSlug: string;
  reminderId: string;
  user: SessionUser;
  requestId: string;
  snoozeDays: 1 | 3 | 7;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const event = requireEngagementAccess(db, args.eventSlug, args.user);
    if (!hasTable(db, "engagement_action_item_reminders")) {
      throw new InvalidInputError("follow_up_reminders_unavailable");
    }

    const found = db
      .prepare(
        `
SELECT r.id, r.status, r.action_item_id, ai.owner_user_id
FROM engagement_action_item_reminders r
JOIN engagement_action_items ai ON ai.id = r.action_item_id
WHERE r.id = ? AND r.event_id = ?
LIMIT 1
`,
      )
      .get(args.reminderId, event.id) as
      | { id: string; status: "PENDING" | "ACKNOWLEDGED"; action_item_id: string; owner_user_id: string | null }
      | undefined;

    if (!found) {
      throw new EngagementReminderNotFoundError(args.reminderId);
    }

    const isAdmin = args.user.roles.includes("ADMIN") || args.user.roles.includes("SUPER_ADMIN");
    if (!isAdmin && found.owner_user_id && found.owner_user_id !== args.user.id) {
      throw new ForbiddenEngagementAccessError();
    }

    if (found.status !== "PENDING") {
      throw new InvalidInputError("reminder_not_pending");
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const snoozedForIso = new Date(now.getTime() + args.snoozeDays * 24 * 60 * 60 * 1000).toISOString();

    const pending = db.transaction(() => {
      db.prepare(
        `
UPDATE engagement_action_item_reminders
SET status = 'ACKNOWLEDGED', acknowledged_at = ?, acknowledged_by = ?, updated_at = ?
WHERE id = ?
`,
      ).run(nowIso, args.user.id, nowIso, found.id);

      const newId = randomUUID();
      db.prepare(
        `
INSERT OR IGNORE INTO engagement_action_item_reminders (
  id,
  action_item_id,
  event_id,
  reminder_type,
  reminder_for,
  status,
  acknowledged_at,
  acknowledged_by,
  created_at,
  updated_at
) VALUES (?, ?, ?, 'UPCOMING', ?, 'PENDING', NULL, NULL, ?, ?)
`,
      ).run(newId, found.action_item_id, event.id, snoozedForIso, nowIso, nowIso);

      const row = db
        .prepare(
          `
SELECT id, action_item_id, reminder_type, reminder_for, status, acknowledged_at, created_at
FROM engagement_action_item_reminders
WHERE action_item_id = ? AND reminder_type = 'UPCOMING' AND reminder_for = ?
LIMIT 1
`,
        )
        .get(found.action_item_id, snoozedForIso) as EngagementActionReminder | undefined;

      if (!row) {
        throw new Error("snooze_reminder_insert_failed");
      }

      appendAuditLog(db, {
        actorType: "USER",
        actorId: args.user.id,
        action: "api.engagement.reminder.snooze",
        targetType: "engagement",
        requestId: args.requestId,
        metadata: {
          eventSlug: event.slug,
          reminderId: found.id,
          snoozeDays: args.snoozeDays,
          snoozedFor: snoozedForIso,
        },
      });

      return row;
    })();

    return {
      snoozed: true as const,
      snoozed_from_id: found.id,
      reminder: pending,
    };
  } finally {
    db.close();
  }
};

export const getFollowUpAdminReport = () => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    if (!hasTable(db, "engagement_action_items")) {
      return {
        actions_total: 0,
        reminders_pending: 0,
        by_status: {
          OPEN: 0,
          IN_PROGRESS: 0,
          DONE: 0,
          BLOCKED: 0,
        },
        reminders_recent: [] as EngagementActionReminder[],
      };
    }

    const actionTotals = db
      .prepare(
        `
SELECT
  COUNT(1) AS total,
  SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
  SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_count,
  SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS done_count,
  SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked_count
FROM engagement_action_items
`,
      )
      .get() as {
      total: number;
      open_count: number | null;
      in_progress_count: number | null;
      done_count: number | null;
      blocked_count: number | null;
    };

    const pendingReminders = hasTable(db, "engagement_action_item_reminders")
      ? ((db
          .prepare("SELECT COUNT(1) AS count FROM engagement_action_item_reminders WHERE status = 'PENDING'")
          .get() as { count: number }).count ?? 0)
      : 0;

    const recent = hasTable(db, "engagement_action_item_reminders")
      ? (db
          .prepare(
            `
SELECT id, action_item_id, reminder_type, reminder_for, status, acknowledged_at, created_at
FROM engagement_action_item_reminders
ORDER BY created_at DESC
LIMIT 25
`,
          )
          .all() as EngagementActionReminder[])
      : [];

    return {
      actions_total: actionTotals.total,
      reminders_pending: pendingReminders,
      by_status: {
        OPEN: actionTotals.open_count ?? 0,
        IN_PROGRESS: actionTotals.in_progress_count ?? 0,
        DONE: actionTotals.done_count ?? 0,
        BLOCKED: actionTotals.blocked_count ?? 0,
      },
      reminders_recent: recent,
    };
  } finally {
    db.close();
  }
};
