/**
 * Workflow engine eval scenarios
 *
 * 4 scenarios verifying workflow_rules evaluation via real DB operations.
 * These do NOT require an Anthropic API key — they exercise the synchronous
 * workflow engine and assert on DB state.
 */

import { randomUUID } from "node:crypto";
import type { EvalScenario } from "../types";
import type Database from "better-sqlite3";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function insertRule(
  db: Database.Database,
  opts: {
    id?: string;
    trigger_event: string;
    action_type: string;
    action_config: string;
    condition_json?: string | null;
    enabled?: number;
  },
): string {
  const id = opts.id ?? randomUUID();
  db.prepare(
    `INSERT INTO workflow_rules
       (id, name, description, trigger_event, condition_json, action_type,
        action_config, enabled, position, created_by, created_at, updated_at)
     VALUES (?, ?, null, ?, ?, ?, ?, ?, 10, 'eval', datetime('now'), datetime('now'))`,
  ).run(
    id,
    `Eval Rule ${id.slice(0, 8)}`,
    opts.trigger_event,
    opts.condition_json ?? null,
    opts.action_type,
    opts.action_config,
    opts.enabled ?? 1,
  );
  return id;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const workflowScenarios: EvalScenario[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // W1: Matching enabled rule fires and logs SUCCESS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "workflow-fires-on-match",
    name: "Matching enabled rule fires → SUCCESS logged",
    type: "workflow",
    description:
      "An enabled workflow rule matching the trigger event should run and " +
      "produce a workflow_executions row with status SUCCESS.",
    preSetup: (db, userId) => {
      insertRule(db, {
        trigger_event: "TriageTicket",
        action_type: "CREATE_FEED_EVENT",
        action_config: JSON.stringify({
          type: "FollowUpAction",
          title: "Eval follow-up",
          description: "Auto created by eval.",
        }),
        enabled: 1,
      });
    },
    trigger: {
      type: "TriageTicket",
      title: "New intake submitted",
      description: "Workflow eval trigger",
    },
    dbAssertions: [
      {
        description: "workflow_executions has 1 SUCCESS row",
        query: "SELECT COUNT(*) AS result FROM workflow_executions WHERE status = 'SUCCESS'",
        expected: 1,
      },
      {
        description: "CREATE_FEED_EVENT created an additional feed event",
        query: "SELECT COUNT(*) AS result FROM feed_events",
        expected: 2, // the trigger event + the created follow-up
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // W2: Condition not met → SKIPPED
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "workflow-condition-skip",
    name: "eq condition not met → execution SKIPPED",
    type: "workflow",
    description:
      "A rule with an eq condition that doesn't match the event should log " +
      "a SKIPPED execution.",
    preSetup: (db) => {
      insertRule(db, {
        trigger_event: "OnboardingProgress",
        action_type: "CREATE_FEED_EVENT",
        action_config: JSON.stringify({
          type: "FollowUpAction",
          title: "Skipped follow-up",
          description: "Should not be created.",
        }),
        condition_json: JSON.stringify({
          field: "title",
          operator: "eq",
          value: "specific-required-title",
        }),
        enabled: 1,
      });
    },
    trigger: {
      type: "OnboardingProgress",
      title: "different-title", // does NOT match the condition
      description: "Condition skip eval",
    },
    dbAssertions: [
      {
        description: "execution logged as SKIPPED",
        query: "SELECT status AS result FROM workflow_executions LIMIT 1",
        expected: "SKIPPED",
      },
      {
        description: "no additional feed event created (action was skipped)",
        query: "SELECT COUNT(*) AS result FROM feed_events",
        expected: 1, // only the trigger event
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // W3: UPDATE_CONTACT_STATUS action updates contact in DB
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "workflow-update-contact-status",
    name: "UPDATE_CONTACT_STATUS action changes contact.status",
    type: "workflow",
    description:
      "Firing a RoleRequestUpdate event with an enabled UPDATE_CONTACT_STATUS " +
      "rule should update the matching contact's status field.",
    preSetup: (db, userId) => {
      // Create contact linked to userId
      const contactId = randomUUID();
      db.prepare(
        `INSERT INTO contacts (id, email, full_name, source, status, created_at, updated_at)
         VALUES (?, 'eval-contact@example.com', 'Eval Contact', 'MANUAL', 'LEAD', datetime('now'), datetime('now'))`,
      ).run(contactId);
      db.prepare("UPDATE contacts SET user_id = ? WHERE id = ?").run(
        userId,
        contactId,
      );

      insertRule(db, {
        trigger_event: "RoleRequestUpdate",
        action_type: "UPDATE_CONTACT_STATUS",
        action_config: JSON.stringify({ to_status: "QUALIFIED" }),
        enabled: 1,
      });
    },
    trigger: {
      type: "RoleRequestUpdate",
      title: "Role approved",
      description: "Eval status update trigger",
    },
    dbAssertions: [
      {
        description: "contact status updated to QUALIFIED",
        query: "SELECT status AS result FROM contacts WHERE email = 'eval-contact@example.com'",
        expected: "QUALIFIED",
      },
      {
        description: "execution logged as SUCCESS",
        query: "SELECT status AS result FROM workflow_executions WHERE status = 'SUCCESS'",
        expected: "SUCCESS",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // W4: Disabled rule — no execution row written
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "workflow-disabled-rule-no-exec",
    name: "Disabled rule → no execution logged",
    type: "workflow",
    description:
      "An enabled=0 rule should never appear in workflow_executions because " +
      "the engine only queries enabled rules.",
    preSetup: (db) => {
      insertRule(db, {
        trigger_event: "AccountRegistration",
        action_type: "CREATE_FEED_EVENT",
        action_config: JSON.stringify({
          type: "FollowUpAction",
          title: "Should not run",
          description: "Disabled rule eval.",
        }),
        enabled: 0, // DISABLED
      });
    },
    trigger: {
      type: "AccountRegistration",
      title: "New account",
      description: "Disabled rule eval trigger",
    },
    dbAssertions: [
      {
        description: "no rows in workflow_executions",
        query: "SELECT COUNT(*) AS result FROM workflow_executions",
        expected: 0,
      },
    ],
  },
];
