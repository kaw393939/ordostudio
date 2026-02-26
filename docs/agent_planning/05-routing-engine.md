# Sprint 39 — Workflow Routing Engine

**Status:** Planning · **Date:** 2026-02-25
**Prerequisite:** Sprint 38 — onboarding events and contact lifecycle must be producing feed events
**Delivers to:** End state — Studio Ordo has automated event routing without external tooling

---

## What This Sprint Is

Studio Ordo has an event system (`feed_events`). Every meaningful thing that happens — role approvals, intake submissions, onboarding completions, referral conversions — already fires a typed event into that table.

This sprint adds a rules engine that reads those events and routes them to actions: update a contact status, send an email, assign to a staff member, create a follow-up task. No Zapier. No external webhook dependency. No vendor lock-in.

The engine is intentionally **bounded**. It supports exactly 4 action types to start. Adding a 5th action type is a deliberate scope gate that prevents runaway complexity.

---

## What's Broken / Missing Now

| Issue | Impact |
|-------|--------|
| Every post-event action is hardcoded in the route handler that fires the event | Adding a new post-action requires a code change and deploy |
| Staff has no way to configure automated responses to events | Any automation must be built by a developer |
| Repeatable workflows (assign to staff on intake → send email day 3 → follow up day 7) are impossible without code | High-value operations depend on manual memory |

---

## Data Model

### `workflow_rules` (new — migration 040)

```sql
CREATE TABLE workflow_rules (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  trigger_event   TEXT NOT NULL,          -- matches feed_events.type
  condition_json  TEXT,                   -- optional JSON filter on event payload
  action_type     TEXT NOT NULL CHECK(action_type IN (
                    'UPDATE_CONTACT_STATUS',
                    'ASSIGN_TO_STAFF',
                    'SEND_EMAIL',
                    'CREATE_FEED_EVENT'
                  )),
  action_config   TEXT NOT NULL,          -- JSON; shape depends on action_type
  enabled         INTEGER NOT NULL DEFAULT 1,
  position        INTEGER NOT NULL DEFAULT 0,   -- evaluation order
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### `workflow_executions` — audit log

```sql
CREATE TABLE workflow_executions (
  id          TEXT PRIMARY KEY,
  rule_id     TEXT NOT NULL,
  feed_event_id TEXT NOT NULL,
  status      TEXT NOT NULL CHECK(status IN ('SUCCESS','FAILED','SKIPPED')),
  error       TEXT,
  executed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (rule_id)       REFERENCES workflow_rules(id),
  FOREIGN KEY (feed_event_id) REFERENCES feed_events(id)
);
```

---

## Action Type Specifications

### `UPDATE_CONTACT_STATUS`
```json
{
  "to_status": "QUALIFIED"
}
```
Finds the contact for the event's user/email and updates their status.

### `ASSIGN_TO_STAFF`
```json
{
  "staff_user_id": "uuid-of-staff-member"
}
```
Sets `contacts.assigned_to` for the contact related to the event.

### `SEND_EMAIL`
```json
{
  "template": "intake_received",
  "to": "contact",         // "contact" | "assigned_staff" | specific email
  "subject_override": null
}
```
Uses existing email template system. Template variables interpolated from event payload + contact record.

### `CREATE_FEED_EVENT`
```json
{
  "type": "crm.follow_up.due",
  "title": "Follow-up: {{contact.full_name}}",
  "description": "Intake submitted 3 days ago — no response yet.",
  "delay_hours": 72          // optional: fire this many hours after trigger event
}
```
Creates a new feed event (optionally delayed). The delayed variant schedules via a `scheduled_feed_events` table — a simple polling approach, no job queue required.

---

## Condition Filtering

`condition_json` is an optional filter on the event payload. Evaluated before the action runs.

**Example — only fire for AGENT-sourced contacts:**
```json
{
  "field": "payload.source",
  "operator": "eq",
  "value": "AGENT"
}
```

Supported operators: `eq`, `neq`, `contains`, `gt`, `lt`.
Compound conditions: `AND`/`OR` at the top level only. No nesting.

---

## Engine Architecture

The engine runs as a **post-write hook** called from `writeFeedEvent()`. It is synchronous and non-blocking from the caller's perspective (errors are caught and logged, they never surface to the HTTP response).

```
writeFeedEvent(db, event)
  → insert into feed_events
  → evaluate_workflow_rules(db, event)    ← new hook
      → SELECT rules WHERE trigger_event = event.type AND enabled = 1
      → for each rule (ordered by position):
          → evaluate condition_json against event
          → if match: execute action_type
          → insert into workflow_executions (SUCCESS | FAILED | SKIPPED)
```

**Time complexity:** O(n) on number of matching rules. Expected < 10 rules per event type in normal operation.

**Failure isolation:** If a rule action throws, catch the error, write `FAILED` to `workflow_executions`, and continue to the next rule. Never surface a rule failure to the HTTP caller.

---

## Seed Rules

Migration 040 inserts these default rules (disabled by default — staff enables them):

| Name | Trigger | Action |
|------|---------|--------|
| Auto-assign intake to first staff | `intake.submitted` | `ASSIGN_TO_STAFF` → first admin user |
| Send intake confirmation email | `intake.submitted` | `SEND_EMAIL` → contact, template `intake_received` |
| Mark contact QUALIFIED on intake approval | `role_request.approved` | `UPDATE_CONTACT_STATUS` → QUALIFIED |
| 3-day follow-up if no booking | `intake.submitted` | `CREATE_FEED_EVENT` → `crm.follow_up.due`, delay 72h |
| Welcome email on account provision | `onboarding.account.provisioned` | `SEND_EMAIL` → contact, template `welcome` |

---

## UI — Workflow Admin

### `/admin/workflows` — Rule list

Table: Rule name · Trigger event · Action type · Enabled toggle · Edit / Delete

"New rule" button opens a form.

### `/admin/workflows/new` and `/admin/workflows/:id/edit`

Form fields:
1. Name (text)
2. Description (text, optional)
3. Trigger event (select from known `feed_events` types)
4. Condition (optional — field / operator / value)
5. Action type (select from 4 types)
6. Action config (rendered dynamically based on action type)
7. Enabled (toggle)

No drag-to-reorder needed for v1 — position is a numeric field staff can set.

### `/admin/workflows/executions`

Audit log table: Rule name · Feed event · Status · Executed at · Error (if FAILED)

---

## Test Plan

| # | Test | Type |
|---|------|------|
| T1 | `workflow_rules` migration creates table with seed rules | unit |
| T2 | `workflow_executions` migration creates table | unit |
| T3 | Engine executes matching rules when `writeFeedEvent` is called | unit |
| T4 | Engine skips disabled rules | unit |
| T5 | Engine evaluates `eq` condition and skips non-matching events | unit |
| T6 | `UPDATE_CONTACT_STATUS` action updates contact correctly | unit |
| T7 | `ASSIGN_TO_STAFF` action sets `assigned_to` correctly | unit |
| T8 | `SEND_EMAIL` action does not throw in test environment | unit |
| T9 | `CREATE_FEED_EVENT` action (with delay) creates scheduled entry | unit |
| T10 | Rule failure does not surface to HTTP caller — execution logged as FAILED | unit |
| T11 | `/admin/workflows` renders rule list correctly (e2e) | unit |
| T12 | New rule created via form appears in list (e2e) | unit |

---

## Scope Gate (locked)

**Exactly 4 action types for this sprint.** No exceptions.

Proposals for new action types go on the backlog with a ticket. They require:
1. A real workflow that cannot be served by the existing 4 types
2. A schema change to `action_config` that is backward-compatible
3. A migration
4. Full test coverage

This constraint exists because action types are the primary complexity driver in workflow engines. Every new type multiplies the test surface for conditions, failure modes, and edge cases.

---

## Definition of Done

- [ ] Migration 040 applied — `workflow_rules` (with seed) and `workflow_executions` present
- [ ] `writeFeedEvent()` calls engine hook after inserting event
- [ ] All 4 action types execute correctly
- [ ] Condition filtering (eq, neq, contains) works
- [ ] Rule failures are isolated and logged — never break feed event writes
- [ ] `/admin/workflows` renders rule list and form
- [ ] Seed rules present and togglable
- [ ] All 12 tests pass
- [ ] `npm run build` clean
