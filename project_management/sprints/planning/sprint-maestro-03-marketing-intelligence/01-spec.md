# Sprint Maestro-03: Marketing Intelligence — Specification

**Date:** 2026-02-25  
**Design doc:** `docs/maestro-ops-agent-design.md` §5.5  
**Depends on:** Sprint Maestro-01 ✅, Sprint Maestro-02 ✅

---

## Overview

Closes the last gap in the Maestro agent: marketing intelligence. Today, the agent can manage the pipeline and verify workflows, but it has no data about what prospects are actually asking — what they search for, where they drop off, and what content is resonating.

This sprint adds:
1. **Content search logging** — every call to `content_search` is logged with the query
2. **`get_content_search_log` tool** — top queries the intake agent has been asked in the last N days
3. **`get_funnel_velocity` tool** — median time from NEW → QUALIFIED and QUALIFIED → BOOKED
4. **Enhanced weekly brief** — one-call summary combining activity + funnel + top searches
5. **4 new eval scenarios** filling the remaining intelligence gaps
6. **Full eval coverage gate** — `npm run evals` passes 31/31 before any deploy

---

## Scope

### In scope

- Migration 041: `content_search_log` table (query, created_at, session_id)
- `src/lib/api/content-search.ts` (or wherever `searchContent` is) — log every call
- `get_content_search_log` tool in `maestro-tools.ts`
- `get_funnel_velocity` tool in `maestro-tools.ts`
- `get_ops_brief` tool — combines all intelligence into a single synthesized brief
- 4 new eval scenarios: F1–F4
- `package.json` script: `evals:full` = all 31 scenarios
- CI note in README: which eval scripts are safe to run in CI vs. require API key

### Out of scope

- A/B testing or experiment tracking
- Email campaign analytics
- Search result ranking analytics (click-through on content_search results)

---

## New DB Migration: 041

**Table: `content_search_log`**

```sql
CREATE TABLE IF NOT EXISTS content_search_log (
  id          TEXT PRIMARY KEY,
  query       TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  session_id  TEXT,          -- intake agent session identifier, nullable
  source      TEXT DEFAULT 'intake-agent',  -- 'intake-agent' | 'maestro' | 'eval'
  created_at  TEXT NOT NULL
);
```

No PII — queries are plain text strings like "pricing" or "guild hierarchy". No user_id stored.

---

## New / Updated Tools

### `get_content_search_log(days?, limit?, source?)`

Returns the top N search queries by frequency for the rolling window.

```json
{
  "window_days": 30,
  "top_queries": [
    { "query": "pricing", "count": 14 },
    { "query": "guild hierarchy", "count": 9 },
    { "query": "maestro training requirements", "count": 6 }
  ]
}
```

### `get_funnel_velocity(status_from, status_to, days?)`

Returns median and p75 time (in hours) for intakes to advance between two statuses.

```json
{
  "from_status": "NEW",
  "to_status": "QUALIFIED",
  "window_days": 90,
  "median_hours": 18.5,
  "p75_hours": 42.0,
  "sample_size": 12
}
```

Implementation: uses `intake_status_history` — find pairs of (from_status → to_status) per intake, compute time delta, take median.

### `get_ops_brief(days?)`

One tool that internally calls the equivalents of `get_funnel_stats`, `get_recent_activity`, `get_contact_summary`, and `get_content_search_log`, then returns a combined JSON object for Claude to synthesize into a natural-language brief.

```json
{
  "period_days": 7,
  "funnel": { "new": 4, "triaged": 2, "qualified": 1, "booked": 1 },
  "activity": [
    { "type": "NewIntakeRequest", "count": 4 },
    { "type": "RoleApproved", "count": 1 }
  ],
  "top_searches": [
    { "query": "pricing", "count": 6 },
    { "query": "maestro requirements", "count": 3 }
  ],
  "contacts": { "new": 8, "contacted": 3, "qualified": 2, "active": 5 }
}
```

This is the power tool — one call, full picture.

---

## New Eval Scenarios (4)

### F1 · `maestro-content-search-insight`
- preSetup: seed 10 content_search_log rows (varied queries, last 7 days)
- 1 turn: "What are prospects searching for most this week?"
- Check: `get_content_search_log` called, response mentions top query

### F2 · `maestro-funnel-velocity`
- preSetup: seed 6 intakes with status_history showing transitions over varying time spans
- 1 turn: "How long does it typically take to qualify an intake?"
- Check: `get_funnel_velocity` called, response mentions hours or days

### F3 · `maestro-ops-brief`
- preSetup: seed funnel data + events + searches
- 1 turn: "Give me a full ops brief for this week"
- Check: `get_ops_brief` called (1 tool call, not multiple), response covers funnel + searches

### F4 · `maestro-empty-search-log`
- preSetup: standard seeded DB, no search log entries
- 1 turn: "What are people searching for?"
- Check: `get_content_search_log` called; response says no search data yet (no fabrication)

---

## Search Logging Integration

In `src/lib/api/content.ts` (or wherever `searchContent` is defined):

```typescript
// After running the search query, append a log entry:
db.prepare(`
  INSERT INTO content_search_log (id, query, result_count, session_id, source, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(randomUUID(), query, results.length, sessionId ?? null, source ?? 'intake-agent', new Date().toISOString());
```

The `sessionId` and `source` context comes from an optional parameter added to the `searchContent` function signature.

In `agent-tools.ts`, pass `source: 'intake-agent'` when calling from the intake executor.  
In `maestro-tools.ts`, pass `source: 'maestro'` when called from Maestro agent.  
In eval harness, `source: 'eval'` so logs are filterable.

---

## Success Criteria

- Migration 041 runs cleanly: `npm run cli -- db migrate`
- `content_search` calls log to `content_search_log` table
- `npm run evals:maestro` → 18/18 PASS (14 from Sprint M-01 + 4 new)
- `npm run evals` → 31/31 PASS (27 from previous + 4 new)
- `npm run build` clean
- 1555+ tests pass (4+ new for migration + search logging)
