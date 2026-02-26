# Sprint Event-Management — QA Checklist

## Tool Validation
- [ ] `create_event` with missing title returns `{ error }` — does not throw
- [ ] `create_event` with invalid ISO datetime returns `{ error }`
- [ ] `update_event` with no change fields returns `{ error: 'At least one field required' }`
- [ ] `get_event_attendance` with unknown eventId returns graceful empty (`{ registered: 0 }`)
- [ ] `list_registered_attendees` with unknown eventId returns empty array

## Auth
- [ ] `create_event` called with USER role (not ADMIN/STAFF) returns `{ error: 'FORBIDDEN' }`
- [ ] `update_event` called with USER role returns `{ error: 'FORBIDDEN' }`

## DB Consistency
- [ ] `create_event` inserts row with `status = 'draft'`
- [ ] `update_event` only updates requested fields (partial update)
- [ ] Feed events written on create and update

## Evals
- [ ] `npm run evals:events` → 4/4 PASS
- [ ] `npm run evals` → full suite clean
