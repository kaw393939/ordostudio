````markdown
# Sprint 52 — Visual Regression, Core Web Vitals, Feature Flags, Design Docs & Release

## Goal
Ship the modernization with measurable confidence: visual regression baselines, performance budgets met, feature flags for controlled rollout, living design-system documentation, and a signed-off release checklist.

## Scope

### Visual Regression Testing
- Add screenshot-based visual regression tests for critical pages:
  - Home, Events List, Event Detail, Login, Register, Account Dashboard, Admin Home, Admin Events.
- Capture screenshots in both light and dark mode at 3 viewports (mobile 375px, tablet 768px, desktop 1440px).
- Store baseline screenshots; future runs diff against baseline with configurable tolerance.
- Use Playwright visual comparison (`toHaveScreenshot()`) integrated into CI.
- Generate visual diff report on failure showing overlay of expected vs actual.

### Core Web Vitals Performance Budgets
- Define and enforce budgets:
  - **LCP** (Largest Contentful Paint): < 2.5s on 3G throttled.
  - **FID/INP** (Interaction to Next Paint): < 200ms.
  - **CLS** (Cumulative Layout Shift): < 0.1.
  - **TBT** (Total Blocking Time): < 300ms.
- Run Lighthouse CI on 5 key routes (home, events, event detail, login, admin home).
- Fail build if any metric exceeds budget.
- Track Lighthouse scores over time via `npm run test:lighthouse:delta`.

### Bundle Size Monitoring
- Add bundle analysis step: track JS bundle size per route.
- Alert if any route's JS exceeds 200KB gzipped.
- Document tree-shaking expectations for shadcn components (only imported code ships).

### Feature Flag Strategy
- Implement lightweight feature-flag mechanism:
  - Environment variable based (`NEXT_PUBLIC_FF_*`) for build-time flags.
  - Optional runtime flag from server config for gradual rollout.
- Flag high-risk UI transitions:
  - `FF_CALENDAR_GRID` — admin calendar grid view.
  - `FF_DARK_MODE_TOGGLE` — explicit dark/light toggle.
  - `FF_UNDO_DELETE` — undo pattern for destructive actions.
- Non-flagged path renders previous UI; flagged path renders modernized UI.
- Tests cover both flagged and non-flagged code paths.

### Design System Documentation
- Create `/docs/design-system.md` or `/dev/design-system` route documenting:
  - Color tokens with swatches (light + dark).
  - Typography scale with live examples.
  - Spacing scale visualization.
  - **Canonical Lucide icon map** (from Sprint 45 `/docs/icon-map.md`) embedded or linked.
  - Component inventory with variant matrix.
  - Form field patterns with validation examples and label/placeholder rules.
  - Date/time component usage guide with 3 canonical display modes.
  - Animation/motion guidelines (Framer Motion variants + reduced-motion rules).
  - Loading/error/empty state trinity pattern.
  - Accessibility checklist for new components.
- This becomes the living reference for all future UI work.

### SEO & Metadata Audit (Audit-Driven)
- Verify every route has proper `<title>`, `description`, `og:title`, `og:description`, and canonical URL.
- Validate JSON-LD structured data on event pages.
- Run Lighthouse SEO audit on 5 key public routes; target score ≥ 95.
- Document any remaining SEO gaps for future iterations.

### Dead Code & Migration Cleanup
- Remove legacy component duplicates replaced by shadcn primitives.
- Remove unused CSS classes and deprecated utility functions.
- Clean up temporary migration shims and TODOs.
- Verify no orphaned imports or unused exports.

### Release Checklist
- [ ] All sprint 45–51 acceptance criteria verified.
- [ ] Visual regression baselines captured and committed.
- [ ] Lighthouse CI passes on all 5 key routes.
- [ ] Bundle size within budget.
- [ ] Feature flags documented with enable/disable instructions.
- [ ] Design system docs reviewed by team.
- [ ] Rollback playbook written: "If X breaks, toggle flag Y / revert commit Z."
- [ ] Post-release monitoring plan: check error rates, Lighthouse scores, and user feedback for 48 hours.
- [ ] CHANGELOG updated with modernization summary.

### Rollback Playbook
- Per-feature rollback via flag toggle (no redeploy needed for runtime flags).
- Full rollback via Git revert of modernization merge commit.
- Database: no schema changes in this program — rollback is code-only.
- Monitoring: alert if error rate > 1% or Lighthouse regression > 10% on any route.

## TDD Process
1. Write failing Playwright visual regression tests for 8 critical pages × 2 modes × 3 viewports.
2. Write failing Lighthouse CI budget checks for LCP, CLS, INP, TBT on 5 routes.
3. Write failing tests for feature-flag gating: both enabled and disabled paths render correctly.
4. Write failing tests verifying no dead imports or unused exports remain.
5. Implement visual regression infrastructure, flags, cleanup, and documentation.
6. Generate visual baselines and Lighthouse score snapshots.

## Stories
- As a release manager, I can see visual diffs for every page before shipping and catch regressions automatically.
- As a stakeholder, I can verify Lighthouse scores meet our performance commitments with a single command.
- As a cautious operator, I can enable new UI features gradually via flags and roll back instantly if issues emerge.
- As a new team member, I can read the design system docs and build consistent UI on day one.
- As a cleanup advocate, I know no dead code ships to production.

## Acceptance Criteria
- [ ] Visual regression tests capture baselines for 8+ pages in light/dark × 3 viewports.
- [ ] Lighthouse CI passes LCP < 2.5s, CLS < 0.1, INP < 200ms, TBT < 300ms on 5 key routes.
- [ ] Lighthouse SEO score ≥ 95 on 5 key public routes.
- [ ] Bundle size per route < 200KB gzipped.
- [ ] Feature flags documented and tested in both on/off states.
- [ ] Design system documentation is published and reviewed (includes icon map, form rules, date modes, a11y checklist).
- [ ] Dead code removed; no unused imports or exports remain.
- [ ] Zero placeholder-only form fields, zero `window.confirm` calls, zero raw date formatting confirmed.
- [ ] Release checklist signed off.
- [ ] Rollback playbook written and tested.
- [ ] CHANGELOG updated.
- [ ] All tests, lint, and build pass.

## End-of-Sprint Verification
```bash
npm run test
npm run test:e2e
npm run lint
npm run build
npm run test:lighthouse
```
Manual checks:
- Review visual regression diff report — zero unexpected changes.
- Verify Lighthouse scores on home and admin home meet budgets.
- Toggle each feature flag off and verify graceful fallback.
- Read design system docs end-to-end and verify accuracy.
- Run `npm run build` with `ANALYZE=true` and verify bundle sizes.

Pass condition:
- The modernization ships with controlled risk, measurable quality, and institutional knowledge captured.

## Exit Gate
Move sprint only when acceptance criteria, release checklist, and program-level exit gate all pass.

````
