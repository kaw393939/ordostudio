# Maestro-01: Ops Agent (v2) — Specification

**Sprint:** `sprint-maestro-01-ops-agent`

---

## Scope

### In scope

- `src/lib/api/maestro-tools.ts` — 10 tools + Zod validation + executor
- `src/lib/api/maestro-system-prompt.ts` — operator system prompt
- `src/app/api/v1/agent/maestro/route.ts` — auth-gated route (ADMIN/STAFF/SUPER_ADMIN)
- `src/evals/scenarios/maestro.ts` — 10 eval scenarios (A1–A4, B1–B3, D2, E1–E2)
- `feed_events` writer expansion (5 business events)
- Commission rate bug fix (`0.25 → 0.04` in referral API)

### Out of scope (→ M-01b)

- Booking/availability tools (`list_bookings`, `add_availability_slot`, `cancel_availability_slot`)
- Workflow tools (`list_workflow_executions`, `get_workflow_execution_detail`, `list_workflow_rules`, `toggle_workflow_rule`)
- Expanded KPI tools (`get_funnel_stats`, `get_contact_summary`, `get_newsletter_stats`, `get_event_utilization`)
- Diagnostics (`run_health_check`, `trigger_test_workflow`)
- `assign_intake`, `add_intake_note`

### Out of scope (other sprints)

- Admin chat UI (Maestro-02 — ships together with this sprint)
- Intelligence/brief tools (Maestro-03)
- Persona-specific tools (P-01, P-02)
- Event management tools (sprint-event-management)
- Deal pipeline tools (sprint-commerce-agent)

---

## Success Criteria

| Check | Pass condition |
|-------|----------------|
| Route auth — no session | `POST /api/v1/agent/maestro` → 401 |
| Route auth — USER role | → 403 |
| Route auth — ADMIN role | → 200 streaming response |
| Tool count | `MAESTRO_TOOLS.length === 10` in unit test |
| Tool validation | Each tool rejects invalid args and returns `{ error }` — never throws |
| Write tools transactional | Each DB write wrapped in `db.transaction()` |
| Feed events | `writeFeedEvent()` called in all 5 expanded locations |
| Commission fix | `GET /api/v1/account/referral` returns `commission_rate: 0.04` |
| Evals | `npm run evals:maestro` → 10/10 PASS |
| Full eval suite | `npm run evals` → 27/27 PASS |
| Unit tests | ≥ 1730 passing |
| Build | `npm run build` clean |
