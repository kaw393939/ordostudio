# Sprint Maestro-03: Intelligence & KPIs v2 — Overview

## Status
**NOT STARTED** | Depends on: Vec-01 complete, Maestro-01 complete

## One-Liner
Add 2 analytics tools to the ops agent: search analytics insight and a
single-call `get_ops_brief` that synthesises available KPIs into an executive
summary.

## What Changed Versus Original Spec

| Area | Original | Revised |
|------|----------|---------|
| Tool count | 4 | **2** |
| `get_funnel_velocity` | In scope | **Deferred to M-03b** — needs 200+ transitions per stage to be meaningful |
| `get_search_trend` | In scope | **Deferred to M-03b** — needs sustained search volume to surface trends |
| `get_ops_brief` internal calls | 5 sub-tools | 3 sub-tools (revenue, search, recent activity from M-01) |
| Eval count | 4 | **3** (F1, F3, F4) — F2 deferred with `get_funnel_velocity` |

## Why Velocity and Trend Are Deferred

`get_funnel_velocity` requires enough transitions through each intake stage to
produce a statistically meaningful p50 time estimate. At current intake volume
(sub-50/month), the "average hours in stage" will swing wildly based on 2-3
outliers. The tool produces noise pretending to be signal.

`get_search_trend` requires a user running the same search query at least weekly
to show a meaningful slope. At current search volume, most queries appear 1-3
times total. A "trend" line of 1 point is not a trend.

**Revisit when:** intake volume > 50 confirmed transitions per stage per month,
OR search volume > 300 queries per month.

## The 2 Tools

| Tool | What it does |
|------|--------------|
| `get_content_search_analytics` | Top queries, zero-result queries, volume |
| `get_ops_brief` | Single call: revenue + activity + search → markdown summary |

## Scope Boundaries
| In scope | Out of scope |
|---|---|
| 2 new tools in `maestro-intel.ts` | `get_funnel_velocity` (→ M-03b) |
| 3 evals F1, F3, F4 | `get_search_trend` (→ M-03b) |
| `get_ops_brief` internal composition (3 sub-calls) | New migrations |

## Inputs Required
- Vec-01 complete (migration 046 must be in the DB — `search_analytics` table)
- Maestro-01 complete (`maestro-tools.ts` exists with 10 tools)

## Outputs Produced
- 2 new tools added to `maestro-tools.ts`
- Total tool count: 10 → 12
- 3 new evals: F1, F3, F4

## Estimated Effort
| Role | Hours |
|---|---|
| Backend | 3 h |
| Evals | 1.5 h |
| Total | 4.5 h |

## Risk
**Low.** Pure read path. No migrations. No new DB writes. Worst case: bad SQL
returns empty rows — evals catch it before deploy.
