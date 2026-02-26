# Sprint Maestro-03: Intelligence & KPIs v2 — QA Checklist

## Pre-Deploy
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TypeScript errors
- [ ] 4 new evals pass: F1, F2, F3, F4
- [ ] Tool count in `maestro-tools.ts` = 29 (grep or assertion)

## Tool Behaviour
- [ ] `get_content_search_analytics` with seeded rows returns:
  - `topQueries[0].query === "pricing"` (most frequent)
  - `zeroResultQueries` includes "unknown-xyz-abc" (3 zero hits)
  - `totalSearches >= 14`
- [ ] `get_content_search_analytics` with empty table returns:
  - `totalSearches === 0`
  - `topQueries.length === 0`
  - Does not throw
- [ ] `get_funnel_velocity` with seeded `intake_status_history` returns:
  - `stages.length > 0`
  - `stages[0].p50Hours` is a number
- [ ] `get_funnel_velocity` when table missing returns:
  - `stages === []`
  - `note` field present
  - Does not throw
- [ ] `get_search_trend({ query: "events", days: 30 })`:
  - `days.length === 3` (3 seeded event searches in window)
  - `total === 3`
- [ ] `get_ops_brief({ days: 30 })`:
  - Returns `markdownSummary` (non-empty string)
  - Contains "Ops Brief"
  - Contains at least one numeric value

## Eval Gate
| Eval | Expected | Pass? |
|------|----------|-------|
| F1 search-insight-query | calls `get_content_search_analytics`, mentions "pricing" | |
| F2 funnel-velocity | calls `get_funnel_velocity`, mentions hours or graceful note | |
| F3 ops-brief-single-call | calls `get_ops_brief`, 3+ KPI sections | |
| F4 empty-search-log | 0 invented queries, mentions "no searches" | |

## Regression Checks
- [ ] Existing Maestro-01 tool evals (A1–E2) still pass
- [ ] Admin chat UI (`/admin/chat`) loads without 500 errors
- [ ] No circular import: `maestro-tools.ts` → `maestro-intel.ts` → (no re-import of maestro-tools)

## Accept / Reject
| Check | Result |
|---|---|
| All 4 evals pass | |
| `get_ops_brief` output ≥ 150 words | |
| F4 zero hallucination confirmed | |
| Build clean | |
| Test suite no regression | |
