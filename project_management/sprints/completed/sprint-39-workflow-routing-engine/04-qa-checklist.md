# Sprint 39: Workflow Routing Engine — QA Checklist

## Database
- [ ] Migration 040 applied
- [ ] `workflow_rules` table exists with 5 seed rows (all enabled=0)
- [ ] `workflow_executions` table exists

## Engine
- [ ] `writeFeedEvent()` triggers rule evaluation
- [ ] Disabled rules are not executed (status = SKIPPED in log)
- [ ] Condition eq filter: matching event triggers action, non-matching is SKIPPED
- [ ] `UPDATE_CONTACT_STATUS` action updates contact status in DB
- [ ] `ASSIGN_TO_STAFF` action sets `contacts.assigned_to`
- [ ] `SEND_EMAIL` action does not throw in test env
- [ ] `CREATE_FEED_EVENT` action creates a new feed event
- [ ] A rule that throws (e.g., invalid staff_user_id) logs FAILED, does not break the HTTP response
- [ ] All executions recorded in `workflow_executions`

## UI
- [ ] `/admin/workflows` renders rule list with enabled toggles
- [ ] Toggling a rule updates `enabled` field via API
- [ ] New rule form submits and appears in list
- [ ] `/admin/workflows/executions` renders execution history

## Tests
- [ ] `npx vitest run` — all 12 new tests pass, full suite passes
- [ ] `npm run build` exits 0
