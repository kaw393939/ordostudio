# Sprint Event-Management — Architecture

---

## File Map

| File | Change |
|------|--------|
| `src/lib/api/maestro-tools.ts` | Append 4 tools to `MAESTRO_TOOLS` array |
| `src/evals/scenarios/events.ts` | New eval file |

---

## DB Tables Used (existing)

### `events`
```sql
-- Assumed existing schema
CREATE TABLE IF NOT EXISTS events (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  start_at     DATETIME NOT NULL,
  end_at       DATETIME,
  capacity     INTEGER NOT NULL DEFAULT 20,
  status       TEXT NOT NULL DEFAULT 'draft',  -- draft|published|cancelled
  created_by   TEXT REFERENCES users(id),
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);
```

### `event_registrations`
```sql
CREATE TABLE IF NOT EXISTS event_registrations (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'registered',  -- registered|cancelled
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);
```

---

## Auth Check Pattern

```typescript
// At top of each write tool:
if (!['ADMIN','STAFF','SUPER_ADMIN'].includes(callerRole)) {
  return { error: 'FORBIDDEN' };
}
```

---

## Feed Events

```typescript
writeFeedEvent(db, { type: 'EventCreated', metadata: { eventId, title } });
writeFeedEvent(db, { type: 'EventUpdated', metadata: { eventId, changes: Object.keys(args.changes) } });
```
