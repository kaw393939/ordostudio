# Sprint 42 — CI Trend Visibility and Regression Forensics

## Goal
Make quality regressions visible over time, not just at a single commit.

## Scope
- Persist Lighthouse `summary.json` as CI artifacts per run.
- Add comparison utility for previous vs current score deltas by route + category.
- Add regression annotations for PR visibility.
- Define severity thresholds (warn vs fail) for deltas.

## TDD Process
1. Write failing tests for artifact serialization and schema stability.
2. Write failing tests for route/category delta computation.
3. Write failing tests for severity threshold behavior.
4. Implement/refactor with tests green.

## Stories
- As a reviewer, I can see score deltas in PR context without opening raw artifacts.
- As an engineer, I can quickly identify which route/category regressed.

## Acceptance Criteria
- Every CI run stores and links Lighthouse artifacts.
- PRs surface score deltas for affected routes.
- Regression policy is documented and applied consistently.

## End-of-Sprint Verification
```bash
npm run test:lighthouse
```
Manual checks:
- Review artifact retention and retrieval from recent pipeline runs.
- Validate delta summary includes route/category-level changes.

Pass condition:
- Trend visibility is active and useful in PR review.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test:lighthouse:seeded`
	- `npm run test:lighthouse:delta -- --base tmp/lighthouse/baseline-summary.json --current tmp/lighthouse/summary.json`
- Outcomes:
	- Seeded Lighthouse gate passes and writes `tmp/lighthouse/summary.json` + `summary.md`.
	- Delta tool writes `tmp/lighthouse/delta.json` + `delta.md` with warn/fail regression policy.
	- CI workflow `.github/workflows/lighthouse-release-gate.yml` publishes artifacts and PR summary output.
