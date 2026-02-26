# Sprint Maestro-03: Marketing Intelligence — Sprint Plan

---

## T1: Migration 041 — Content Search Log

**File:** `src/cli/db.ts`

Add migration `041_content_search_log`:

```sql
CREATE TABLE IF NOT EXISTS content_search_log (
  id           TEXT PRIMARY KEY,
  query        TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  session_id   TEXT,
  source       TEXT NOT NULL DEFAULT 'intake-agent',
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_search_log_created_at
  ON content_search_log(created_at);
CREATE INDEX IF NOT EXISTS idx_content_search_log_source
  ON content_search_log(source);
```

Run: `APPCTL_DB_FILE=./data/app.db npm run cli -- db migrate`

---

## T2: Update `searchContent` to Log Queries

**File:** find via `grep -r "searchContent" src/lib` — likely `src/lib/api/content.ts`

1. Add optional params to `searchContent(query, limit, options?: { sessionId?: string; source?: string })`.
2. After returning results, write to `content_search_log`. Wrapped in try/catch — never throw.
3. Default `source` to `'intake-agent'`.

**Update call sites:**
- `agent-tools.ts` → pass `{ source: 'intake-agent' }`
- `maestro-tools.ts` (when `content_search` is called from Maestro context) → pass `{ source: 'maestro' }`
- Eval harness `runner.ts` → pass `{ source: 'eval' }`

---

## T3: Add 3 New Tools to `maestro-tools.ts`

### `get_content_search_log`

```typescript
case "get_content_search_log": {
  const days = Number(args.days ?? 30);
  const limit = Math.min(Number(args.limit ?? 20), 50);
  const source = args.source ? String(args.source) : null;
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  
  const rows = db.prepare(`
    SELECT query, COUNT(*) AS count
    FROM content_search_log
    WHERE created_at >= ?
      ${source ? "AND source = ?" : ""}
    GROUP BY query
    ORDER BY count DESC
    LIMIT ?
  `).all(...[cutoff, ...(source ? [source] : []), limit]);
  
  return { window_days: days, top_queries: rows };
}
```

### `get_funnel_velocity`

Uses `intake_status_history` — find pairs of `(from_status, to_status)` per intake, compute `julianday(to_ts) - julianday(from_ts)` in hours, take median:

```sql
SELECT
  (julianday(h2.changed_at) - julianday(h1.changed_at)) * 24 AS hours
FROM intake_status_history h1
JOIN intake_status_history h2
  ON h1.intake_request_id = h2.intake_request_id
  AND h1.to_status = ? AND h2.to_status = ?
  AND h2.changed_at > h1.changed_at
WHERE h1.changed_at >= ?
ORDER BY hours
```

Compute median in TypeScript from the sorted array.

### `get_ops_brief`

Single tool that runs all sub-queries internally and returns the combined shape. Does NOT call other tools recursively — direct DB queries only.

---

## T4: Update `MAESTRO_TOOL_DEFINITIONS` in `maestro-tools.ts`

Add definitions for:
- `get_content_search_log` (days?, limit?, source?)
- `get_funnel_velocity` (status_from, status_to, days?)
- `get_ops_brief` (days?)

---

## T5: Write Tests (4 tests)

**File:** `src/lib/api/__tests__/content-search-log.test.ts`

1. `searchContent` call writes a row to `content_search_log`
2. `source` field is correctly set when passed
3. `get_content_search_log` returns correct counts for seeded data
4. `get_funnel_velocity` returns correct median for seeded status_history

---

## T6: Create `src/evals/scenarios/maestro-intelligence.ts` — 4 Scenarios

Import and merge into `maestroScenarios` array (or create a separate file and combine in `run.ts`).

Scenarios F1–F4 as specified in `01-spec.md`.

**preSetup helpers (new):**
```typescript
function seedSearchLog(db, queries: Array<{ query: string; count: number; daysAgo: number }>)
function seedStatusTransitions(db, intakeId, transitions: Array<[from: string, to: string, hoursApart: number]>)
```

---

## T7: Update `run.ts` and `package.json`

**`run.ts`:** Import both `maestroScenarios` files and merge.  
**`package.json`:** Add:
```json
"evals:full": "node --import tsx ./src/evals/run.ts"
```

Note: `evals:full` is equivalent to `evals` — add a comment in package.json explaining CI usage:
```json
"evals:ci": "node --import tsx ./src/evals/run.ts -- --type workflow"
```
(CI runs only workflow evals — no API cost. Full evals run manually before release.)

---

## T8: Update README.md — Eval Usage Section

Add a section: **Running Evals**

```markdown
## Running Evals

| Command | Cost | When to run |
|---------|------|-------------|
| `npm run evals:workflow` | Free (no LLM) | CI on every PR |
| `npm run evals:triage` | ~$0.01 | Before releases |
| `npm run evals:intake` | ~$0.05 | Before releases |
| `npm run evals:maestro` | ~$0.05 | Before releases |
| `npm run evals` | ~$0.11 | Before major releases |

Requires `ANTHROPIC_API_KEY` in `.env.local` for all except `evals:workflow`.
```

---

## T9: QA

See `04-qa-checklist.md`
