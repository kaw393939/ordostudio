# API Domain: Events

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Routes: `src/app/api/v1/events/**/route.ts`
- Event domain + use cases: `src/core/use-cases/*`, `src/lib/api/events.ts`
- Schemas: `src/lib/api/schemas.ts`

---

## Endpoints (high-signal)

### List events

- `GET /api/v1/events`

Query params:

- `status`
- `q`
- `from`, `to`
- `limit`, `offset`

Behavior:

- Returns items with state-driven HAL links via `eventLinksForState()`.
- Adds an `app:reminder-payload` link per event.
- Embeds a computed `reminder_payload` object (derived from event fields).

Caching:

- `private, max-age=30, stale-while-revalidate=60`

### Create event (admin)

- `POST /api/v1/events`
- Schema: `createEventSchema`
- Auth: `ADMIN` or `SUPER_ADMIN`

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `user:write`

### Event detail

- `GET /api/v1/events/{slug}`
- `PATCH /api/v1/events/{slug}`

### Lifecycle

- `POST /api/v1/events/{slug}/publish`
- `POST /api/v1/events/{slug}/cancel` (schema: `cancelEventSchema`)

### Registrations

- `GET /api/v1/events/{slug}/registrations`
- `POST /api/v1/events/{slug}/registrations` (schema: `registrationSchema`)
- `DELETE /api/v1/events/{slug}/registrations/{userId}`
- `POST /api/v1/events/{slug}/registrations/substitutions` (schema: `substitutionSchema`)

### Check-ins

- `POST /api/v1/events/{slug}/checkins` (schema: `checkinSchema`)

### Export

- `GET /api/v1/events/{slug}/export`

### ICS

- `GET /api/v1/events/{slug}/ics`

### Instructor assignment

- `GET /api/v1/events/{slug}/instructor`
- `PATCH /api/v1/events/{slug}/instructor` (schema: `instructorUpdateSchema`)

### Outcomes and artifacts

- `POST /api/v1/events/{slug}/outcomes` (schema: `outcomeSchema`)
- `POST /api/v1/events/{slug}/artifacts` (schema: `artifactSchema`)
- `POST /api/v1/events/{slug}/artifacts/attachments`

### Event image

- `POST /api/v1/events/{slug}/image`
- `DELETE /api/v1/events/{slug}/image`

### Follow-up

- `POST /api/v1/events/{slug}/follow-up/reminders`
- `GET /api/v1/events/{slug}/reminder-payload`

---

## Notes

- The event API uses both shared lib logic (`src/lib/api/events.ts`) and core use-cases (e.g., `create-event`).
- For public UX, actions should be rendered from HAL links, not hard-coded.
