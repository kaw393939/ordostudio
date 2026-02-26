# Sprint Maestro-03: Intelligence & KPIs v2 — Tool Specs

All tools live in `src/lib/agent/tools/maestro-intel.ts` and are registered in
`src/lib/agent/maestro-tools.ts`.

---

## Tool 1: `get_content_search_analytics`

### Description
Returns aggregated search behaviour from the `search_analytics` table: top
queries, zero-result queries, and total volume for a rolling window.

### Zod Input Schema
```typescript
const GetContentSearchAnalyticsInput = z.object({
  days:  z.number().int().positive().default(30)
          .describe("Rolling window in days"),
  limit: z.number().int().min(1).max(50).default(10)
          .describe("Max number of top queries to return"),
});
```

### Output Shape
```typescript
type GetContentSearchAnalyticsOutput = {
  period:           string;          // "last 30 days"
  totalSearches:    number;
  topQueries: {
    query:         string;
    total:         number;
    avgResults:    number;
    zeroHitCount:  number;
  }[];
  zeroResultQueries: {
    query:       string;
    occurrences: number;
  }[];
};
```

### SQL (see 02-architecture.md for full queries)
Two queries: top-queries aggregation + zero-result filter.

### Error Handling
- Empty `search_analytics` → return `{ totalSearches: 0, topQueries: [], zeroResultQueries: [] }`
- Never throw; return typed empty object.

---

## Tool 2: `get_funnel_velocity`

### Description
Computes average (approximate p50) time in hours for each status transition in
the intake funnel, giving operators a sense of where leads are stalling.

### Zod Input Schema
```typescript
const GetFunnelVelocityInput = z.object({
  days: z.number().int().positive().default(30)
         .describe("Window to look back for transitions"),
});
```

### Output Shape
```typescript
type GetFunnelVelocityOutput = {
  period:  string;
  stages: {
    fromStatus: string;
    toStatus:   string;
    p50Hours:   number;
    sampleN:    number;
  }[];
  note?: string;  // present if intake_status_history missing
};
```

### Error Handling
- If `intake_status_history` table does not exist (SQLITE_ERROR), catch and
  return `{ stages: [], note: "status_history not available" }`.

---

## Tool 3: `get_search_trend`

### Description
Returns a per-day count of searches matching a specific query string (LIKE),
useful for tracking whether a particular topic is gaining or losing interest.

### Zod Input Schema
```typescript
const GetSearchTrendInput = z.object({
  query: z.string().min(1).max(200)
          .describe("Query string to filter — uses LIKE %query%"),
  days:  z.number().int().positive().default(14)
          .describe("Rolling window in days"),
});
```

### Output Shape
```typescript
type GetSearchTrendOutput = {
  query:    string;
  period:   string;
  total:    number;
  days: {
    date:  string;  // YYYY-MM-DD
    count: number;
  }[];
};
```

### SQL
```sql
SELECT
  date(searched_at) AS day,
  COUNT(*)          AS cnt
FROM search_analytics
WHERE query LIKE '%' || :query || '%'
  AND searched_at >= datetime('now', '-' || :days || ' days')
GROUP BY day
ORDER BY day;
```

---

## Tool 4: `get_ops_brief`

### Description
Composites five KPI tools into a single markdown summary paragraph. This is the
primary "how are things going?" entry point for the ops agent. Always returns
`markdownSummary` — the agent should quote it directly without paraphrasing.

### Zod Input Schema
```typescript
const GetOpsBriefInput = z.object({
  days: z.number().int().positive().default(30)
         .describe("Rolling window passed to all sub-tools"),
});
```

### Output Shape
```typescript
type GetOpsBriefOutput = {
  markdownSummary: string;  // 150-250 words, bullet format
  generatedAt:     string;  // ISO datetime
  period:          string;  // "last 30 days"
};
```

### Internal Calls (in parallel via Promise.all)
1. `getFunnelStats(db, { days })`
2. `getRevenueSummary(db, { days })`
3. `getContactSummary(db, { days })`
4. `getContentSearchAnalytics(db, { days, limit: 5 })`
5. `getFunnelVelocity(db, { days })`

### Template (from 02-architecture.md `formatOpsMarkdown`)
See [02-architecture.md](02-architecture.md) for the exact output template.

### Error Handling
- Each sub-call is wrapped in try/catch; failures gracefully omit that section
  (e.g. `**Search**: data unavailable`)
- Never propagate sub-tool errors to the caller

---

## Registration in `maestro-tools.ts`

```typescript
import {
  getContentSearchAnalytics,
  getFunnelVelocity,
  getSearchTrend,
  getOpsBrief,
} from "./tools/maestro-intel";

// Append to existing toolRegistry array:
{ name: "get_content_search_analytics", fn: getContentSearchAnalytics, schema: GetContentSearchAnalyticsInput },
{ name: "get_funnel_velocity",          fn: getFunnelVelocity,          schema: GetFunnelVelocityInput },
{ name: "get_search_trend",             fn: getSearchTrend,             schema: GetSearchTrendInput },
{ name: "get_ops_brief",               fn: getOpsBrief,                schema: GetOpsBriefInput },
```

Total tools after this sprint: **29**
