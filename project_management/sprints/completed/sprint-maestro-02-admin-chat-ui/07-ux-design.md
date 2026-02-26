# Maestro-02: Admin Chat UI — UX Design

**Sprint:** `sprint-maestro-02-admin-chat-ui`

---

## Layout: `/admin/chat`

```
┌─────────────────────────────────────────────────────────────────┐
│ /admin/chat                                                      │
│                                                                  │
│ ┌────────────────────────────────┐  ┌──────────────────────────┐│
│ │  MAESTRO CHAT                  │  │  OPS SUMMARY             ││
│ │                                │  │  ─────────────────────── ││
│ │  [assistant] Good morning.     │  │  INTAKE FUNNEL (7d)      ││
│ │  You have 3 pending intakes    │  │  NEW        3            ││
│ │  and 1 role request.           │  │  TRIAGED    1            ││
│ │                                │  │  QUALIFIED  1            ││
│ │  [user] Show me the queue      │  │  BOOKED     0            ││
│ │                                │  │                          ││
│ │  [assistant] Here are the      │  │  REVENUE (7d)            ││
│ │  pending intakes:              │  │  Platform    $8,000      ││
│ │    • River Chen — NEW          │  │  Commission  $1,600      ││
│ │    • Amir Patel — TRIAGED      │  │                          ││
│ │    • Jo Morel — NEW            │  │  RECENT ACTIVITY         ││
│ │                                │  │  3 new intakes           ││
│ │  [ACTION] View All Intakes →   │  │  1 role approved         ││
│ │                                │  │  1 payment received      ││
│ │  ┌──────────────────────────┐  │  │                          ││
│ │  │ Type a message...        │  │  │  Last updated: 2 min ago ││
│ │  └──────────────────────────┘  │  └──────────────────────────┘│
│ └────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### `<MaestroChat />`

- Full-height flex column
- Message list with auto-scroll
- Streaming SSE renderer (same pattern as existing intake chat)
- Action chips rendered from `capturedValues`:
  - `intake_id` → "View Intake [id] →" linking to `/admin/intakes/[id]`
  - `request_id` → "View Role Request →" linking to `/admin/roles/[id]`
  - `execution_id` → "View Execution →"

### `<MaestroInput />`

- Single-line textarea (grows to 3 lines max)
- Submit on Enter (Shift+Enter for newline)
- Disabled while streaming
- "Maestro is thinking..." spinner during tool calls

### `<OpsSummaryWidget />`

- Polls `GET /api/v1/admin/ops-summary` every 60 seconds
- Shows reload timestamp
- Sections: Intake Funnel, Revenue (7d), Recent Activity
- Skeleton loading state on initial load
- Error state: "Summary unavailable — click to retry"

---

## localStorage Schema

Key: `maestro_history_{userId}`  
Value: JSON array of `{ role: 'user' | 'assistant', content: string, timestamp: string }[]`  
Max entries: 50 (trim oldest on overflow)  
Cleared on: `localStorage.removeItem()` when user clicks "Clear History"

---

## Route: `GET /api/v1/admin/ops-summary`

**New file:** `src/app/api/v1/admin/ops-summary/route.ts`

Auth-gated (ADMIN/STAFF). Internally calls:
- `get_funnel_stats(7)` data
- `get_revenue_summary(7)` data  
- `get_recent_activity(7)` data

Returns combined JSON for the widget. Not Claude — raw DB queries only.

---

## Navigation

Add "Chat" link to the admin sidebar, icon: `MessageSquare` (Lucide).  
Position: below the existing admin nav sections, above settings.

---

## Mobile

Side-by-side layout collapses on <768px:
- Chat panel takes full width
- Ops summary moves to a collapsible drawer accessed via a button
