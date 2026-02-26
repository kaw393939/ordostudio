# Sprint Maestro-03: Intelligence & KPIs v2 — Sprint Plan

## Prerequisites
- [ ] Vec-01 merged + migration 046 applied
- [ ] Maestro-01 merged + 25 tools registered
- [ ] No uncommitted changes on target branch

## Tasks

### T1 — Create `maestro-intel.ts` (2 h)
- [ ] Add `getContentSearchAnalytics` function + Zod schema
- [ ] Add `getFunnelVelocity` function + Zod schema (with table-not-found guard)
- [ ] Add `getSearchTrend` function + Zod schema
- [ ] Add `getOpsBrief` composition function
- [ ] Add `formatOpsMarkdown` helper
- [ ] Unit test: `getContentSearchAnalytics` with seeded rows returns correct topQuery
- [ ] Unit test: `getFunnelVelocity` with missing table returns `{ stages: [], note }`

### T2 — Register tools in `maestro-tools.ts` (30 min)
- [ ] Import 4 new tools + schemas
- [ ] Append to toolRegistry array
- [ ] Confirm total count = 29 with `console.log` or assertion in test

### T3 — Write eval seed fixture (30 min)
- [ ] Create `src/evals/fixtures/intel-seeds.ts`
- [ ] 15 rows covering: top queries, zero-result queries, multi-day distribution

### T4 — Write eval file (1 h)
- [ ] Create `src/evals/maestro-intel.eval.ts`
- [ ] Implement F1 (search insight), F2 (funnel velocity), F3 (ops brief), F4 (empty graceful)
- [ ] Run evals locally: `npm run evals -- --file maestro-intel`

### T5 — Run full test suite (30 min)
- [ ] `npm test` — expect 1714+ pass, 0 regression
- [ ] Fix any import errors from registration step

### T6 — Build check (15 min)
- [ ] `npm run build` passes with no TypeScript errors

### T7 — Commit
```bash
git add src/lib/agent/tools/maestro-intel.ts \
        src/lib/agent/maestro-tools.ts \
        src/evals/maestro-intel.eval.ts \
        src/evals/fixtures/intel-seeds.ts
git commit -m "feat(agent): add intel tools — search analytics, funnel velocity, ops brief"
```

## Definition of Done
- [ ] 4 tools callable via ops agent chat interface
- [ ] F1, F2, F3, F4 evals all pass
- [ ] `get_ops_brief` returns `markdownSummary` with at least 3 KPI sections
- [ ] F4 (empty DB) does not mention invented query names
- [ ] `npm test` still 1714+/1715
- [ ] Build clean
