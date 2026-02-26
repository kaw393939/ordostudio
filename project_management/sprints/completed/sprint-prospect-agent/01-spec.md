# Sprint Prospect-Agent — Specification

---

## Scope

### In scope

- `src/lib/api/agent-tools.ts` — 3 new tools appended to `AGENT_TOOLS`
- `src/evals/scenarios/prospect.ts` — 3 eval scenarios PA-01 through PA-03
- `feed_events` writers: `NewNewsletterSubscriber`, `NewIntakeFromChat`

### Out of scope

- Email confirmation / double opt-in (not sending email from agent)
- Newsletter platform API calls (Mailchimp, ConvertKit, etc.)
- New DB tables (reuse existing `newsletter_subscribers` and `intake_requests`)

---

## Success Criteria

| Check | Pass condition |
|-------|----------------|
| Tool validation | Each tool rejects invalid args and returns `{ error }` — never throws |
| Idempotent subscribe | Calling `subscribe_to_newsletter` twice with same email returns existing row, not error |
| Intake dedup | `convert_subscriber_to_lead` returns existing intake if one is already open for subscriber |
| Feed events | `writeFeedEvent('NewNewsletterSubscriber')` fires on INSERT, not on duplicate |
| Evals | `npm run evals:prospect` → 3/3 PASS |
| Full eval suite | `npm run evals` → 30/30 PASS (approximate, depends on sequence) |
| Build | `npm run build` clean |
