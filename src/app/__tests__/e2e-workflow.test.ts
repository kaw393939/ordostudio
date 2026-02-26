/**
 * Sprint 39 — e2e tests: Workflow Routing Engine
 *
 * 12 tests covering:
 *   - Migration 040 schema (workflow_rules, workflow_executions)
 *   - Engine fires on writeFeedEvent, skips disabled rules
 *   - Condition evaluation (eq match / no-match)
 *   - All 4 action types
 *   - Rule failure isolation
 *   - API route list + create
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import {
  setupStandardE2EFixture,
  cleanupStandardE2EFixtures,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
import { GET as getWorkflows, POST as postWorkflow } from "../api/v1/admin/workflows/route";

// ---------------------------------------------------------------------------
// Library under test
// ---------------------------------------------------------------------------
import { writeFeedEvent } from "../../lib/api/feed-events";
import { evaluateCondition, evaluateWorkflowRules } from "../../lib/api/workflow-engine";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

let fixture: StandardE2EFixture;

beforeEach(async () => {
  fixture = await setupStandardE2EFixture();
  process.env.APPCTL_ENV = "local";
});

afterEach(async () => {
  await cleanupStandardE2EFixtures();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDb() {
  return new Database(fixture.dbPath);
}

function adminRequest(path: string, method = "GET") {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      origin: "http://localhost:3000",
      cookie: fixture.adminCookie,
    },
  });
}

function noAuthRequest(path: string, method = "GET") {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { origin: "http://localhost:3000" },
  });
}

/** Insert a test-only enabled workflow rule directly into the DB */
function insertRule(
  db: Database.Database,
  overrides: {
    id?: string;
    name?: string;
    trigger_event?: string;
    condition_json?: string | null;
    action_type?: string;
    action_config?: string;
    enabled?: number;
    position?: number;
  } = {},
) {
  const id = overrides.id ?? randomUUID();
  db.prepare(
    `INSERT INTO workflow_rules (id, name, description, trigger_event, condition_json, action_type, action_config, enabled, position, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'test', datetime('now'), datetime('now'))`,
  ).run(
    id,
    overrides.name ?? "Test Rule",
    null,
    overrides.trigger_event ?? "OnboardingProgress",
    overrides.condition_json ?? null,
    overrides.action_type ?? "CREATE_FEED_EVENT",
    overrides.action_config ?? '{"type":"FollowUpAction","title":"Test follow-up","description":"Auto-generated follow-up."}',
    overrides.enabled ?? 1,
    overrides.position ?? 10,
  );
  return id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sprint 39 — Workflow Routing Engine", () => {
  // -----------------------------------------------------------------------
  // Schema
  // -----------------------------------------------------------------------

  it("T1: workflow_rules table exists with 5 seed rows (all disabled)", () => {
    const db = getDb();

    const tableInfo = db
      .prepare("SELECT name FROM pragma_table_info('workflow_rules') ORDER BY name")
      .all() as Array<{ name: string }>;
    const cols = tableInfo.map((r) => r.name);
    expect(cols).toContain("id");
    expect(cols).toContain("name");
    expect(cols).toContain("trigger_event");
    expect(cols).toContain("action_type");
    expect(cols).toContain("action_config");
    expect(cols).toContain("enabled");

    const rows = db.prepare("SELECT * FROM workflow_rules ORDER BY position ASC").all() as Array<{
      id: string;
      enabled: number;
    }>;
    expect(rows.length).toBe(5);
    expect(rows.every((r) => r.enabled === 0)).toBe(true);

    const ids = rows.map((r) => r.id);
    expect(ids).toContain("wf-intake-assign");
    expect(ids).toContain("wf-welcome-provision");

    db.close();
  });

  it("T2: workflow_executions table exists with correct columns", () => {
    const db = getDb();

    const tableInfo = db
      .prepare("SELECT name FROM pragma_table_info('workflow_executions') ORDER BY name")
      .all() as Array<{ name: string }>;
    const cols = tableInfo.map((r) => r.name);
    expect(cols).toContain("id");
    expect(cols).toContain("rule_id");
    expect(cols).toContain("feed_event_id");
    expect(cols).toContain("status");
    expect(cols).toContain("error");
    expect(cols).toContain("executed_at");

    db.close();
  });

  // -----------------------------------------------------------------------
  // Engine behavior
  // -----------------------------------------------------------------------

  it("T3: engine executes matching enabled rules when writeFeedEvent is called", () => {
    const db = getDb();

    const ruleId = insertRule(db, {
      trigger_event: "OnboardingProgress",
      action_type: "CREATE_FEED_EVENT",
      action_config: '{"type":"FollowUpAction","title":"Auto follow-up","description":"Engine test."}',
      enabled: 1,
    });

    writeFeedEvent(db, {
      userId: fixture.userId,
      type: "OnboardingProgress",
      title: "Test event",
      description: "Engine trigger test",
    });

    const executions = db
      .prepare("SELECT * FROM workflow_executions WHERE rule_id = ?")
      .all(ruleId) as Array<{ status: string }>;

    db.close();

    expect(executions.length).toBe(1);
    expect(executions[0].status).toBe("SUCCESS");
  });

  it("T4: engine skips disabled rules (no execution logged)", () => {
    const db = getDb();

    const ruleId = insertRule(db, {
      trigger_event: "OnboardingProgress",
      enabled: 0, // DISABLED
    });

    writeFeedEvent(db, {
      userId: fixture.userId,
      type: "OnboardingProgress",
      title: "Test event",
      description: "Disabled rule test",
    });

    const executions = db
      .prepare("SELECT * FROM workflow_executions WHERE rule_id = ?")
      .all(ruleId);

    db.close();

    expect(executions.length).toBe(0);
  });

  it("T5: engine evaluates eq condition — SKIPPED when value does not match", () => {
    const db = getDb();

    const ruleId = insertRule(db, {
      trigger_event: "OnboardingProgress",
      condition_json: '{"field":"title","operator":"eq","value":"SpecificTitle"}',
      enabled: 1,
    });

    // Fire with a title that does NOT match the condition
    writeFeedEvent(db, {
      userId: fixture.userId,
      type: "OnboardingProgress",
      title: "Different title",
      description: "Should be SKIPPED",
    });

    const executions = db
      .prepare("SELECT * FROM workflow_executions WHERE rule_id = ?")
      .all(ruleId) as Array<{ status: string }>;

    db.close();

    expect(executions.length).toBe(1);
    expect(executions[0].status).toBe("SKIPPED");
  });

  it("T6: UPDATE_CONTACT_STATUS action updates contact status for user", () => {
    const db = getDb();

    // Create a contact linked to userId
    const contactId = randomUUID();
    db.prepare(
      "INSERT INTO contacts (id, email, full_name, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
    ).run(contactId, "user@test.com", "Test User", "MANUAL", "LEAD");
    db.prepare("UPDATE contacts SET user_id = ? WHERE id = ?").run(fixture.userId, contactId);

    insertRule(db, {
      trigger_event: "OnboardingProgress",
      action_type: "UPDATE_CONTACT_STATUS",
      action_config: '{"to_status":"ACTIVE"}',
      enabled: 1,
    });

    writeFeedEvent(db, {
      userId: fixture.userId,
      type: "OnboardingProgress",
      title: "Status update test",
      description: "Should update contact to ACTIVE",
    });

    const contact = db
      .prepare("SELECT status FROM contacts WHERE id = ?")
      .get(contactId) as { status: string };
    db.close();

    expect(contact.status).toBe("ACTIVE");
  });

  it("T7: ASSIGN_TO_STAFF action sets contacts.assigned_to", () => {
    const db = getDb();

    // Create a contact linked to userId
    const contactId = randomUUID();
    db.prepare(
      "INSERT INTO contacts (id, email, full_name, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
    ).run(contactId, "assignee@test.com", "Assignee", "MANUAL", "LEAD");
    db.prepare("UPDATE contacts SET user_id = ? WHERE id = ?").run(fixture.userId, contactId);

    insertRule(db, {
      trigger_event: "RoleRequestUpdate",
      action_type: "ASSIGN_TO_STAFF",
      action_config: JSON.stringify({ staff_user_id: fixture.adminId }),
      enabled: 1,
    });

    writeFeedEvent(db, {
      userId: fixture.userId,
      type: "RoleRequestUpdate",
      title: "Role assigned",
      description: "Assign contact test",
    });

    const contact = db
      .prepare("SELECT assigned_to FROM contacts WHERE id = ?")
      .get(contactId) as { assigned_to: string | null };
    db.close();

    expect(contact.assigned_to).toBe(fixture.adminId);
  });

  it("T8: SEND_EMAIL action does not throw in test environment", () => {
    const db = getDb();

    insertRule(db, {
      trigger_event: "AccountRegistration",
      action_type: "SEND_EMAIL",
      action_config: '{"template":"test_notification","to":"contact"}',
      enabled: 1,
    });

    // Should not throw
    expect(() => {
      writeFeedEvent(db, {
        userId: fixture.userId,
        type: "AccountRegistration",
        title: "Email action test",
        description: "Send email test",
      });
    }).not.toThrow();

    const executions = db
      .prepare(
        `SELECT we.status FROM workflow_executions we
         JOIN workflow_rules wr ON wr.id = we.rule_id
         WHERE wr.trigger_event = 'AccountRegistration' AND wr.action_type = 'SEND_EMAIL'`,
      )
      .all() as Array<{ status: string }>;

    db.close();

    expect(executions.length).toBeGreaterThan(0);
    // SEND_EMAIL with "contact" resolves the user's email and sends — should succeed
    expect(executions[0].status).toBe("SUCCESS");
  });

  it("T9: CREATE_FEED_EVENT action creates a new feed event entry", () => {
    const db = getDb();

    insertRule(db, {
      trigger_event: "TriageTicket",
      action_type: "CREATE_FEED_EVENT",
      action_config: '{"type":"FollowUpAction","title":"3-day follow-up","description":"Client needs follow-up.","delay_hours":72}',
      enabled: 1,
    });

    const beforeCount = (
      db.prepare("SELECT COUNT(*) AS count FROM feed_events WHERE user_id = ?").get(fixture.userId) as {
        count: number;
      }
    ).count;

    writeFeedEvent(db, {
      userId: fixture.userId,
      type: "TriageTicket",
      title: "New intake",
      description: "CREATE_FEED_EVENT action test",
    });

    const afterCount = (
      db.prepare("SELECT COUNT(*) AS count FROM feed_events WHERE user_id = ?").get(fixture.userId) as {
        count: number;
      }
    ).count;

    db.close();

    // Should have added 2 feed events: the original + the created follow-up
    expect(afterCount).toBe(beforeCount + 2);
  });

  it("T10: rule failure is logged as FAILED — does not break feed event write", () => {
    const db = getDb();

    // ASSIGN_TO_STAFF with a non-existent user_id will fail the FK constraint
    // if foreign_keys=ON. But since we write assigned_to directly, let's create
    // a rule that throws by using an invalid action type via direct DB insert.
    // Instead, use ASSIGN_TO_STAFF with a UUID that may not exist as a user —
    // this will execute (SQLite UPDATE won't fail on a no-match), so let's
    // create a rule with malformed action_config JSON to force a throw.
    const ruleId = randomUUID();
    db.prepare(
      `INSERT INTO workflow_rules (id, name, description, trigger_event, condition_json, action_type, action_config, enabled, position, created_by, created_at, updated_at)
       VALUES (?, 'Broken Rule', null, 'SubscriptionEvent', null, 'SEND_EMAIL', 'not-valid-json', 1, 99, 'test', datetime('now'), datetime('now'))`,
    ).run(ruleId);

    // Should NOT throw — engine isolates failures
    expect(() => {
      writeFeedEvent(db, {
        userId: fixture.userId,
        type: "SubscriptionEvent",
        title: "Test subscription event",
        description: "Rule failure isolation test",
      });
    }).not.toThrow();

    // Feed event must have been written despite the rule failure
    const feedEvents = db
      .prepare(
        "SELECT id FROM feed_events WHERE type = 'SubscriptionEvent' AND user_id = ?",
      )
      .all(fixture.userId);

    // The FAILED execution must be logged
    const execution = db
      .prepare("SELECT status, error FROM workflow_executions WHERE rule_id = ?")
      .get(ruleId) as { status: string; error: string | null } | undefined;

    db.close();

    expect(feedEvents.length).toBeGreaterThan(0);
    expect(execution).toBeDefined();
    expect(execution!.status).toBe("FAILED");
    expect(execution!.error).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // API routes
  // -----------------------------------------------------------------------

  it("T11: GET /api/v1/admin/workflows returns seeded rule list", async () => {
    const res = await getWorkflows(
      adminRequest("/api/v1/admin/workflows") as Parameters<typeof getWorkflows>[0],
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { rules: Array<{ id: string }>; total: number };
    expect(body.rules.length).toBe(5);
    expect(body.total).toBe(5);

    const ids = body.rules.map((r) => r.id);
    expect(ids).toContain("wf-intake-assign");
    expect(ids).toContain("wf-welcome-provision");

    // 401 without session
    const unauth = await getWorkflows(
      noAuthRequest("/api/v1/admin/workflows") as Parameters<typeof getWorkflows>[0],
    );
    expect(unauth.status).toBe(401);
  });

  it("T12: POST /api/v1/admin/workflows creates a new rule, GET returns it in list", async () => {
    const createRes = await postWorkflow(
      new Request("http://localhost:3000/api/v1/admin/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: JSON.stringify({
          name: "Test Rule T12",
          trigger_event: "ReferralActivity",
          action_type: "CREATE_FEED_EVENT",
          action_config: '{"type":"FollowUpAction","title":"T12 test","description":"Created in test"}',
          enabled: 1,
        }),
      }) as Parameters<typeof postWorkflow>[0],
    );

    expect(createRes.status).toBe(201);
    const newRule = (await createRes.json()) as { id: string; name: string };
    expect(newRule.name).toBe("Test Rule T12");

    // Verify it appears in the list
    const listRes = await getWorkflows(
      adminRequest("/api/v1/admin/workflows") as Parameters<typeof getWorkflows>[0],
    );
    const list = (await listRes.json()) as { rules: Array<{ id: string }>; total: number };
    expect(list.total).toBe(6); // 5 seed + 1 new
    const ids = list.rules.map((r) => r.id);
    expect(ids).toContain(newRule.id);
  });
});
