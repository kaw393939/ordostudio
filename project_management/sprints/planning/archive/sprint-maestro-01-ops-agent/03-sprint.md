# Sprint Maestro-01: Maestro Ops Agent — Sprint Plan

---

## T1: Audit Existing Schema for Tool Inputs

**Goal:** Before writing any code, confirm the exact column names and table structure for the four non-obvious areas.

**Do:**
- Check role approval tables: `src/lib/api/` for anything related to role_requests, role_assignments — note exact table/column names
- Check `contacts` table columns and status enum values
- Check `feed_events` table — confirm `metadata` column is JSON text
- Check `maestro_availability` columns — `status`, `start_at`, `end_at`, `id`

**Output:** Add confirmed names as a comment block at the top of `maestro-tools.ts`.

---

## T2: Create `src/lib/api/maestro-system-prompt.ts`

```typescript
export const MAESTRO_SYSTEM_PROMPT = `...`;
```

Operator framing (see design doc §4). Key rules:
- Lead with what matters (queue depth, pending approvals, failures)
- Always confirm before irreversible changes
- Never fabricate data — if a query returns empty, say so
- Synthesize marketing numbers into plain-language summaries
- When reporting workflow failures, explain what the rule was trying to do

---

## T3: Create `src/lib/api/maestro-tools.ts` — Definitions

Export `MAESTRO_TOOL_DEFINITIONS` array: 21 tool definitions in OpenAI/Anthropic tool format.

Groups:
1. Queue management (5 tools)
2. Role approvals (3 tools)
3. Bookings & availability (3 tools)
4. Workflow verification (5 tools, including `trigger_test_workflow`)
5. Marketing intelligence (3 tools)
6. Site diagnostics (2 tools)

Each tool definition: `name`, `description`, `parameters` (JSON Schema object). Descriptions must be precise — Claude uses them to decide when to call each tool.

---

## T4: Create `src/lib/api/maestro-tools.ts` — Executor

Export `executeMaestroTool(name, args): Promise<unknown>`.

**Queue tools:**
- `get_intake_queue`: SELECT from `intake_requests` with optional status filter. Returns truncated goals (first 200 chars).
- `get_intake_detail`: SELECT intake + JOIN status_history + LEFT JOIN bookings.
- `update_intake_status`: Call existing update function or raw UPDATE. Write status_history entry.
- `assign_intake`: UPDATE `intake_requests SET owner_user_id`.
- `add_intake_note`: INSERT into `intake_status_history` without changing status.

**Role tools:**
- `list_role_requests`: SELECT from role requests table (confirm name in T1). Left join user name.
- `approve_role_request`: Update request status + insert role assignment + write `RoleApproved` feed event.
- `reject_role_request`: Update request status to REJECTED + write `RoleRejected` feed event.

**Booking tools:**
- `list_bookings`: SELECT from `maestro_availability` with JOIN on bookings if exists.
- `add_availability_slot`: INSERT into `maestro_availability` with status=OPEN.
- `cancel_availability_slot`: UPDATE status=CANCELLED; return error if status=BOOKED.

**Workflow tools:**
- `list_workflow_executions`: SELECT from `workflow_executions` JOIN `workflow_rules`. Filters.
- `get_workflow_execution_detail`: Full row including `metadata_json`.
- `list_workflow_rules`: SELECT all rules.
- `toggle_workflow_rule`: UPDATE `workflow_rules SET enabled` by id.
- `trigger_test_workflow`: INSERT feed event with `metadata.source='EVAL'` + call `evaluateWorkflowRules()`. Return resulting execution rows.

**Marketing tools:**
- `get_funnel_stats`: GROUP BY status WHERE created_at >= now - N days.
- `get_recent_activity`: GROUP BY event_type WHERE created_at >= now - N days from `feed_events`.
- `get_contact_summary`: GROUP BY status from `contacts`.

**Diagnostic tools:**
- `run_health_check`: Check migration version, non-empty tables, env vars.
- `get_audit_log`: SELECT from `audit_log` with filters.

---

## T5: Create `src/app/api/v1/agent/maestro/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate — extract session, verify ADMIN or STAFF role
  // 2. Parse body: { message, history }
  // 3. Build priorTextMessages from history (same as intake route)
  // 4. Call runClaudeAgentLoop({
  //      apiKey,
  //      systemPrompt: MAESTRO_SYSTEM_PROMPT,
  //      history: priorTextMessages,
  //      userMessage: message,
  //      tools: MAESTRO_TOOL_DEFINITIONS,
  //      executeToolFn: async (name, args) => executeMaestroTool(name, args)
  //    })
  // 5. Return { reply, capturedValues }
}
```

Auth: use existing session/role check pattern from other admin routes. Return 401/403 before any Claude call.

Rate limit: apply `withRateLimit` at 30 req/min per session.

---

## T6: Add `maestro` eval type to `src/evals/run.ts`

- Import `maestroScenarios` from `../evals/scenarios/maestro`
- Add to `allScenarios` array alongside existing types
- `--type maestro` filter works

---

## T7: Create `src/evals/scenarios/maestro.ts` — 14 Scenarios

### Pre-setup helpers (internal to module)

```typescript
function seedIntakes(db, count, status = 'NEW')
function seedRoleRequest(db, userId)
function seedWorkflowExecutions(db, rules: Array<{ruleId, status, error?}>)
function seedContacts(db)
function seedFeedEvents(db, count, eventType)
```

All helpers use direct `db.prepare().run()` — no HTTP.

### Scenario A1: maestro-intake-queue-summary
- preSetup: seed 3 NEW intakes + 1 QUALIFIED
- 1 turn: "What's in my intake queue?"
- Checks: `tool_called: get_intake_queue`, regex `3` and `NEW`

### Scenario A2: maestro-intake-triage
- preSetup: seed 1 NEW intake, capture its id
- Turn 1: "What's in my intake queue?" — check `get_intake_queue` called
- Turn 2: "Mark that intake as QUALIFIED" — check `update_intake_status` called
- DB assertion: `SELECT status AS result FROM intake_requests WHERE id = ?` = `QUALIFIED`

### Scenario A3: maestro-intake-detail
- preSetup: seed 1 intake + 2 status history entries
- 1 turn: "Give me the full details on that intake"
- Check: `get_intake_detail` called

### Scenario B1: maestro-role-approval-list
- preSetup: seed 2 pending role requests
- 1 turn: "Any pending role requests?"
- Checks: `list_role_requests` called, regex `2`

### Scenario B2: maestro-role-approve-and-verify
- preSetup: seed 1 pending role request, capture request_id
- Turn 1: list requests
- Turn 2: "Approve the first one"
- Check: `approve_role_request` called
- DB assertions: role assignment exists + `RoleApproved` feed event exists

### Scenario C1: maestro-workflow-execution-summary
- preSetup: seed 3 workflow executions (2 SUCCESS, 1 FAILED)
- 1 turn: "Did the workflows run cleanly today?"
- Check: `list_workflow_executions` called, response mentions failure

### Scenario C2: maestro-workflow-failure-detail
- preSetup: seed 1 FAILED execution with error = "contact not found"
- 1 turn: "What went wrong with the last workflow failure?"
- Check: `get_workflow_execution_detail` called, response contains error context

### Scenario C3: maestro-trigger-test-workflow
- preSetup: enable 1 workflow rule for event type `TriageTicket`
- 1 turn: "Run a test TriageTicket workflow and tell me what happened"
- Check: `trigger_test_workflow` called
- DB assertion: `SELECT COUNT(*) AS result FROM workflow_executions` = 1

### Scenario C4: maestro-toggle-workflow-rule
- preSetup: seed 1 enabled workflow rule, capture id
- 1 turn: "Disable that workflow rule"
- Check: `toggle_workflow_rule` called
- DB assertion: `SELECT enabled AS result FROM workflow_rules LIMIT 1` = 0

### Scenario D1: maestro-funnel-stats
- preSetup: seed 5 intakes at various statuses within last 30 days
- 1 turn: "Give me a funnel summary for this month"
- Check: `get_funnel_stats` called, regex `qualified|funnel|conversion`

### Scenario D2: maestro-weekly-activity-brief
- preSetup: seed 10 feed events of mixed types within last 7 days
- 1 turn: "What happened this week?"
- Check: `get_recent_activity` called, response mentions event types

### Scenario D3: maestro-contact-pipeline
- preSetup: seed contacts at 4 different statuses
- 1 turn: "Where are we with the contact pipeline?"
- Check: `get_contact_summary` called, response mentions status distribution

### Scenario E1: maestro-health-check
- preSetup: standard seeded DB
- 1 turn: "Is the site healthy?"
- Check: `run_health_check` called, response includes "pass" language

### Scenario E2: maestro-audit-log
- preSetup: seed 3 audit log entries
- 1 turn: "Show me the last few audit log entries"
- Check: `get_audit_log` called, response mentions actions

---

## T8: Add `evals:maestro` to `package.json`

```json
"evals:maestro": "node --import tsx ./src/evals/run.ts -- --type maestro"
```

---

## T9: QA

See `04-qa-checklist.md`
