# Sprint 44 — Shared Runtime and Render-Path Reduction

## Goal
Reduce systemic overhead on core templates, especially homepage and heavy shells.

## Scope
- Minimize shared client-side JS on top-level routes.
- Isolate interactive islands to feature-level boundaries.
- Reduce render-blocking work in global layout and shell components.
- Reassess nav/context fetch strategy for minimal startup cost.

## TDD Process
1. Write failing tests for route shell behavior after client/server boundary refactors.
2. Write failing tests for nav/context correctness under guest/user/admin states.
3. Write failing tests for performance budget compliance on targeted routes.
4. Implement/refactor with tests green.

## Stories
- As a visitor, core pages render quickly and remain interactive with minimal delay.
- As a product owner, performance gains remain stable across release cycles.

## Acceptance Criteria
- Home and core shell routes show measurable perf gain vs Sprint 41 baseline.
- No regression in accessibility/SEO while reducing runtime overhead.
- Lighthouse reports confirm sustained high scores with improved perf floor.

## End-of-Sprint Verification
```bash
npm run build
npm run start -- --port 3000
npm run test:lighthouse:seeded
npm run lint
```
Manual checks:
- Compare before/after route metrics from stored CI artifacts.
- Verify no new UX regressions in navigation and auth transitions.

Pass condition:
- Shared-overhead reductions are measurable and stable.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run build`
	- `npm run start -- --port 3000`
	- `npm run test:lighthouse:seeded`
	- `npm run lint`
- Outcomes:
	- Moved menu audience resolution to server via `src/lib/navigation/menu-audience.ts`.
	- Updated `src/app/(public)/layout.tsx` and `src/app/(admin)/layout.tsx` to pass server-derived audience into nav.
	- Simplified `src/components/navigation/menu-nav.tsx` to resolve items from props instead of client fetch.
	- Hardened Lighthouse run stability by making storage reset behavior configurable in `scripts/run-lighthouse.mjs`.
	- Verification passed with existing repository lint warnings unchanged (no new lint errors).
