# Sprint Maestro-03: Intelligence & KPIs v2 — Overview

## Status
**NOT STARTED** | Depends on: Vec-01 complete, Maestro-01 complete

## One-Liner
Add 4 analytics/intelligence tools to the ops agent: search analytics insight,
funnel velocity, trending queries, and a single-call `get_ops_brief` that
synthesises them all into an executive summary.

## Why This Sprint Exists
The original Maestro-03 spec planned a dedicated `content_search_log` table.
That table was superseded by the richer `search_analytics` table introduced in
Vec-01 (migration 046). This sprint is a ground-up rewrite that:

1. Reads from `search_analytics` (already live after Vec-01)
2. Computes funnel velocity from `intake_status_history` time deltas
3. Adds trending-query detection with a rolling window
4. Adds `get_ops_brief` — one tool call that calls the others internally and
   returns a markdown summary paragraph the LLM can quote verbatim

## Scope Boundaries
| In scope | Out of scope |
|---|---|
| 4 new tools in `maestro-tools.ts` | New migrations (none needed) |
| 4 evals F1-F4 | UI changes |
| `get_ops_brief` internal composition | PostHog / external analytics |

## Inputs Required
- Vec-01 complete (migration 046 must be in the DB)
- Maestro-01 complete (`maestro-tools.ts` exists with 25 tools)

## Outputs Produced
- 4 new tools: `get_content_search_analytics`, `get_funnel_velocity`,
  `get_search_trend`, `get_ops_brief`
- Total tool count: 25 → 29
- 4 new evals: F1, F2, F3, F4

## Estimated Effort
| Role | Hours |
|---|---|
| Backend | 4 h |
| Evals | 2 h |
| Total | 6 h |

## Risk
**Low.** Pure read path. No migrations. No new DB writes. Worst case: bad SQL
returns empty rows — evals catch it before deploy.
