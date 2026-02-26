# Sprint Maestro-03: Intelligence & KPIs v2 — Architecture

## Data Flow

```
Admin asks "ops brief"
         │
         ▼
    Maestro agent
         │
         ▼
  get_ops_brief(days=30)
         │
    ┌────┴─────────────────────────────┐
    │  Internal parallel calls:        │
    │  1. get_funnel_stats             │
    │  2. get_revenue_summary          │
    │  3. get_contact_summary          │
    │  4. get_content_search_analytics │
    │  5. get_funnel_velocity          │
    └────┬─────────────────────────────┘
         │ results[]
         ▼
   formatOpsMarkdown()
         │
         ▼
  { markdownSummary: "## Ops Brief\n..." }
         │
         ▼
    LLM quotes it in response
```

## `search_analytics` Table (from Vec-01 migration 046)

```sql
CREATE TABLE search_analytics (
  id          TEXT PRIMARY KEY,
  query       TEXT NOT NULL,
  user_id     TEXT REFERENCES users(id),
  results_n   INTEGER NOT NULL DEFAULT 0,
  corpus      TEXT NOT NULL DEFAULT 'content',
  took_ms     INTEGER,
  searched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sa_searched_at ON search_analytics(searched_at);
CREATE INDEX idx_sa_corpus ON search_analytics(corpus);
```

## `intake_status_history` Table (assumed present from existing migrations)

```sql
-- Expected columns (verify in 040–043 migrations):
-- id, intake_id, old_status, new_status, changed_at, changed_by
```

> **Note**: If `intake_status_history` does not exist the funnel_velocity tool
> returns `{ stages: [], note: "status_history not available" }` without error.

## `get_content_search_analytics` SQL

```sql
-- Top queries (last N days)
SELECT
  query,
  COUNT(*) AS total,
  AVG(results_n) AS avg_results,
  SUM(CASE WHEN results_n = 0 THEN 1 ELSE 0 END) AS zero_hits
FROM search_analytics
WHERE searched_at >= datetime('now', '-' || :days || ' days')
GROUP BY query
ORDER BY total DESC
LIMIT :limit;

-- Zero-result queries
SELECT query, COUNT(*) AS occurrences
FROM search_analytics
WHERE results_n = 0
  AND searched_at >= datetime('now', '-' || :days || ' days')
GROUP BY query
ORDER BY occurrences DESC
LIMIT 10;
```

## `get_funnel_velocity` SQL

```sql
WITH first_reach AS (
  SELECT intake_id, new_status,
         MIN(changed_at) AS reached_at
  FROM intake_status_history
  WHERE changed_at >= datetime('now', '-' || :days || ' days')
  GROUP BY intake_id, new_status
),
transitions AS (
  SELECT
    a.new_status  AS from_status,
    b.new_status  AS to_status,
    (julianday(b.reached_at) - julianday(a.reached_at)) * 24 AS hours_delta
  FROM first_reach a
  JOIN first_reach b ON a.intake_id = b.intake_id
  WHERE b.reached_at > a.reached_at
)
SELECT
  from_status, to_status,
  COUNT(*)                        AS sample_n,
  ROUND(AVG(hours_delta), 1)      AS avg_hours,
  -- SQLite has no percentile; use approximate median
  ROUND(AVG(hours_delta), 1)      AS p50_hours
FROM transitions
GROUP BY from_status, to_status
ORDER BY from_status;
```

> For true p95: load via NTILE workaround or compute in JS after fetch.

## `get_ops_brief` Internal Composition Pattern

```typescript
async function getOpsBrief(db: Database, { days = 30 }) {
  const [funnel, revenue, contacts, searchStats, velocity] =
    await Promise.all([
      getFunnelStats(db, { days }),
      getRevenueSummary(db, { days }),
      getContactSummary(db, { days }),
      getContentSearchAnalytics(db, { days, limit: 5 }),
      getFunnelVelocity(db, { days }),
    ]);

  return { markdownSummary: formatOpsMarkdown({ funnel, revenue, contacts, searchStats, velocity, days }) };
}

function formatOpsMarkdown({ funnel, revenue, contacts, searchStats, velocity, days }) {
  return `## Ops Brief (last ${days} days)\n\n` +
    `**Funnel**: ${funnel.newIntakes} new leads, ` +
    `${funnel.qualifiedRate}% qualified\n` +
    `**Revenue**: $${revenue.collected} collected, ` +
    `${revenue.pendingCount} invoices pending\n` +
    `**Contacts**: ${contacts.totalActive} active, ` +
    `${contacts.newsletterSubscribers} on newsletter\n` +
    `**Search**: ${searchStats.totalSearches} searches, ` +
    `top query: "${searchStats.topQueries[0]?.query ?? 'none'}"\n` +
    `**Velocity**: avg lead→qualified ${velocity.stages[0]?.avg_hours ?? '?'}h`;
}
```

## File Map

```
src/lib/agent/tools/
  maestro-intel.ts       ← NEW: 4 tool implementations
src/lib/agent/
  maestro-tools.ts       ← MODIFIED: register 4 tools
src/evals/fixtures/
  intel-seeds.ts         ← NEW: DB seed rows for F1-F4
src/evals/
  maestro-intel.eval.ts  ← NEW: 4 eval scenarios
```
