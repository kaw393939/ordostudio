# Sprint Maestro-03: Marketing Intelligence — QA Checklist

## Pre-flight
- [ ] `npm run build` — clean
- [ ] `npm test -- --reporter=dot` — 1555+ passing (4 new tests)

## Migration
- [ ] `npm run cli -- db migrate` on local DB — reports "041_content_search_log applied"
- [ ] `content_search_log` table exists with expected columns
- [ ] Indexes created on `created_at` and `source`

## Search logging
- [ ] Trigger an intake agent eval: `npm run evals:intake`
- [ ] Check `content_search_log` in eval DB after run: rows with `source='eval'` exist
- [ ] Query text is populated correctly (not empty)
- [ ] Logging failure does not crash `searchContent` (manually simulate by running with broken log path)

## New tools
- [ ] `get_content_search_log` — returns `top_queries` array with `query` + `count`
- [ ] `get_content_search_log` with empty log — returns `top_queries: []` (no error)
- [ ] `get_funnel_velocity` — returns `median_hours` and `p75_hours` for seeded data
- [ ] `get_funnel_velocity` with no data — returns `sample_size: 0`, no crash
- [ ] `get_ops_brief` — returns combined object with all 4 sub-sections

## Eval scenarios
- [ ] `npm run evals:maestro` → 18/18 PASS
- [ ] F4 (empty search log) — agent says no data, not fabricated content

## Full eval suite
- [ ] `npm run evals` → 31/31 PASS
- [ ] `npm run evals:ci` (workflow only) → 4/4, fast, no API calls

## README
- [ ] Eval usage table added and accurate
- [ ] CI command documented correctly
