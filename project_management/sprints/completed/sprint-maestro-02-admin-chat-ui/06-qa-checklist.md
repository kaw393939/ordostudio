# Maestro-02: Admin Chat UI — QA Checklist

**Sprint:** `sprint-maestro-02-admin-chat-ui`

---

## Gate: All items must be checked before DONE

### Routes & Auth

- [ ] `GET /admin/chat` returns 200 for ADMIN session
- [ ] `GET /admin/chat` redirects to `/login` for unauthenticated session
- [ ] `GET /api/v1/admin/ops-summary` returns 401 without session
- [ ] `GET /api/v1/admin/ops-summary` returns 200 with ADMIN session

### Chat Functionality

- [ ] Sending "Show me the queue" makes a POST to `/api/v1/agent/maestro` and streams a response
- [ ] Response text appears progressively (not all-at-once)
- [ ] Sending multiple messages builds a conversation history
- [ ] After page reload, previous messages are restored from localStorage

### Ops Summary Widget

- [ ] Widget renders intake funnel section with count by status
- [ ] Widget renders revenue section
- [ ] Widget renders recent activity section
- [ ] "Last updated" timestamp shows correctly
- [ ] After 60 seconds, timestamp updates (manual test)
- [ ] Clicking refresh icon manually refetches

### Action Chips

- [ ] After approval of a role request, action chip "View Role Request →" appears
- [ ] Chip link navigates to correct admin page

### Mobile

- [ ] On 375px width: only chat panel is visible (no layout overflow)
- [ ] Ops summary accessible via collapse toggle on mobile

### Build & Tests

- [ ] `npx vitest run` → no new failures
- [ ] `npm run build` clean
- [ ] `npm run evals` → still 35/35 PASS (no regressions)

### Commit

- [ ] Changes committed and pushed to `origin main`
