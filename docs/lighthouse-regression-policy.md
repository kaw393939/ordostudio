# Lighthouse Regression Policy

## Purpose
Define consistent warning/failure behavior for score deltas between baseline and current runs.

## Baseline Source
- Preferred: previous commit `tmp/lighthouse/summary.json` in CI.
- Alternate: persisted artifact from prior release run.

## Severity Thresholds
- Warning threshold: drop of **2** points or more in any category (`LH_DELTA_WARN=2`).
- Failure threshold: drop of **5** points or more in any category (`LH_DELTA_FAIL=5`).

## Enforced Categories
- `performance`
- `accessibility`
- `best-practices`
- `seo`

## Behavior
- Warning-level drops are printed in CI summary and should be triaged.
- Failure-level drops fail the workflow.
- New routes without baseline are marked as `new` and do not fail by default.

## Temporary Waiver Process
When a regression is intentional/temporary:
1. Create follow-up issue with owner and ETA.
2. Add explicit waiver note in PR description.
3. Set a short-lived override in CI env (`LH_DELTA_FAIL`) only for that PR.
4. Remove override in next PR after remediation.

## Local Commands
```bash
npm run test:lighthouse:seeded
npm run test:lighthouse:delta -- --base tmp/lighthouse/baseline-summary.json --current tmp/lighthouse/summary.json
```

## CI Outputs
- `tmp/lighthouse/summary.md`
- `tmp/lighthouse/summary.json`
- `tmp/lighthouse/delta.md`
- `tmp/lighthouse/delta.json`
