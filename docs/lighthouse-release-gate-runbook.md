# Lighthouse Release Gate Runbook

## Purpose
Run deterministic Lighthouse checks for release decisions using production runtime and seeded content.

## Required Runtime
- Must run against `next start` (production), not `next dev`.
- Gate enforces this by default via `LH_STRICT_PRODUCTION_RUNTIME=true`.

## Standard Local Sequence
```bash
npm run build
npm run start -- --port 3000
npm run test:lighthouse:seeded
```

## What the Gate Validates
- Base URL reachability.
- Production-runtime shape (dev markers fail fast).
- Admin route freshness preflight (stale server/process detection).
- Auth-aware page-set audits for unauthenticated/user/admin contexts.
- Threshold checks by category.

## Output Artifacts
- Markdown summary: `tmp/lighthouse/summary.md`
- JSON summary: `tmp/lighthouse/summary.json`
- Per-page reports: `tmp/lighthouse/*.report.json`

## Common Failures and Fixes
- **Production-runtime error**
  - Cause: script hit `next dev` instance.
  - Fix: stop dev server; run `npm run build && npm run start -- --port 3000`.

- **Server shape preflight failed**
  - Cause: stale/mismatched process or wrong app instance.
  - Fix: kill process on target port and restart production server from this workspace.

- **Threshold failures**
  - Cause: route regressions.
  - Fix: inspect per-page `.report.json` and compare with prior `summary.json` artifact.

## Optional Local Overrides (non-release use)
- Disable production-runtime enforcement:
  - `LH_STRICT_PRODUCTION_RUNTIME=false npm run test:lighthouse`
- Disable route-shape preflight:
  - `LH_STRICT_SERVER_SHAPE=false npm run test:lighthouse`
