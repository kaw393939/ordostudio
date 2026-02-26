# Sprint 39: Workflow Routing Engine — Specification

## Overview
Adds a rule-based automation engine that fires actions when feed events are written. Exactly 4 action types. No external dependencies.

## Scope

### In scope
- Migration 040: `workflow_rules` (seeded, disabled), `workflow_executions`, optional `scheduled_feed_events`
- Engine hook in `writeFeedEvent()` — evaluates matching rules, executes actions, logs results
- 4 action types: UPDATE_CONTACT_STATUS, ASSIGN_TO_STAFF, SEND_EMAIL, CREATE_FEED_EVENT
- Condition filtering: eq, neq, contains, gt, lt
- `/admin/workflows` — rule list + toggle
- `/admin/workflows/new` + `/admin/workflows/:id/edit` — rule form
- `/admin/workflows/executions` — audit log

### Out of scope
- Async/delayed execution (the delay_hours feature can be a follow-up)
- More than 4 action types
- Nested condition trees

## Success Criteria
- Engine fires on `writeFeedEvent()` call
- Rule failures never surface to HTTP callers
- All 4 action types execute correctly
- Seed rules present and togglable
- 12 tests pass, build clean
