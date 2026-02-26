# Sprint 36: Conversational Intake Agent — Specification

## Overview
The intake intake agent is a streaming AI that qualifies prospects through natural conversation, then submits the intake form and offers booking. It runs on `/apply` (full-page) and as a floating widget on the homepage.

## Scope

### In scope
- Migration 037: `intake_conversations`, `maestro_availability`, `bookings` tables
- `POST /api/v1/agent/chat` — streaming SSE endpoint with tool-calling
- RAG integration — agent calls `searchContent()` from Sprint 35
- `site_settings` integration — agent calls phone/email from Sprint 35 settings
- Chat widget React component (floating + full-page modes)
- `/apply` page rewrite — chat-first, static form as fallback below fold
- `GET /api/v1/maestro/availability` — public open slots
- `POST /api/v1/bookings` — creates booking, marks slot BOOKED

### Out of scope
- CRM contact creation (Sprint 37)
- Maestro availability management UI (Sprint 37+)
- Real AI model integration (stub/mock response is acceptable for test env)

## Success Criteria
- All 3 new tables present after migration
- `POST /api/v1/agent/chat` returns SSE stream
- Transcript saved to `intake_conversations` on intake submit
- Chat widget renders on `/apply` and homepage
- 10 tests pass, build clean
