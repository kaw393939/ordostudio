# Sprint 41–44 — Usability, SEO, and Performance Hardening

## Goal
Close all remaining issues identified in [docs/usability-seo-navigation-audit.md](docs/usability-seo-navigation-audit.md) and convert the current quality level into enforceable release standards.

## Audit Traceability
Source issues covered:
1. Production-mode Lighthouse must be the release source of truth.
2. Lighthouse trend tracking needs CI artifact history.
3. Route-type performance budgets need explicit pass/fail gates.
4. Shared client/runtime overhead still needs targeted reduction on core templates.

---

## Sprint 41 — Release Gate Reliability (Production-Only)

### Goal
Make quality gates deterministic and trustworthy for ship decisions.

### Scope
- Enforce Lighthouse execution against `next start` only.
- Fail fast when wrong server/runtime shape is detected.
- Add preflight checks for route availability and auth-path readiness.
- Standardize local + CI runbook for seeded audit execution.

### Acceptance Criteria
- Lighthouse job fails when not run against production server.
- Preflight catches stale/wrong localhost process before scoring.
- Team runbook documents exact release-gate sequence.

### End-of-Sprint Verification
```bash
npm run build
npm run start -- --port 3000
npm run test:lighthouse:seeded
```
Manual checks:
- Intentionally run against a stale server and verify preflight failure.
- Verify report output remains deterministic across two consecutive runs.

### Exit Gate
Move sprint only when production-only gating is enforced and reproducible.

---

## Sprint 42 — CI Trend Visibility and Regression Forensics

### Goal
Make quality regressions visible over time, not just at a single commit.

### Scope
- Persist Lighthouse `summary.json` as CI artifacts per run.
- Add comparison utility for previous vs current score deltas by route + category.
- Add regression annotations for PR visibility.
- Define severity thresholds (warn vs fail) for deltas.

### Acceptance Criteria
- Every CI run stores and links Lighthouse artifacts.
- PRs surface score deltas for affected routes.
- Regression policy is documented and applied consistently.

### End-of-Sprint Verification
```bash
npm run test:lighthouse
```
Manual checks:
- Review artifact retention and retrieval from recent pipeline runs.
- Validate delta summary includes route/category-level changes.

### Exit Gate
Move sprint only when trend visibility is active and useful in PR review.

---

## Sprint 43 — Route-Type Performance Budgets

### Goal
Turn “good enough” performance into enforceable budgets by user context.

### Scope
- Define budget tiers for route types:
  - Public marketing/content routes
  - Authenticated user routes
  - Admin operational routes
- Add budget assertions in Lighthouse gate.
- Calibrate thresholds with baseline + variance buffer.
- Document exception workflow for temporary waivers.

### Acceptance Criteria
- Budget file exists and is used by CI gate.
- Failing routes clearly report violated budgets.
- Waiver process exists with expiration and owner.

### End-of-Sprint Verification
```bash
npm run test:lighthouse
```
Manual checks:
- Force a controlled regression and confirm clear budget failure output.
- Validate route-type mapping logic for all audited paths.

### Exit Gate
Move sprint only when budget-based gating is active and auditable.

---

## Sprint 44 — Shared Runtime and Render-Path Reduction

### Goal
Reduce systemic overhead on core templates, especially the homepage and heavy shells.

### Scope
- Minimize shared client-side JS on top-level routes.
- Isolate interactive islands to feature-level boundaries.
- Reduce render-blocking work in global layout and shell components.
- Reassess nav/context fetch strategy for minimal startup cost.

### Acceptance Criteria
- Home and core shell routes show measurable perf gain vs Sprint 41 baseline.
- No regression in accessibility/SEO while reducing runtime overhead.
- Lighthouse reports confirm sustained high scores with improved perf floor.

### End-of-Sprint Verification
```bash
npm run build
npm run start -- --port 3000
npm run test:lighthouse:seeded
npm run lint
```
Manual checks:
- Compare before/after route metrics from stored CI artifacts.
- Verify no new UX regressions in navigation and auth transitions.

### Exit Gate
Move sprint only when shared-overhead reductions are measurable and stable.

---

## Program Metrics
Track each sprint with:
- Lighthouse pass rate in CI
- Median score deltas by route category
- Number of budget violations per PR
- Time-to-diagnose for Lighthouse regressions
- Core route LCP/TTI trend in production-mode audits

## Program Completion Gate
Program is complete when:
- Sprint 41–44 exit gates all pass.
- CI artifacts + delta reporting are standard in PR workflow.
- Route budgets are enforced with low false-positive rate.
- Shared-runtime perf improvements are sustained for 2+ release cycles.
