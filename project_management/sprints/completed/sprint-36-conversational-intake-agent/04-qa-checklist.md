# Sprint 36: Conversational Intake Agent — QA Checklist

## Database
- [ ] Migration 037 applied to `data/app.db`
- [ ] `intake_conversations` table exists
- [ ] `maestro_availability` table exists
- [ ] `bookings` table exists

## Agent API
- [ ] `POST /api/v1/agent/chat` with valid body returns 200 SSE stream
- [ ] `POST /api/v1/agent/chat` without `session_id` returns 400
- [ ] Agent response references RAG content when asked about commission rates
- [ ] Agent surfaces phone number from `site_settings` when it cannot answer
- [ ] Transcript saved to `intake_conversations` after `submit_intake` tool call

## Booking API  
- [ ] `GET /api/v1/maestro/availability` returns empty array when no slots (200, not error)
- [ ] `POST /api/v1/bookings` creates booking and marks slot BOOKED
- [ ] `POST /api/v1/bookings` returns 409 for already-BOOKED slot

## UI
- [ ] Chat widget renders on `/apply`
- [ ] Floating button visible on homepage
- [ ] Widget opens/closes correctly
- [ ] Mobile overlay renders full-screen

## Tests
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` exits 0
