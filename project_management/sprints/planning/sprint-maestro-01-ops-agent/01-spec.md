# Sprint Maestro-01: Maestro Ops Agent — Specification

**Date:** 2026-02-25  
**Design doc:** `docs/maestro-ops-agent-design.md`  
**Depends on:** Sprint 39 (Workflow Engine) ✅, Anthropic eval harness ✅

---

## Overview

Creates the Maestro Ops Agent: a separate Claude-powered route that gives the authenticated admin a conversational interface to the entire operations pipeline. No UI in this sprint — the agent is tested entirely through the eval harness.

---

## Scope

### In scope

- `src/lib/api/maestro-tools.ts` — 16 admin-tier tools + executor
- `src/lib/api/maestro-system-prompt.ts` — operator-framing system prompt
- `src/app/api/v1/agent/maestro/route.ts` — auth-gated POST route (ADMIN/STAFF only)
- `src/evals/scenarios/maestro.ts` — 14 eval scenarios (A1–E2 from design doc)
- `src/evals/run.ts` — add `maestro` type to `--type` filter
- `package.json` — add `evals:maestro` script

### Out of scope

- Admin chat UI (Sprint Maestro-02)
- Marketing intelligence tools `get_content_search_log` (Sprint Maestro-03 — requires logging migration)
- Email sending from agent chat

---

## Tool Definitions (16 tools)

### Queue Management
1. `get_intake_queue(status?, limit?)` — list intake requests, filterable by status array
2. `get_intake_detail(intake_id)` — full record + status history
3. `update_intake_status(intake_id, new_status, note?)` — advance/change status **[writes]**
4. `assign_intake(intake_id, user_id)` — set owner **[writes]**
5. `add_intake_note(intake_id, note)` — append status history note without status change **[writes]**

### Role Approvals
6. `list_role_requests(status?)` — pending role requests; default status=PENDING
7. `approve_role_request(request_id, note?)` — approve + trigger RoleApproved feed event **[writes]**
8. `reject_role_request(request_id, reason)` — reject + trigger RoleRejected feed event **[writes]**

### Bookings & Availability
9. `list_bookings(status?, limit?)` — maestro availability slots + booking status
10. `add_availability_slot(start_at, end_at)` — create OPEN slot **[writes]**
11. `cancel_availability_slot(slot_id)` — set CANCELLED, blocked if BOOKED **[writes]**

### Workflow Verification
12. `list_workflow_executions(status?, rule_id?, limit?)` — recent executions
13. `get_workflow_execution_detail(execution_id)` — full execution record
14. `list_workflow_rules(enabled_only?)` — rules with status
15. `toggle_workflow_rule(rule_id, enabled)` — enable/disable **[writes]**
16. `trigger_test_workflow(event_type, payload)` — write synthetic feed event, return resulting executions **[writes]**

### Marketing Intelligence
17. `get_funnel_stats(days?)` — intake counts by status for rolling window (default 30d)
18. `get_recent_activity(days?)` — feed event counts by type
19. `get_contact_summary()` — contact status breakdown

### Site Diagnostics
20. `run_health_check()` — key table row counts + migration version + email config
21. `get_audit_log(limit?, action?, actor_type?)` — recent audit log entries

*Total: 21 tools (design doc said 16; the marketing/diagnostic tools are grouped but still count)*

---

## Eval Scenarios (14 scenarios, matching design doc §6)

| ID | Category | Turns | Write tools? | DB assertions? |
|----|----------|-------|--------------|----------------|
| A1 | Queue | 1 | no | no |
| A2 | Queue | 2 | `update_intake_status` | `status='QUALIFIED'` |
| A3 | Queue | 1 | no | no |
| B1 | Role approvals | 1 | no | no |
| B2 | Role approvals | 2 | `approve_role_request` | role assignment + feed event |
| C1 | Workflow | 1 | no | no |
| C2 | Workflow | 1 | no | no |
| C3 | Workflow | 1 | `trigger_test_workflow` | execution row SUCCESS |
| C4 | Workflow | 1 | `toggle_workflow_rule` | `enabled=0` |
| D1 | Marketing | 1 | no | no |
| D2 | Marketing | 1 | no | no |
| D3 | Marketing | 1 | no | no |
| E1 | Diagnostics | 1 | no | no |
| E2 | Diagnostics | 1 | no | no |

---

## Success Criteria

- `npm run evals:maestro` → 14/14 PASS
- `npm run evals` → 27/27 PASS (13 existing + 14 new)
- Route returns 401 when called without admin session
- Route returns 403 when called with non-staff session
- `npm run build` clean
- 1548+ tests pass (no regressions)

---

## Architecture Notes

### How the route differs from `/api/v1/agent/chat`
- Auth check: `requireRole("ADMIN") || requireRole("STAFF")` before any Claude call
- No intake-specific priming — agent is neutral operator-framing
- History passed as simplified text pairs (same pattern as intake route)
- `capturedValues` can capture `intake_id` or `execution_id` for deep-link generation

### Tool safety
- Write tools in the executor check `args` for required fields and return `{ error: "..." }` on missing/invalid rather than throwing.
- `trigger_test_workflow` writes events with `metadata.source = "EVAL"` to distinguish synthetic events.
- `approve_role_request` / `reject_role_request` use existing role management functions — no new logic.

### Where the role approval tables are
Needs confirmation during T1 — check actual column names. Expected tables: `role_requests` or embedded in `roles`/`role_assignments`. Look at Sprint 5 (`sprint-05-admin-approval-ui`) and Sprint 60 (`sprint-60-deals-queue-maestro-assignment-approval.md`) for context.
