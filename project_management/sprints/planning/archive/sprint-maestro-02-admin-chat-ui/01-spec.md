# Sprint Maestro-02: Admin Chat UI — Specification

**Date:** 2026-02-25  
**Design doc:** `docs/maestro-ops-agent-design.md` §7  
**Depends on:** Sprint Maestro-01 ✅ (route + tools must exist first)

---

## Overview

Adds `/admin/chat` — a split-panel admin page where the Maestro types natural-language commands in a chat interface (right panel) while a live queue snapshot (left panel) shows what needs attention. No new backend work: the left panel hits a new lightweight summary endpoint; the right panel hits the existing `/api/v1/agent/maestro` route.

---

## Scope

### In scope

- `GET /api/v1/admin/ops-summary` — no LLM, pure DB aggregation, returns queue counts
- `src/app/(admin)/chat/page.tsx` — split layout, auth-gated
- `src/components/admin/OpsChat.tsx` — chat panel component
- `src/components/admin/OpsSummaryPanel.tsx` — left panel with live counts
- Admin sidebar navigation entry: "Chat" → `/admin/chat`
- `localStorage` history persistence (key: `maestro-chat-history`)
- Markdown rendering in assistant messages

### Out of scope

- Server-side chat history storage
- WebSocket / real-time push (polling on interval)
- Deep-link actions from the context panel (clicking a count doesn't open a modal)
- Mobile-specific layout (desktop-first, min-width 1024px)

---

## Success Criteria

- `/admin/chat` renders for authenticated ADMIN/STAFF users
- `/admin/chat` redirects to `/login` for unauthenticated users
- OpsChat sends messages to `/api/v1/agent/maestro` and renders responses
- Markdown bold/italic/lists render correctly in assistant bubbles
- Typing indicator shows while awaiting response
- Error state shows with retry button on network failure
- OpsSummaryPanel counts update every 30 seconds
- Chat history persists across page refreshes (localStorage)
- `npm run build` clean
- 1548+ tests pass (no regressions — UI components don't need unit tests in this sprint)

---

## `GET /api/v1/admin/ops-summary` Contract

```json
{
  "intake_queue": {
    "new": 3,
    "triaged": 1,
    "qualified": 2
  },
  "pending_role_requests": 2,
  "workflow_failures_24h": 1,
  "open_slots": 4
}
```

Response time target: < 50ms (pure DB reads, no LLM).

---

## Component API

### `<OpsChat />`

```typescript
interface OpsChatProps {
  // no props — self-contained, reads from localStorage, posts to maestro route
}
```

State:
- `messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>`
- `input: string`
- `isLoading: boolean`
- `error: string | null`

Key behavior:
- On submit: append user message, set isLoading, POST to `/api/v1/agent/maestro`
- On success: append assistant message with `reply` field
- On error: show error banner with retry (same message re-sent)
- History serialized to localStorage on every append

### `<OpsSummaryPanel />`

```typescript
interface OpsSummaryPanelProps {
  // no props — self-contained, polls /api/v1/admin/ops-summary every 30s
}
```

Displays:
- Intake queue (NEW count with badge, links to `/admin/intake`)
- Pending role requests (count + link to `/admin/roles`)
- Workflow failures 24h (count + link to `/admin/workflows/executions`)
- Open slots (count + link to `/admin/availability`)

---

## Design Notes

Layout follows the Maestro cockpit wireframe from `docs/maestro-ops-agent-design.md` §7:
- Left panel: 280px fixed, white background, subtle border-right
- Right panel: flex-1, chat messages above, input fixed at bottom
- Page is a full-height flex row: `h-[calc(100vh-64px)]` (accounts for admin topbar)

Use existing Tailwind + shadcn components from the design system. No new component library dependencies.

Markdown rendering: use `react-markdown` (already a dependency if present; add if not). Strip HTML tags for security.

Message timestamp: show in 12h format, aligned right in assistant messages, left in user messages.
