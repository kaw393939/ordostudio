# Maestro-02: Admin Chat UI — Specification

**Sprint:** `sprint-maestro-02-admin-chat-ui`

---

## Scope

### In scope

- `/admin/chat` page (split-panel layout)
- `<MaestroChat>`, `<MaestroInput>`, `<OpsSummaryWidget>` components
- `useMaestroChat` hook with localStorage persistence
- `useOpsSummary` hook with 60-second polling
- `GET /api/v1/admin/ops-summary` aggregation endpoint (auth-gated)
- Admin sidebar nav update ("Chat" entry)
- Action chips from `capturedValues` SSE events
- Mobile responsive (collapsible summary drawer)

### Out of scope

- Server-side history persistence (Vec-02)
- AI-generated summary (the widget shows raw DB data, not Claude-generated prose)
- Push notifications
- File attachment support in chat

---

## Success Criteria

| Check | Pass condition |
|-------|---------------|
| Page exists | `GET /admin/chat` renders without error for ADMIN session |
| Auth gate | `GET /admin/chat` redirects to `/login` for unauthenticated user |
| SSE works | Sending "Show me the intake queue" streams a response back |
| History persists | Reload `/admin/chat` — previous messages are restored from localStorage |
| Ops summary loads | Widget shows intake funnel and revenue within 3s of page load |
| Summary refreshes | After 60s, widget timestamp updates |
| Action chips | After approving a role request, an action chip "View Role Request →" appears |
| Mobile | Layout is usable on 375px-wide viewport |
| Build | `npm run build` clean |
