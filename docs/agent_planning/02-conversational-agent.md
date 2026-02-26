# Sprint 36 — Conversational Intake Agent

**Status:** Planning · **Date:** 2026-02-25
**Prerequisite:** Sprint 35 — `site_settings` table and `/content/` RAG corpus must exist
**Delivers to:** Sprint 37 (CRM receives contacts who came through actor conversations)

---

## What This Sprint Is

The intake agent is a server-side AI that:
1. Holds a streaming conversation with a prospective client
2. Draws answers from the `/content/` RAG corpus and `site_settings`
3. Qualifies the prospect through natural dialogue
4. Submits an `intake_requests` record when it has enough signal
5. Attaches the full conversation transcript to that record
6. Offers to book a Maestro consultation slot

The customer experience is a chat widget — floating bottom-right on the homepage and full-page on `/apply`. The widget is the "shopkeeper." It is not a help desk. It is not a support tool. It is a qualification conversation.

---

## What's Broken / Missing Now

| Issue | Impact |
|-------|--------|
| `/apply` is currently a static form | No qualification, no warmth, no relationship initiation |
| No streaming AI endpoint exists | Agent cannot respond in real time |
| `intake_requests` has no linked transcript | Staff has zero context when reviewing an intake |
| No `maestro_availability` table | Cannot offer or book consultation slots |
| Chat state is ephemeral (client-only) | Conversation lost on page reload |

---

## Data Model

### `intake_conversations` (new — migration 037)

```sql
CREATE TABLE intake_conversations (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,          -- anonymous browser session token
  intake_request_id TEXT,                  -- NULL until agent submits the form
  messages         TEXT NOT NULL,          -- JSON: [{role, content, created_at}]
  status           TEXT NOT NULL CHECK(status IN ('ACTIVE','COMPLETED','ABANDONED'))
                   DEFAULT 'ACTIVE',
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id)
);
```

### `maestro_availability` (new — migration 037)

```sql
CREATE TABLE maestro_availability (
  id               TEXT PRIMARY KEY,
  maestro_user_id  TEXT NOT NULL,
  start_at         TEXT NOT NULL,          -- ISO8601 UTC
  end_at           TEXT NOT NULL,
  status           TEXT NOT NULL CHECK(status IN ('OPEN','BOOKED','BLOCKED'))
                   DEFAULT 'OPEN',
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (maestro_user_id) REFERENCES users(id)
);
```

### `bookings` (new — migration 037)

```sql
CREATE TABLE bookings (
  id                      TEXT PRIMARY KEY,
  intake_request_id       TEXT NOT NULL,
  maestro_availability_id TEXT NOT NULL,
  prospect_email          TEXT NOT NULL,
  status                  TEXT NOT NULL CHECK(status IN ('PENDING','CONFIRMED','CANCELLED'))
                          DEFAULT 'PENDING',
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (intake_request_id)       REFERENCES intake_requests(id),
  FOREIGN KEY (maestro_availability_id) REFERENCES maestro_availability(id)
);
```

---

## Agent Behavior Contract

### Persona
- Name: not named. Introduces itself as "Studio Ordo" (the brand, not a persona).
- Tone: direct, warm, specific. One question per message. No filler.
- Does NOT greet with "How can I help you today?" — states a purpose instead.

### Opening message (scripted — not AI-generated)
> "We're a small training and commissions studio. I'm here to figure out if we're the right fit for what you're trying to do. What brings you here?"

### Qualification signals (agent must surface all of these before submitting intake)
1. Goal — what are they trying to accomplish?
2. Role / context — are they a buyer, a learner, or a builder?
3. Timeline — is this immediate, near-term, or exploratory?
4. Fit signal — does the studio's model match their situation?

### Tool calls the agent can make (via MCP)
| Tool | When Used |
|------|-----------|
| `content_search(query)` | To answer factual questions about the studio |
| `get_site_setting(key)` | To retrieve phone number, email, booking URL |
| `submit_intake(form_data)` | When qualification is complete |
| `get_available_slots(limit)` | To offer consultation booking |
| `create_booking(slot_id, email)` | When prospect accepts a slot |

### Failure mode protocol
If the agent cannot answer a question from the RAG corpus:
> "I don't have that detail here. The best next step is a quick call — [phone]. Or I can book you directly with a Maestro."

The agent never fabricates. Uncertain → surface the phone number.

### Session limits
- Max 20 turns per session
- At turn 20 if intake not submitted: auto-submit with partial data + flag `agent_incomplete = true`
- Rate limit: 100 sessions per IP per day

---

## API Routes

### `POST /api/v1/agent/chat` (streaming, Server-Sent Events)

**Request:**
```json
{
  "session_id": "uuid",
  "message": "I run a dev team and I'm trying to figure out what to do about AI",
  "conversation_id": "uuid-or-null"
}
```

**Response:** `text/event-stream`
```
data: {"delta": "That's exactly"}
data: {"delta": " the right question to be asking."}
data: {"tool_call": {"name": "content_search", "args": {"query": "AI training for dev teams"}}}
data: {"tool_result": {"name": "content_search", "result": [...]}}
data: {"delta": " Here's what we've found..."}
data: {"done": true, "conversation_id": "uuid"}
```

**Auth:** Not required. Session tracked by `session_id` (browser-generated UUID, stored in localStorage).

### `GET /api/v1/agent/conversation/:id`

Returns the full conversation (staff-only after intake is submitted, or session-owner).

### `GET /api/v1/maestro/availability`

Returns `OPEN` slots in the next 30 days. Public endpoint. Used by agent and by booking page.

### `POST /api/v1/bookings`

Creates a booking and marks the slot as `BOOKED`. Validates slot is still `OPEN`.

---

## UI

### Chat widget — `/apply` (full page) + floating button on homepage

**States:**
1. **Closed** — floating button (bottom-right) with label "Talk to us →"
2. **Open** — 380px-wide panel, conversation history, input field, send button
3. **Submitted** — confirmation state: "We have your intake. Expect a message within 1 business day."

**Mobile:** Full-screen overlay when open.

**Rules:**
- No auto-open on page load — user initiates
- Typing indicator (animated dots) while agent is streaming
- Scroll to latest message on each new message
- Input disabled while agent is streaming

### `/apply` page rewrite

`/apply` becomes two sections:
1. Top: "Talk to us first" — opens chat widget
2. Below fold: "Prefer a form?" — existing static intake form as fallback fallback

---

## Test Plan

| # | Test | Type |
|---|------|------|
| T1 | `intake_conversations` migration creates table with correct columns | unit |
| T2 | `maestro_availability` migration creates table with correct columns | unit |
| T3 | `bookings` migration creates table with correct columns | unit |
| T4 | `POST /api/v1/agent/chat` returns 400 for missing `session_id` | unit |
| T5 | Agent response includes tool call when question matches RAG corpus | unit |
| T6 | `submit_intake` tool call creates `intake_requests` record | unit |
| T7 | Conversation transcript saved to `intake_conversations` | unit |
| T8 | `GET /api/v1/maestro/availability` returns only OPEN slots | unit |
| T9 | `POST /api/v1/bookings` marks slot as BOOKED | unit |
| T10 | Booking a slot that is already BOOKED returns 409 | unit |

---

## Definition of Done

- [ ] Migration 037 applied — all 3 new tables present
- [ ] `POST /api/v1/agent/chat` streams responses
- [ ] Agent uses RAG corpus to answer factual questions
- [ ] Agent surfaces phone number from `site_settings` when it cannot answer
- [ ] Intake submission via agent creates `intake_requests` + `intake_conversations` records
- [ ] Chat widget present on `/apply` and homepage
- [ ] Booking flow functional end-to-end in test environment
- [ ] All 10 tests pass
- [ ] `npm run build` clean
