# Sprint Event-Management: Event Lifecycle Tools — Overview

## Status
**NOT STARTED** | Priority: 🟡 P2 | Depends on: Maestro-01 + Maestro-02 complete

---

## One-Liner
Allow the operator to create, update, and inspect events through the ops agent —
closing the gap where event management requires direct DB access or a separate admin form.

---

## Why This Sprint Exists

From the reconciliation report:
> Domain 5 (Events / Delivery): "MCP tool: any delivery tool ❌ Not present"

Keith already uses `get_available_slots` and `create_booking` via the agent.
Events (workshops, cohorts, webinars) follow the same pattern but have no agent tools.
Today Keith creates events directly in the DB or via a form that bypasses the conversational
interface.

This sprint adds 4 tools to the ops agent for the complete create→update→inspect lifecycle.

---

## Scope Boundaries

| In scope | Out of scope |
|---|---|
| 4 event tools in ops agent | Email notification sending |
| 4 evals EM-01 through EM-04 | Public event registration (existing `create_booking` unchanged) |
| ADMIN/STAFF auth on create/update | Payment processing for paid events |

---

## The 4 Tools

| Tool | Auth | What happens |
|------|------|--------------|
| `create_event` | ADMIN/STAFF | INSERT into `events`; fires feed event |
| `update_event` | ADMIN/STAFF | UPDATE `events` row; fires feed event |
| `get_event_attendance` | ADMIN/STAFF | COUNT from `event_registrations` |
| `list_registered_attendees` | ADMIN/STAFF | SELECT from `event_registrations` + `users` |

---

## Outputs Produced

- 4 new tools in `src/lib/api/maestro-tools.ts`
- 3 new evals in `src/evals/scenarios/events.ts`
- Total tools in ops agent: 13 → 17 (after Journey-F)

---

## Estimated Effort

| Role | Hours |
|---|---|
| Backend | 3 h |
| Evals | 1.5 h |
| Total | 4.5 h |
