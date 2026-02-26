# Sprint Event-Management — Specification

---

## Scope

### In scope

- `src/lib/api/maestro-tools.ts` — 4 new tools appended
- `src/evals/scenarios/events.ts` — 4 eval scenarios

### Out of scope
- New DB migrations (existing `events` and `event_registrations` tables)
- Public-facing event registration (no changes to `create_booking`)

---

## Success Criteria

| Check | Pass condition |
|-------|----------------|
| Route auth | `create_event` called by USER role → `{ error: 'FORBIDDEN' }` |
| Tool validation | Each tool rejects invalid args and returns `{ error }` — never throws |
| Create idempotency | Duplicate title+date combination warns but doesn't error |
| Evals | `npm run evals:events` → 4/4 PASS |
| Build | `npm run build` clean |
