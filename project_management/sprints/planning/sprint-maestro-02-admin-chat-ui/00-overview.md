# Maestro-02: Admin Chat UI (v2) — Overview

**Sprint:** `sprint-maestro-02-admin-chat-ui`  
**Date:** 2026-02-26  
**Estimate:** 2–3 days  
**Priority:** 🟡 P2  
**Depends on:** Maestro-01 (`/api/v1/agent/maestro` route must exist)  
**Replaces:** `archive/sprint-maestro-02-admin-chat-ui/`

---

## What This Sprint Builds

The web UI that lets the admin talk to the Maestro ops agent. A split-panel layout at `/admin/chat`:
- **Left panel** — conversation history with the Maestro
- **Right panel** — live ops summary widget (polls `GET /api/v1/admin/ops-summary` every 60s)

History is persisted in `localStorage` (no server-side storage yet — that's Vec-02). Sessions are keyed to the authenticated user's ID.

---

## Key Design Decisions vs v1 Spec

| Area | v1 | v2 |
|------|----|----|
| History storage | `localStorage` (same) | `localStorage` — Vec-02 will add DB persistence |
| Summary panel | Polls `/api/v1/admin/ops-summary` (same) | Added explicit component breakdown for the widget |
| Capture values | Not specified | Action chips rendered from `capturedValues` (e.g., "View Intake →") |
| UX framing | Generic | Explicitly "operator assistant", not "help desk" |
| No new evals | Same | This sprint has 0 evals (UI is tested via E2E, not LLM evals) |
