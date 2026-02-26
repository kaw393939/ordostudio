# Sprint Prospect-Agent — Architecture

---

## File Map

| File | Change |
|------|--------|
| `src/lib/api/agent-tools.ts` | Append 3 new tools to `AGENT_TOOLS` |
| `src/evals/scenarios/prospect.ts` | New eval file |

---

## DB Tables Used (existing, no migrations)

### `newsletter_subscribers`
```sql
-- Assumed existing schema (from earlier migrations)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active',  -- active|unsubscribed
  source      TEXT,                            -- 'chat'|'landing_page'|etc
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  user_id     TEXT REFERENCES users(id)        -- NULL for anonymous
);
```

### `intake_requests`
Already exists. No schema changes.

---

## Tool Auth Pattern

All 3 tools are registered with `requireAuth: false` (PUBLIC callable).

For `convert_subscriber_to_lead`, the agent passes the `session_id` from the current
conversation context. The tool looks up whether the session has a linked `user_id`
(from cookie session backfill).

---

## Feed Events

```typescript
// In subscribe_to_newsletter — only on INSERT (not upsert update):
writeFeedEvent(db, {
  type: 'NewNewsletterSubscriber',
  user_id: null,  // anonymous
  metadata: { email, source: args.source ?? 'chat' },
});

// In convert_subscriber_to_lead:
writeFeedEvent(db, {
  type: 'NewIntakeFromChat',
  user_id: null,
  metadata: { subscriberId: args.subscriberId, intakeId: generatedId },
});
```
