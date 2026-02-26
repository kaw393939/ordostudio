# Maestro-01: Ops Agent (v2) — Overview

**Sprint:** `sprint-maestro-01-ops-agent`
**Date:** 2026-02-26
**Estimate:** 3–4 days (deliver together with Maestro-02)
**Priority:** 🟠 P1
**Depends on:** Maestro-00b (roles must exist), Phase 0 (eval gate clean)
**Replaces:** `archive/sprint-maestro-01-ops-agent/`

---

## What This Sprint Builds

A Claude-powered conversational route that gives the authenticated admin
(ADMIN, STAFF) a natural language interface to the core operations pipeline.

**10 tools. No more.** Proven daily-use patterns first. Scope expansion is in
`sprint-maestro-01b-extended` — but only after observing which gaps users
actually hit after this sprint ships.

M-01 and M-02 (admin chat UI) are a single delivery unit. M-02 is built
immediately after the route exists so every tool is validated through the
UI before scope is expanded.

---

## Key Changes Versus v2 Original Spec

| Area | v2 original | v2 revised (this sprint) |
|------|-------------|--------------------------|
| Tool count | 25 | **10** (core daily-use only) |
| Eval count | 18 | **10** (matching 10 tools) |
| KPI tools in scope | 6 | 2 (`get_revenue_summary`, `get_recent_activity`) |
| Booking/workflow tools | 7 | Deferred → M-01b |
| Diagnostics | `run_health_check`, `trigger_test_workflow` | Deferred → M-01b |
| M-02 relationship | Sequential | **Simultaneous delivery** |

**Deferred tools (M-01b):** `assign_intake`, `add_intake_note`, `list_bookings`,
`add_availability_slot`, `cancel_availability_slot`, `list_workflow_executions`,
`get_workflow_execution_detail`, `list_workflow_rules`, `toggle_workflow_rule`,
`get_funnel_stats`, `get_contact_summary`, `get_newsletter_stats`,
`get_event_utilization`, `run_health_check`, `trigger_test_workflow`

---

## The 10 Core Tools

| Group | Tool |
|-------|------|
| Queue | `get_intake_queue` |
| Queue | `get_intake_detail` |
| Queue | `update_intake_status` |
| Roles | `list_role_requests` |
| Roles | `approve_role_request` |
| Roles | `reject_role_request` |
| KPI | `get_revenue_summary` |
| KPI | `get_recent_activity` |
| Ops | `get_ops_summary` |
| Audit | `get_audit_log` |

---

## What This Unlocks

After this sprint:
- Maestro-02 can build and validate the chat UI (just needs the `/api/v1/agent/maestro` route)
- Journey-F can add escalation tools to the same `maestro-tools.ts`
- Commerce-agent sprint wires the existing deal MCP tools to the same agent
- Eval count reaches ~27 (17 baseline + 10 new)
- Admin has a working interface for the two highest-frequency daily tasks:
  intake queue management and role approvals
