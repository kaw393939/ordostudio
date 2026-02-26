# Sprint 39: Workflow Routing Engine — Sprint Plan

## Tasks

### T1: Migration 040 — Workflow Tables
- **File:** `src/cli/db.ts`
- Add migration `040_workflow_engine` with `workflow_rules` (seeded, enabled=0), `workflow_executions`.
- Full schema + seed rules in `docs/agent_planning/05-routing-engine.md`.
- Run `APPCTL_DB_FILE=./data/app.db npm run cli -- db migrate`

---

### T2: Engine Core Library
- **File:** `src/lib/api/workflow-engine.ts`
- Export `evaluateWorkflowRules(db, event: FeedEvent)`:
  - SELECT rules WHERE trigger_event = event.type AND enabled = 1, ORDER BY position
  - For each rule:
    - Evaluate `condition_json` (if present) against event payload
    - If match: call `executeAction(db, rule, event)`
    - Insert into `workflow_executions` — SUCCESS, FAILED, or SKIPPED
  - Errors caught per-rule; never re-thrown
- Export `evaluateCondition(condition, event): boolean` — handles eq/neq/contains/gt/lt
- Export `executeAction(db, rule, event)`:
  - Switch on `rule.action_type`
  - `UPDATE_CONTACT_STATUS`: find contact by event's user/email, update status
  - `ASSIGN_TO_STAFF`: set `contacts.assigned_to`
  - `SEND_EMAIL`: call email utility with template
  - `CREATE_FEED_EVENT`: call `writeFeedEvent()` (delay_hours ignored in v1)

---

### T3: Hook Engine into `writeFeedEvent()`
- **File:** `src/lib/api/feed-events.ts`
- After the INSERT succeeds, call `evaluateWorkflowRules(db, insertedEvent)` in a try/catch
- The try/catch must ensure any engine error is logged but never propagates to the caller

---

### T4: Workflow Admin API Routes
- **File:** `src/app/api/v1/admin/workflows/route.ts` — `GET` (list), `POST` (create) — staff only
- **File:** `src/app/api/v1/admin/workflows/[id]/route.ts` — `GET`, `PATCH`, `DELETE` — staff only
- **File:** `src/app/api/v1/admin/workflows/executions/route.ts` — `GET` paginated log — staff only

---

### T5: Workflow Admin UI Pages
- **File:** `src/app/(admin)/workflows/page.tsx` — rule list with toggles
- **File:** `src/app/(admin)/workflows/new/page.tsx` — new rule form
- **File:** `src/app/(admin)/workflows/[id]/edit/page.tsx` — edit rule form
- **File:** `src/app/(admin)/workflows/executions/page.tsx` — audit log

---

### T6: Write Tests (12 tests)

---

### T7: QA
