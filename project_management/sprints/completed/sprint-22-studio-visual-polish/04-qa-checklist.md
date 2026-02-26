# Sprint 22: Studio Visual Polish QA Checklist

## 1. Structural Inconsistencies
- [ ] `PageShell` no longer renders "Studio" and "Not a certificate..." at the top of the page.
- [ ] The "Four levels. Clear progression." section is wrapped in a `.surface` card with `p-6 rounded-lg border border-border-subtle`.

## 2. Affordance & State Issues
- [ ] The `<summary>` elements for Journey, Gate Projects, and Role Readiness have a `hover:bg-surface-muted` state.
- [ ] All level badges use `variant="secondary"`.
- [ ] The "Apprentice" badge is no longer blue.

## 3. Layout & Typography
- [ ] The main content is a single column (no `lg:grid-cols-[1fr_300px]`).
- [ ] The "Recommended events" section is at the bottom of the main content, above the final CTA.
- [ ] The number circle in the level cards uses `type-meta` instead of `type-label`.

## 4. Tests & Build
- [ ] `npx vitest run` passes all tests.
- [ ] `npm run build` completes without errors.
