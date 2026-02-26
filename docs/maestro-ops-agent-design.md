# Maestro Ops Agent — Design Document

**Date:** 2026-02-25  
**Status:** Approved for sprint planning  
**Scope:** Within existing DB schema, auth system, workflow engine, and eval harness  

---

## 1. Problem Statement

Today the Maestro manages the site through a traditional admin dashboard — clicking through tables, forms, and toggle buttons. This is:

- **Slow for triage** — each intake requires navigating to its detail page, evaluating signals, picking a status, saving.
- **Opaque for workflow verification** — confirming that the right automation fired requires cross-referencing `/admin/workflows/executions` manually.
- **Blind to marketing context** — there is no synthesized view of funnel health, what prospects are searching for, or where the pipeline is stuck.
- **Context-switching heavy** — the Maestro loses conversational continuity when a decision spans multiple pages.

The intake agent already proves the pattern works from the prospect side. We can apply the same architecture to the operator side: a single chat surface where the Maestro can manage the entire pipeline conversationally, with the agent calling admin-tier tools and reading back what matters.

---

## 2. Design Goals

1. **Conversational queue management** — Maestro can triage intakes, approve roles, and manage availability through chat.
2. **Inline workflow verification** — ask in plain language whether a workflow fired correctly; agent explains what happened from `workflow_executions`.
3. **Marketing intelligence** — agent synthesizes funnel stats, activity summaries, and pipeline health on demand.
4. **Full eval coverage** — every Maestro workflow has a corresponding eval scenario that verifies it against a real database; these run in CI before any release.
5. **Augments the dashboard, does not replace it** — a dedicated `/admin/chat` page provides the chat interface; existing admin pages remain for power users and bulk operations.

---

## 3. Architecture Overview

```
Browser (admin/chat)
        │
        ▼
POST /api/v1/agent/maestro          ← new route, auth-gated (staff+)
        │
        ├── runClaudeAgentLoop()     ← shared Anthropic tool-use loop
        │        │
        │        └── MAESTRO_TOOL_DEFINITIONS  ← separate from intake tools
        │
        └── executeMaestroTool()    ← new executor, reads/writes via existing service layer
                │
                ├── DB reads:   openCliDb(resolveConfig()) — same pattern as all other routes
                └── DB writes:  existing lib/api/* functions (createIntakeRequest, etc.)
```

The Maestro agent is **completely separate** from the intake agent:
- Separate route (`/api/v1/agent/maestro` vs `/api/v1/agent/chat`)
- Separate system prompt (operator framing, not prospect framing)
- Separate tool set (admin tools not available to prospects)
- Same underlying `runClaudeAgentLoop()` and `DEFAULT_CLAUDE_MODEL`

---

## 4. System Prompt — Maestro Ops Agent

Core properties:
- You are the Ops Agent for Studio Ordo, working alongside the Maestro (operator).
- You have read/write access to the intake queue, role approvals, bookings, workflow execution history, contact statuses, and marketing funnel data.
- You **always confirm before making irreversible changes** (status regressions, deletions, role revocations).
- Actions that can be reversed (advancing an intake, toggling a rule) do not require confirmation.
- You lead with what matters: queue depth, pending approvals, any workflow failures.
- When reporting on marketing, you synthesize numbers into one plain-language summary — do not just dump raw data.
- You never fabricate data. If a query returns nothing, say so.

---

## 5. Tool Catalogue

All tools are read-only unless explicitly marked **[writes DB]**.

### 5.1 Queue Management

| Tool | Description |
|------|-------------|
| `get_intake_queue` | List intake requests filtered by status (`NEW`, `TRIAGED`, `QUALIFIED`, `REJECTED`, `BOOKED`, `CLOSED`). Returns id, contact name, email, audience, goals summary, created_at. Default: all non-closed. |
| `get_intake_detail` | Full record for one intake: all fields + status history + associated bookings. |
| `update_intake_status` **[writes DB]** | Advance or change an intake's status. Required args: `intake_id`, `new_status`, optional `note`. Blocked: cannot regress from BOOKED to NEW without a reason. |
| `assign_intake` **[writes DB]** | Set `owner_user_id` on an intake. |
| `add_intake_note` **[writes DB]** | Append a status history note without changing status. |

### 5.2 Role Approvals

| Tool | Description |
|------|-------------|
| `list_role_requests` | List pending role approval requests. Shows user, requested role, current role, submitted_at. |
| `approve_role_request` **[writes DB]** | Approve a role request. Writes to the role assignment table, triggers `RoleApproved` feed event (which fires workflow rules). |
| `reject_role_request` **[writes DB]** | Reject with a reason. Triggers `RoleRejected` feed event. |

### 5.3 Bookings & Availability

| Tool | Description |
|------|-------------|
| `list_bookings` | List upcoming maestro availability slots with booking status (OPEN, BOOKED, CANCELLED). |
| `add_availability_slot` **[writes DB]** | Create a `maestro_availability` slot. Args: `start_at`, `end_at`. |
| `cancel_availability_slot` **[writes DB]** | Set slot status to CANCELLED. Only allowed if slot has no confirmed booking. |

### 5.4 Workflow Verification

| Tool | Description |
|------|-------------|
| `list_workflow_executions` | Recent executions. Filters: `status` (SUCCESS/FAILED/SKIPPED), `rule_id`, `event_type`, `limit`. Returns rule name, trigger event, status, duration, created_at. |
| `get_workflow_execution_detail` | Full execution record: rule snapshot, event payload, action taken, error message if FAILED. |
| `list_workflow_rules` | All workflow rules: name, trigger, action_type, condition summary, enabled. |
| `toggle_workflow_rule` **[writes DB]** | Enable or disable a rule by id or name. |
| `trigger_test_workflow` **[writes DB]** | Write a synthetic feed event of a given type with a given payload to verify the workflow engine responds correctly. Returns the resulting `workflow_executions` rows. |

### 5.5 Marketing Intelligence

| Tool | Description |
|------|-------------|
| `get_funnel_stats` | Counts by intake status for a rolling window (default: last 30 days). Shows: new, triaged, qualified, booked, rejected, conversion rate qualified→booked. |
| `get_recent_activity` | Summary of feed events for the last N days. Groups by event type + count. |
| `get_contact_summary` | Contact status breakdown: NEW, CONTACTED, QUALIFIED, ACTIVE, CHURNED. |
| `get_content_search_log` | Top search queries run through `content_search` in the last 30 days (requires logging — see Sprint C). |

### 5.6 Site Diagnostics

| Tool | Description |
|------|-------------|
| `run_health_check` | Confirms key tables are non-empty, DB version is latest migration, transactional email provider is configured. Returns pass/warn/fail per check. |
| `get_audit_log` | Last N audit log entries. Filters: `action`, `actor_type`, `target_type`. |

---

## 6. Eval Scenarios

Fourteen scenarios across five categories. All use ephemeral databases in the existing eval harness.

### Category A: Queue Management (3 scenarios)

**A1 · `maestro-intake-queue-summary`**  
Pre-seed: 3 NEW intakes, 1 QUALIFIED.  
Turn: "What's in my intake queue?"  
Checks: `get_intake_queue` called; response mentions 3 new, 1 qualified.

**A2 · `maestro-intake-triage`**  
Pre-seed: 1 NEW intake.  
Turns: (1) ask for queue → agent lists it; (2) "Mark the first one as QUALIFIED" → `update_intake_status` called → DB updated.  
DB assertion: `status = 'QUALIFIED'`.

**A3 · `maestro-intake-detail`**  
Pre-seed: 1 intake with 2 status history entries.  
Turn: "Give me full details on intake [id]."  
Checks: `get_intake_detail` called; response includes goals and status history.

### Category B: Role Approvals (2 scenarios)

**B1 · `maestro-role-approval-list`**  
Pre-seed: 2 pending role requests.  
Turn: "Any pending role requests?"  
Checks: `list_role_requests` called; response mentions 2 requests.

**B2 · `maestro-role-approve-and-verify`**  
Pre-seed: 1 pending role request.  
Turns: (1) list requests; (2) "Approve it."  
Checks: `approve_role_request` called.  
DB assertion: role assignment row exists; `RoleApproved` feed event written.

### Category C: Workflow Verification (4 scenarios)

**C1 · `maestro-workflow-execution-summary`**  
Pre-seed: 3 workflow executions (2 SUCCESS, 1 FAILED).  
Turn: "Did the workflows run cleanly today?"  
Checks: `list_workflow_executions` called; response mentions 1 failure.

**C2 · `maestro-workflow-failure-detail`**  
Pre-seed: 1 FAILED execution with an error message.  
Turn: "What went wrong with the last workflow failure?"  
Checks: `get_workflow_execution_detail` called; response includes error context.

**C3 · `maestro-trigger-test-workflow`**  
Pre-seed: 1 enabled rule for `TriageTicket`.  
Turn: "Run a test workflow for a TriageTicket event and tell me what happened."  
Checks: `trigger_test_workflow` called; synthetic feed event written; `workflow_executions` row is SUCCESS.  
DB assertion: 1 execution row with status SUCCESS.

**C4 · `maestro-toggle-workflow-rule`**  
Pre-seed: 1 enabled rule.  
Turn: "Disable the onboarding-notification rule."  
Checks: `toggle_workflow_rule` called with enabled=false.  
DB assertion: `enabled = 0` on that rule.

### Category D: Marketing Intelligence (3 scenarios)

**D1 · `maestro-funnel-stats`**  
Pre-seed: 5 intakes at various statuses.  
Turn: "Give me a funnel summary for this month."  
Checks: `get_funnel_stats` called; response includes conversion language.

**D2 · `maestro-weekly-activity-brief`**  
Pre-seed: 10 feed events over last 7 days.  
Turn: "What happened this week?"  
Checks: `get_recent_activity` called; response groups by type and includes counts.

**D3 · `maestro-contact-pipeline`**  
Pre-seed: contacts at 4 different statuses.  
Turn: "Where are we with the contact pipeline?"  
Checks: `get_contact_summary` called; response mentions status distribution.

### Category E: Site Diagnostics (2 scenarios)

**E1 · `maestro-health-check`**  
Pre-seed: standard seeded DB.  
Turn: "Is the site healthy?"  
Checks: `run_health_check` called; response says all checks pass.

**E2 · `maestro-audit-log`**  
Pre-seed: 3 audit log entries.  
Turn: "Show me the last few audit log entries."  
Checks: `get_audit_log` called; response includes action names.

---

## 7. Admin Chat UI — `/admin/chat`

### Layout

```
┌─────────────────────────────────────────────────┐
│ Admin sidebar (unchanged)                        │
├─────────────────────────────────────────────────┤
│ /admin/chat                                      │
│                                                  │
│  ┌─────────────────────┐  ┌───────────────────┐  │
│  │  Queue snapshot      │  │  Chat             │  │
│  │  ─────────────────   │  │  ───────────────  │  │
│  │  3 NEW intakes       │  │  > What's pending?│  │
│  │  2 role requests     │  │                   │  │
│  │  1 workflow failure  │  │  ···              │  │
│  └─────────────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Context panel (left, 280px fixed)
- Loaded on mount via `GET /api/v1/admin/ops-summary` (new route, no LLM)
- Shows live counts: intake queue, pending role requests, workflow failures (last 24h)
- Refreshes every 30s
- Each count is a link to the corresponding admin page

### Chat panel (right, fills remaining space)
- Standard chat UX — input at bottom, scroll to latest
- Markdown rendering in assistant responses
- Persists history in `localStorage` per session (not server-side for now)
- `POST /api/v1/agent/maestro` — same shape as intake agent route
- Typing indicator
- Error state with retry

### Auth
- Route and API guarded by `requireRole("ADMIN")` / `requireRole("STAFF")`
- Non-auth redirect to `/login`

---

## 8. Data Requirements

Everything needed already exists in the DB schema. No new migrations required for the core feature. Migration needed only for Sprint C (content search logging).

Existing tables used:
- `intake_requests`, `intake_status_history`
- `users`, `roles`, `role_assignments`  (role approval tables — confirm exact names)
- `maestro_availability`
- `workflow_rules`, `workflow_executions`, `feed_events`
- `contacts`
- `audit_log`

---

## 9. Security Notes

- All write tools check that the calling session is STAFF or ADMIN before executing (enforced in the route handler, not in the tool).
- `trigger_test_workflow` writes a real feed event with `source = 'EVAL'` marker so it can be filtered from production analytics.
- `toggle_workflow_rule` requires the rule name or id — no wildcard disabling.
- Rate limiting applies to the `/api/v1/agent/maestro` route at 30 req/min per session (generous for conversational use, restrictive for abuse).

---

## 10. Out of Scope (this design cycle)

- Sending emails from the chat (SEND_EMAIL via agent) — tool exists in workflow engine but not directly callable from Maestro agent v1
- Bulk intake triage (triage all NEW → TRIAGED at once)
- Real-time push (queue snapshot refreshes on interval, not websocket)
- Content editing via chat
- Storing chat history server-side (localStorage only for now)

---

## 11. Sprint Breakdown Summary

| Sprint | Name | Primary Output |
|--------|------|----------------|
| **A** | Maestro Ops Agent Core | Route + tools + 14 eval scenarios |
| **B** | Admin Chat UI | `/admin/chat` + ops-summary API |
| **C** | Marketing Intelligence | Funnel stats, content search logging, contact pipeline |
