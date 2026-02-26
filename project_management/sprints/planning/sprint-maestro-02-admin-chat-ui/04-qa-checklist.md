# Sprint Maestro-02: Admin Chat UI — QA Checklist

## Pre-flight
- [ ] `npm run build` — clean
- [ ] `npm test -- --reporter=dot` — 1552+ passing (4 new ops-summary tests)

## `/api/v1/admin/ops-summary`
- [ ] GET with no session → 401
- [ ] GET with non-staff session → 403
- [ ] GET with admin session → 200, correct JSON shape
- [ ] `intake_queue` has `new`, `triaged`, `qualified` keys
- [ ] All values are numbers ≥ 0

## `/admin/chat` page
- [ ] Visit without cookie → redirect to `/login`
- [ ] Visit with admin session → page renders, no console errors
- [ ] Left panel shows Ops Summary with at least one non-zero count (seeded DB)
- [ ] Left panel links navigate correctly (click "NEW" → `/admin/intake?status=NEW`)
- [ ] Left panel refreshes without full page reload (verify via Network tab — polling)

## Chat interaction
- [ ] Typing in input and pressing Enter sends message
- [ ] Shift+Enter creates newline without sending
- [ ] Typing indicator appears while awaiting response
- [ ] Assistant response renders markdown (bold text visible)
- [ ] Error state appears on network failure (kill server, send message, verify banner)
- [ ] Retry button re-sends the last message

## History persistence
- [ ] Refresh page → chat history re-loaded from localStorage
- [ ] Hard refresh with cleared localStorage → empty state / welcome message shown

## Admin sidebar
- [ ] "Chat" entry appears in sidebar after Workflows
- [ ] Active state highlights when on `/admin/chat`

## Eval regression
- [ ] `npm run evals:maestro` → 14/14 PASS (Sprint Maestro-01 evals still green)
