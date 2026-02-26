/**
 * Sprint 39 — Workflow Routing Engine
 *
 * Evaluates `workflow_rules` whenever a feed event is written.
 * Error-isolated: a failing rule is logged as FAILED and never surfaces
 * to the HTTP caller that triggered the original feed event write.
 */

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

import type { StoredFeedEvent } from "@/lib/api/feed-events";
import { sendEmailAsync } from "@/platform/email-queue-bridge";
import { resolveTransactionalEmailPort } from "@/platform/email";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowRule {
  id: string;
  name: string;
  trigger_event: string;
  condition_json: string | null;
  action_type: "UPDATE_CONTACT_STATUS" | "ASSIGN_TO_STAFF" | "SEND_EMAIL" | "CREATE_FEED_EVENT";
  action_config: string;
  enabled: number;
  position: number;
}

export interface ConditionSpec {
  field: string;
  operator: "eq" | "neq" | "contains" | "gt" | "lt";
  value: string | number;
}

interface UpdateContactStatusConfig {
  to_status: string;
}

interface AssignToStaffConfig {
  staff_user_id: string;
}

interface SendEmailConfig {
  template: string;
  to: "contact" | "assigned_staff" | string;
  subject_override?: string | null;
}

interface CreateFeedEventConfig {
  type: string;
  title: string;
  description: string;
  delay_hours?: number;
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

/**
 * Resolves a dot-notation field path against the feed event.
 * Supports top-level properties directly and `payload.xxx` (alias for event.xxx).
 */
function resolveField(field: string, event: StoredFeedEvent): unknown {
  const parts = field.split(".");
  // strip "payload." prefix — treat the event itself as the payload object
  const effectiveParts = parts[0] === "payload" ? parts.slice(1) : parts;

  let current: unknown = event;
  for (const part of effectiveParts) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Evaluates a single condition object against the event.
 */
export function evaluateCondition(condition: ConditionSpec, event: StoredFeedEvent): boolean {
  const rawValue = resolveField(condition.field, event);
  const eventVal = String(rawValue ?? "");
  const condVal = String(condition.value);

  switch (condition.operator) {
    case "eq":
      return eventVal === condVal;
    case "neq":
      return eventVal !== condVal;
    case "contains":
      return eventVal.includes(condVal);
    case "gt":
      return Number(rawValue) > Number(condition.value);
    case "lt":
      return Number(rawValue) < Number(condition.value);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

/**
 * Executes a rule's action against the triggering event.
 * Throws on failure — caller logs FAILED and continues.
 */
export function executeAction(
  db: Database.Database,
  rule: WorkflowRule,
  event: StoredFeedEvent,
): void {
  const config = JSON.parse(rule.action_config) as
    | UpdateContactStatusConfig
    | AssignToStaffConfig
    | SendEmailConfig
    | CreateFeedEventConfig;

  const now = new Date().toISOString();

  switch (rule.action_type) {
    case "UPDATE_CONTACT_STATUS": {
      const cfg = config as UpdateContactStatusConfig;
      // Update contact tied to this event's user
      db.prepare(
        "UPDATE contacts SET status = ?, updated_at = ? WHERE user_id = ?",
      ).run(cfg.to_status, now, event.user_id);
      break;
    }

    case "ASSIGN_TO_STAFF": {
      const cfg = config as AssignToStaffConfig;
      db.prepare(
        "UPDATE contacts SET assigned_to = ?, updated_at = ? WHERE user_id = ?",
      ).run(cfg.staff_user_id, now, event.user_id);
      break;
    }

    case "SEND_EMAIL": {
      const cfg = config as SendEmailConfig;

      // Resolve recipient email
      let toEmail: string | null = null;
      if (cfg.to === "contact") {
        const userRow = db
          .prepare("SELECT email FROM users WHERE id = ?")
          .get(event.user_id) as { email: string } | undefined;
        toEmail = userRow?.email ?? null;
      } else if (cfg.to === "assigned_staff") {
        const contact = db
          .prepare("SELECT assigned_to FROM contacts WHERE user_id = ?")
          .get(event.user_id) as { assigned_to: string | null } | undefined;
        if (contact?.assigned_to) {
          const staffRow = db
            .prepare("SELECT email FROM users WHERE id = ?")
            .get(contact.assigned_to) as { email: string } | undefined;
          toEmail = staffRow?.email ?? null;
        }
      } else {
        // Treat as literal email address
        toEmail = cfg.to;
      }

      if (toEmail) {
        const emailPort = resolveTransactionalEmailPort();
        sendEmailAsync(emailPort, {
          to: toEmail,
          subject: cfg.subject_override ?? `Studio Ordo — ${cfg.template}`,
          textBody: `Automated notification: ${cfg.template} — see your Studio Ordo dashboard for details.`,
          htmlBody: `<p>Automated notification: <strong>${cfg.template}</strong></p><p><a href="/dashboard">View dashboard</a></p>`,
          tag: `workflow-${cfg.template}`,
        });
      }
      break;
    }

    case "CREATE_FEED_EVENT": {
      const cfg = config as CreateFeedEventConfig;
      // delay_hours ignored in v1 — fire immediately
      // Use rawInsertFeedEvent to avoid recursive rule evaluation
      rawInsertFeedEvent(db, {
        userId: event.user_id,
        type: cfg.type as StoredFeedEvent["type"],
        title: cfg.title,
        description: cfg.description,
        actionUrl: "/dashboard",
      });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Raw insert — used by CREATE_FEED_EVENT to avoid re-triggering the engine
// ---------------------------------------------------------------------------

/**
 * Inserts a feed event without triggering the workflow engine.
 * Used internally by the engine itself to prevent infinite recursion.
 */
export function rawInsertFeedEvent(
  db: Database.Database,
  input: {
    userId: string;
    type: StoredFeedEvent["type"];
    title: string;
    description: string;
    actionUrl?: string;
  },
): StoredFeedEvent {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO feed_events (id, user_id, type, title, description, action_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, input.userId, input.type, input.title, input.description, input.actionUrl ?? null, now);

  return {
    id,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    description: input.description,
    action_url: input.actionUrl ?? null,
    created_at: now,
  };
}

// ---------------------------------------------------------------------------
// Main entry point — called from writeFeedEvent()
// ---------------------------------------------------------------------------

/**
 * Evaluates all matching, enabled workflow rules for the given event.
 *
 * - Each rule is processed in order of `position`.
 * - If a rule's condition_json fails to match, execution is logged as SKIPPED.
 * - If executing the action throws, execution is logged as FAILED (never re-thrown).
 */
export function evaluateWorkflowRules(
  db: Database.Database,
  event: StoredFeedEvent,
): void {
  let rules: WorkflowRule[];
  try {
    rules = db
      .prepare(
        "SELECT * FROM workflow_rules WHERE trigger_event = ? AND enabled = 1 ORDER BY position ASC",
      )
      .all(event.type) as WorkflowRule[];
  } catch {
    // If the workflow_rules table doesn't exist yet (e.g., fresh DB pre-migration),
    // fail silently — the engine is optional.
    return;
  }

  const now = new Date().toISOString();

  for (const rule of rules) {
    let status: "SUCCESS" | "FAILED" | "SKIPPED" = "SUCCESS";
    let errorMsg: string | null = null;

    try {
      // Evaluate condition if present
      if (rule.condition_json) {
        const condition = JSON.parse(rule.condition_json) as ConditionSpec;
        if (!evaluateCondition(condition, event)) {
          status = "SKIPPED";
          db.prepare(
            "INSERT INTO workflow_executions (id, rule_id, feed_event_id, status, error, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
          ).run(randomUUID(), rule.id, event.id, "SKIPPED", null, now);
          continue;
        }
      }

      executeAction(db, rule, event);
    } catch (err) {
      status = "FAILED";
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    db.prepare(
      "INSERT INTO workflow_executions (id, rule_id, feed_event_id, status, error, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), rule.id, event.id, status, errorMsg, now);
  }
}
