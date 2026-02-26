# Sprint Maestro-03: Intelligence & KPIs v2 — Tool Specs

All tools live in `src/lib/agent/tools/maestro-intel.ts` and are registered
in `src/lib/agent/maestro-tools.ts`.

**Tools in this sprint: 2**
**Deferred to M-03b:** `get_funnel_velocity`, `get_search_trend`

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

### SQL
Two queries: top-queries aggregation + zero-result filter.
See `02-architecture.md` for full SQL.

### Error Handling
- Empty `search_analytics` → return `{ totalSearches: 0, topQueries: [], zeroResultQueries: [] }`
- Never throw; return typed empty object.

---

## Tool 2: `get_ops_brief`

### Description
Composites 3 KPI reads into a single markdown summary paragraph. This is the
primary "how are things going?" entry point for the ops agent. Always returns
`markdownSummary` — the agent should quote it directly without paraphrasing.

> Note: In the original spec this internally called 5 sub-tools including
> `get_funnel_velocity`. That sub-call is removed because velocity is deferred.
> M-03b will restore it once intake volume justifies the metric.

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
  markdownSummary: string;  // 100-200 words, bullet format
  generatedAt:     string;  // ISO datetime
  period:          string;  // "last 30 days"
};
```

### Internal Calls (sequential — no funnel velocity yet)
1. `getRevenueSummary(db, { days })`
2. `getRecentActivity(db, { days })`
3. `getContentSearchAnalytics(db, { days, limit: 5 })`

### Error Handling
- Each sub-call is wrapped in try/catch; failures gracefully omit that section
  (e.g. `**Search**: data unavailable`)
- Never propagate sub-tool errors to the caller

---

## Registration in `maestro-tools.ts`

```typescript
import {
  getContentSearchAnalytics,
  getOpsBrief,
} from "./tools/maestro-intel";

// Append to existing MAESTRO_TOOLS array:
{ name: "get_content_search_analytics", fn: getContentSearchAnalytics, schema: GetContentSearchAnalyticsInput },
{ name: "get_ops_brief",               fn: getOpsBrief,                schema: GetOpsBriefInput },
```

Total tools after this sprint: **12**

---

## Deferred: Tools to implement in M-03b

| Tool | Why deferred |
|------|--------------|
| `get_funnel_velocity` | Needs 200+ transitions/stage/month to be meaningful |
| `get_search_trend` | Needs sustained query volume to show real slopes |
