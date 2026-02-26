# Maestro-02: Admin Chat UI (v2) — Overview

**Sprint:** `sprint-maestro-02-admin-chat-ui`  
**Date:** 2026-02-26  
**Estimate:** 2–3 days  
**Priority:** � P1 (ships together with Maestro-01)  
**Depends on:** Maestro-01 (`/api/v1/agent/maestro` route must exist)  
**Replaces:** `archive/sprint-maestro-02-admin-chat-ui/`

---

## What This Sprint Builds

The web UI that lets the admin talk to the Maestro ops agent. A split-panel layout at `/admin/chat`:
- **Left panel** — conversation history with the Maestro
- **Right panel** — live ops summary widget (polls `GET /api/v1/admin/ops-summary` every 60s)

History is persisted in `localStorage` (no server-side storage yet — that's Vec-02). Sessions are keyed to the authenticated user's ID.

---

## Role of This Sprint

**M-02 is the validation gate for M-01's 10 tools.**

M-01 and M-02 ship as a single delivery unit. The reason: you cannot tell whether an agent tool
is actually usable until you have a real UI to converse through. Code-level tests prove tools
execute correctly; the chat UI proves they work at human pace for the real user.

**Validation rule:** If any of the 10 M-01 tools doesn't work naturally through this interface —
awkward confirmations, confusing prompts, response output that's hard to read — fix the tool spec
(and feed back to M-01) rather than papering over it with UI scaffolding. **Do not expand scope
to M-01b until at least 8 of the 10 M-01 tools are comfortable through this UI.**

History persistence (Vec-02) is deliberately deferred. If history turns out to be a real blocker
for usage, that observation is the user research needed to un-defer Vec-02.

---

## Key Design Decisions vs v1 Spec

| Area | v1 | v2 |
|------|----|----|
| History storage | `localStorage` (same) | `localStorage` — DB persistence deferred (Vec-02 is parking-lot) |
| Summary panel | Polls `/api/v1/admin/ops-summary` (same) | Added explicit component breakdown for the widget |
| Capture values | Not specified | Action chips rendered from `capturedValues` (e.g., "View Intake →") |
| UX framing | Generic | Explicitly "operator assistant", not "help desk" |
| No new evals | Same | This sprint has 0 evals (UI is tested via E2E, not LLM evals) |
