# Sprint Maestro-03: Intelligence & KPIs v2 — Spec

## Objective
Extend the ops agent with four intelligence tools that transform raw DB rows
into operator-ready insight. The marquee feature is `get_ops_brief`: a single
tool the agent always calls when the user asks "how are things going?" or any
broad status question.

## Acceptance Criteria

### AC-1  `get_content_search_analytics`
- [ ] Returns top-N queries, their hit-rates, and zero-result queries for the
  last `days` days (default 30)
- [ ] Source: `search_analytics` table (migration 046)
- [ ] Returns `{ topQueries, zeroResultQueries, totalSearches, period }`

### AC-2  `get_funnel_velocity`
- [ ] Returns p50/p95 time-in-stage for each intake status transition
- [ ] Source: `intake_status_history` table — `MIN(changed_at)` per
  `(intake_id, new_status)`
- [ ] Returns `{ stages: [{ from, to, p50_hours, p95_hours, sample_n }] }`

### AC-3  `get_search_trend`
- [ ] Accepts `query: string`, `days?: number` (default 14)
- [ ] Returns daily count of searches matching that query (LIKE)
- [ ] Returns `{ query, days: [{ date, count }], total }`

### AC-4  `get_ops_brief`
- [ ] Calls `get_funnel_stats`, `get_revenue_summary`, `get_contact_summary`,
  `get_content_search_analytics`, and `get_funnel_velocity` internally
- [ ] Returns a single `markdownSummary: string` suitable for direct LLM output
- [ ] Max 250 words; bullet-point format; always numeric
- [ ] `days` param (default 30) passed through to all sub-calls

## New Files
```
src/lib/agent/tools/maestro-intel.ts   ← 4 new tools
src/evals/fixtures/intel-seeds.ts      ← seed data for F1-F4 evals
```

## Modified Files
```
src/lib/agent/maestro-tools.ts         ← import + register 4 new tools
src/app/api/v1/admin/ops-agent/route.ts ← no change (toolset injection handles it)
```

## Non-Goals
- No AI-generated narrative beyond `get_ops_brief` (raw numbers elsewhere)
- No caching layer (DB is synchronous + fast enough at current scale)
- No chart/visualization generation
