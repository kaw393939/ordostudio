# Sprint 36: Conversational Intake Agent — Sprint Plan

## Tasks

### T1: Migration 037 — Three New Tables
- **File:** `src/cli/db.ts`
- Add migration `037_intake_agent_tables` with `intake_conversations`, `maestro_availability`, and `bookings` table DDL (see `docs/agent_planning/02-conversational-agent.md` for full schema).
- Run `APPCTL_DB_FILE=./data/app.db npm run cli -- db migrate`

---

### T2: Content Search + Settings — Agent Tool Library
- **File:** `src/lib/api/agent-tools.ts`
- Exports tool definitions callable by the agent:
  - `content_search(query)` — calls `searchContent()`
  - `get_site_setting(key)` — reads from `site_settings`
  - `submit_intake(form_data)` — calls existing intake POST logic
  - `get_available_slots(limit)` — queries `maestro_availability` WHERE status='OPEN'
  - `create_booking(slot_id, email)` — inserts into `bookings`, marks slot BOOKED

---

### T3: Streaming Chat Endpoint
- **File:** `src/app/api/v1/agent/chat/route.ts`
- `POST` — no auth required. SSE (`text/event-stream`).
- Body: `{ session_id: string, message: string, conversation_id?: string }`
- Flow: load/create conversation record → call AI with tool definitions → stream tokens → on tool call: execute tool → stream result → on done: save updated transcript
- Scripted opening message when `conversation_id` is null (not AI-generated)
- Rate limit: 20 messages per session (check `intake_conversations.messages` length)

---

### T4: Maestro Availability + Bookings API
- **File 1:** `src/app/api/v1/maestro/availability/route.ts` — `GET`, public, returns OPEN slots in next 30 days
- **File 2:** `src/app/api/v1/bookings/route.ts` — `POST`, body: `{ slot_id, email, intake_request_id? }`. Validates slot is OPEN, creates booking, marks slot BOOKED. Returns 409 if already BOOKED.

---

### T5: Chat Widget Component
- **File:** `src/components/chat/intake-chat-widget.tsx`
- Props: `mode: 'floating' | 'page'`
- State: open/closed (floating), conversation history, loading
- Calls `POST /api/v1/agent/chat` as SSE, renders streaming tokens
- Persists `session_id` and `conversation_id` in localStorage

---

### T6: Rewrite `/apply` Page
- **File:** `src/app/(public)/apply/page.tsx`
- Top section: "Talk to us first" + `<IntakeChatWidget mode="page" />`
- Below fold: "Prefer a form?" + existing intake form component
- Add floating `<IntakeChatWidget mode="floating" />` to homepage layout

---

### T7: Write Tests
- **File:** `src/app/__tests__/e2e-intake-agent.test.ts`
- 10 tests per spec

---

### T8: QA
- Run full vitest suite, verify count, run build
