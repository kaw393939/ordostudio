# Sprint 20 — Events Page Redesign: Spec

**Status:** Approved ✅  
**Date:** 2026-02-25  
**Author:** GitHub Copilot + Keith Williams

---

## Business Objective

The events page is the primary discovery surface for Studio Ordo training sessions, workshops, and community events. In its current state, it presents every control and data point simultaneously — search, date pickers, quick-filter buttons, dropdowns, view toggles — creating a wall of UI that overwhelms rather than guides. On mobile (375px) the 7-column calendar grid is unusable and the stacked filter controls push actual event content below the fold. The page needs a ground-up layout redesign that applies Swiss/Bauhaus hierarchy principles and Krug's "Don't Make Me Think" standard: the visitor should see events first, controls second.

**Success metric:** A first-time visitor on any device can find and click into a relevant event within 5 seconds, without scrolling past non-event UI. Mobile Lighthouse performance score ≥ 80; no horizontal overflow at any supported breakpoint (375px, 768px, 1440px).

---

## Problems Addressed

### P0 — Mobile Unusable (fix immediately)

1. **Month view renders a 7-column grid at 375px.** Each day cell collapses to ~40px wide, making event titles unreadable and touch targets too small. No responsive fallback exists — the same `grid-cols-7` renders at every breakpoint.

2. **Filter panel exceeds viewport on mobile.** The search form, date range picker, 4 quick-filter buttons, 2 `<Select>` dropdowns, and 3 view-toggle buttons all render simultaneously inside a single `<Card>`. On a phone screen this stack is ~450px tall before any event content appears.

3. **Hero card consumes prime real estate.** A 6-line marketing card ("Field Work & Live Sessions") sits above both filters and events, pushing the first event card even further below the fold — especially damaging on small screens.

### P1 — Information Density Violates Design System

4. **Filter panel shows every control at once.** 13 interactive elements (1 search input, 1 search button, 1 date picker, 4 quick-filter buttons, 2 selects, 3 view toggles) are visible simultaneously. The Swiss/Bauhaus spec mandates "hierarchy over density" — users should see the most-used action first, with progressive disclosure for the rest.

5. **EventCard presents too many type roles.** Each card renders: title (link), Free badge, date range, timezone label, relative time, location, capability badge, description (line-clamp-2), and status pill. That's 7–9 distinct text styles in a single surface, violating the spec rule "Use no more than 3 type roles in a single card/surface."

6. **Quick Preview card adds visual noise.** In month and agenda views, a "Quick preview" card appends at the bottom, showing information that duplicates what the user already sees in the selected cell. On mobile this card is often invisible (below the fold) and on desktop it competes with the primary content area.

### P2 — Structural & Hygiene

7. **529-line monolithic client component.** `page-client.tsx` contains data fetching, URL state management, filter logic, hero markup, search form, three view renderers, pagination, and the preview panel — all in one file. This violates the design system's layer boundary contract: "screens" should be composition only, with logic in adapters and reusable UI in patterns.

8. **Inline-styled "Submit a Field Report" link.** The hero card's secondary CTA uses raw Tailwind classes instead of the `<Button>` primitive — the same anti-pattern Sprint 19 cleaned up on the homepage.

9. **Metadata not using `buildMetadata()`.** `page.tsx` manually constructs metadata instead of using the shared helper introduced in Sprint 19.

10. **Stagger animation on every list render.** `StaggerContainer`/`StaggerItem` wrap every event card, causing a visible "popcorn" effect on each filter change. Motion should be reserved for orientation and feedback (spec §5.1), not routine list updates.

---

## In Scope

| # | Item | Priority |
|---|---|---|
| 1 | Make month view responsive (list fallback on mobile, 7-col on desktop) | P0 |
| 2 | Collapse filter panel behind progressive disclosure (search visible, filters behind "More filters" toggle/drawer) | P0 |
| 3 | Remove or demote hero card (move to a subtle inline banner or remove entirely) | P0 |
| 4 | Simplify EventCard (≤ 3 type roles visible by default; secondary info on hover/expand) | P1 |
| 5 | Remove or rethink Quick Preview card | P1 |
| 6 | Decompose page-client.tsx into composable modules (≤ 150 lines per file) | P2 |
| 7 | Replace inline CTA classes with `<Button>` primitive | P2 |
| 8 | Migrate metadata to `buildMetadata()` helper | P2 |
| 9 | Restrict stagger animation to initial page load only | P2 |
| 10 | Full test coverage for all new/refactored modules | P2 |

---

## Out of Scope

- New event types or API changes
- Event detail page redesign (separate sprint)
- Registration / payment flow changes
- Content or copy rewrites beyond hero removal
- Dark mode adjustments (tracked separately)
- Calendar month-picker or week-view additions

---

## Acceptance Criteria

1. At 375px viewport, no horizontal overflow on any events view (list, month, agenda).
2. At 375px, the first event card is visible without scrolling past more than one row of controls.
3. Month view at <768px renders as a stacked list (not 7-column grid).
4. Month view at ≥768px renders the standard 7-column calendar grid.
5. Filter controls other than search are hidden by default; a "Filters" button reveals them.
6. EventCard shows ≤ 3 type roles in its default (collapsed) state.
7. `page-client.tsx` is ≤ 150 lines — remaining logic extracted to dedicated modules.
8. `grep -r "inline-flex items-center justify-center" src/app/(public)/events/` returns zero matches.
9. Events page uses `buildMetadata()` for its metadata export.
10. All existing tests pass (`npm test`). New component tests cover every extracted module.
11. Lighthouse mobile performance score ≥ 80 on `/events`.

---

## Key Decisions (approved 2026-02-24)

- [x] **Hero card:** Remove entirely. Page title + subtitle in PageShell is sufficient. ✅
- [x] **Quick Preview:** Remove entirely for V1; reconsider if users request it. ✅
- [x] **Filter drawer vs. disclosure:** Inline collapsible — simpler, no overlay management. ✅
- [x] **EventCard secondary info:** Remove from card; show on detail page. Keep cards minimal. ✅
- [x] **Stagger animation:** First-load-only with `prefers-reduced-motion` respect. ✅

---

## Dependencies

- Sprint 19 `buildMetadata()` helper (already implemented)
- Sprint 19 Button `asChild` support (already implemented)
- Existing HAL client and view-model adapters (no API changes)

---

## Risk

| Risk | Mitigation |
|---|---|
| Decomposition breaks URL state sync | Keep nuqs hook in parent; pass state down via props |
| Mobile layout change confuses existing users | Month view mobile fallback is a list — familiar pattern |
| Removing hero removes discoverability of Field Reports | "Submit a Field Report" link moves to page subtitle or action bar |
| Test coverage gaps after decomposition | Each extracted module gets its own test file before PR merge |
