# Sprint 41 — Release Gate Reliability (Production-Only)

## Goal
Make quality gates deterministic and trustworthy for ship decisions.

## Scope
- Enforce Lighthouse execution against `next start` only.
- Fail fast when wrong server/runtime shape is detected.
- Add preflight checks for route availability and auth-path readiness.
- Standardize local + CI runbook for seeded audit execution.

## TDD Process
1. Write failing tests for production-runtime enforcement in Lighthouse runner.
2. Write failing tests for stale/wrong-server preflight failures.
3. Write failing tests for deterministic seeded run orchestration.
4. Implement/refactor with tests green.

## Stories
- As a release owner, I can trust Lighthouse results because they are always production-mode.
- As a developer, I get clear failures before expensive audits run on the wrong runtime.

## Acceptance Criteria
- Lighthouse job fails when not run against production server shape.
- Preflight catches stale/wrong localhost process before scoring.
- Team runbook documents exact release-gate sequence.

## End-of-Sprint Verification
```bash
npm run build
npm run start -- --port 3000
npm run test:lighthouse:seeded
```
Manual checks:
- Intentionally run against a stale server and verify preflight failure.
- Verify report output remains deterministic across two consecutive runs.

Pass condition:
- Production-only gate behavior is enforced and reproducible.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Production-runtime guard in Lighthouse runner:
  - `scripts/run-lighthouse.mjs`
  - Added strict production runtime assertion (`LH_STRICT_PRODUCTION_RUNTIME`, default true).
  - Added dev-marker detection fail-fast path for `next dev`/turbopack runtime.
- Existing stale-server/admin-shape preflight retained and validated:
  - `scripts/run-lighthouse.mjs`
- Release gate runbook:
  - `docs/lighthouse-release-gate-runbook.md`

Verification executed:
```bash
npm run build
npm run start -- --port 3000
npm run test:lighthouse:seeded
```

Verification outcome:
- Build passed.
- Production runtime started successfully on port 3000.
- Seeded Lighthouse gate passed with thresholds satisfied.
