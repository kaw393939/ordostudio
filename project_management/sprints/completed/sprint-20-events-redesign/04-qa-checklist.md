# Sprint 20 — Events Page Redesign: QA Checklist

**Status:** Approved ✅  
**Date:** 2026-02-25  
**Depends on:** 03-sprint.md tasks completed

---

## Instructions

Run each check in order. Mark each item pass/fail. **All items must pass before the sprint is considered complete.** If any item fails, fix the issue and re-run from that item forward.

---

## Gate 1 — Build & Tests

- [ ] `npm test` — all test files pass, zero failures
- [ ] `npm run build` — clean production build, zero errors, zero warnings
- [ ] No new TypeScript errors introduced (`npx tsc --noEmit`)

---

## Gate 2 — Metadata (P2)

- [ ] `page.tsx` uses `buildMetadata()` (not manual `Metadata` object)
- [ ] `grep -r "buildMetadata" src/app/(public)/events/page.tsx` returns a match
- [ ] OG title contains "Events"
- [ ] OG description is real marketing copy (not placeholder)
- [ ] Canonical URL is `/events`

---

## Gate 3 — EventCard Simplification (P1)

### Default card surface
- [ ] Card shows ≤ 3 semantic type roles (date, title, status line)
- [ ] Timezone label is NOT visible on card surface
- [ ] Location text is NOT visible on card surface
- [ ] Capability badge is NOT visible on card surface
- [ ] Description text is NOT visible on card surface
- [ ] Free badge still appears for community events (on status line)

### Status pill
- [ ] "Open" pill renders with success color for future events
- [ ] "Closing Soon" pill renders with warning color for events starting within 7 days
- [ ] "In Progress" pill renders for events currently running
- [ ] "Closed" pill renders for past/cancelled events

### Tests
- [ ] `event-card.test.tsx` exists and passes
- [ ] Tests cover all 4 pill states
- [ ] Tests verify Free badge conditional rendering

---

## Gate 4 — Filter Bar Progressive Disclosure (P0)

### Default state
- [ ] Search input is visible on page load
- [ ] Search button is visible on page load
- [ ] Date range picker is NOT visible by default
- [ ] Status/visibility select is NOT visible by default
- [ ] Quick-filter buttons (This week, This month) are NOT visible by default
- [ ] A "Filters" button/toggle is visible

### Expanded state
- [ ] Clicking "Filters" reveals the filter panel
- [ ] Filter panel contains: DateRangePicker, Status select, quick-filter buttons, Clear
- [ ] Clicking "Filters" again collapses the panel
- [ ] Filter panel uses `aria-expanded` for accessibility

### Active filter badge
- [ ] When a date range is set, Filters button shows a count badge
- [ ] When status ≠ "upcoming", Filters button shows a count badge
- [ ] When all filters are default, no badge is shown

### Tests
- [ ] `events-filter-bar.test.tsx` exists and passes
- [ ] Tests verify toggle open/close behavior
- [ ] Tests verify badge count logic

---

## Gate 5 — View Toolbar (P0)

- [ ] View toggle uses icon-only buttons (not text "List"/"Month"/"Agenda")
- [ ] Each toggle button has an `aria-label`
- [ ] Sort select is inline next to view toggle
- [ ] "Submit report" link renders using `<Button asChild>` primitive
- [ ] `grep -r "inline-flex items-center justify-center" src/app/(public)/events/` returns **zero matches**

### Tests
- [ ] `events-view-toolbar.test.tsx` exists and passes

---

## Gate 6 — Hero Card Removal (P0)

- [ ] "Field Work & Live Sessions" heading does NOT appear on the events page
- [ ] `grep -r "Field Work" src/app/(public)/events/` returns **zero matches**
- [ ] "Submit a Field Report" action is accessible via the view toolbar (or PageShell)
- [ ] No 120px marketing block above the filter bar

---

## Gate 7 — Quick Preview Removal (P1)

- [ ] "Quick preview" heading does NOT appear on the events page
- [ ] `grep -r "Quick preview" src/app/(public)/events/` returns **zero matches**
- [ ] No `previewEvent` state in `page-client.tsx`

---

## Gate 8 — Responsive Layout (P0)

### Mobile (375px viewport)
- [ ] No horizontal overflow — page fits within viewport width
- [ ] First event card is visible without scrolling past more than ~120px of controls
- [ ] Month view renders as a date-grouped list (NOT 7-column grid)
- [ ] Filter bar stacks vertically and fits within viewport
- [ ] Pagination controls are reachable and tappable (44px min touch target)

### Tablet (768px viewport)
- [ ] Event cards render in 2-column grid (list view)
- [ ] Month view renders as 7-column calendar grid
- [ ] Filters expand inline (not in a modal/drawer)

### Desktop (1440px viewport)
- [ ] Event cards render in 3-column grid (list view)
- [ ] Month view renders as 7-column calendar grid with day-of-week headers
- [ ] Content width does not exceed 1200px (max-content-width per spec)

### Screenshots
- [ ] Playwright screenshot at 375px — no visual breakage
- [ ] Playwright screenshot at 768px — no visual breakage
- [ ] Playwright screenshot at 1440px — no visual breakage

---

## Gate 9 — Component Decomposition (P2)

### File size
- [ ] `page-client.tsx` is ≤ 150 lines (`wc -l` check)
- [ ] No single component file exceeds 150 lines

### New components exist
- [ ] `src/components/events/events-filter-bar.tsx` exists
- [ ] `src/components/events/events-view-toolbar.tsx` exists
- [ ] `src/components/events/events-list-view.tsx` exists
- [ ] `src/components/events/events-month-view.tsx` exists
- [ ] `src/components/events/events-agenda-view.tsx` exists

### Layer boundaries
- [ ] No API calls in any component file — only in `page-client.tsx`
- [ ] Extracted components receive data via props only
- [ ] No direct `useQueryStates` usage in extracted components (only in page-client)

---

## Gate 10 — Motion (P2)

- [ ] First page load: event cards animate in with stagger
- [ ] Subsequent filter changes: cards appear instantly (no stagger)
- [ ] `prefers-reduced-motion: reduce` — no animation at any time
- [ ] No looping decorative motion on the page

---

## Gate 11 — Accessibility

- [ ] All interactive elements are keyboard-reachable (Tab through page)
- [ ] Filter disclosure button announces expanded/collapsed state to screen readers
- [ ] View toggle is navigable with arrow keys (ToggleGroup behavior)
- [ ] EventCard title link is the primary focus target within each card
- [ ] Focus ring visible on all interactive elements (using `--focus-ring` token)
- [ ] No color-only status indicators — pill label text accompanies color

---

## Gate 12 — Regression

- [ ] Homepage still renders correctly (no side effects from shared component changes)
- [ ] Event detail pages still render correctly
- [ ] Navigation to/from events page works (Next.js client routing)
- [ ] URL state sync works: setting filters updates URL params, refreshing page restores filter state
- [ ] Empty state renders when no events match filters
- [ ] Error state renders when API is unreachable
- [ ] Loading state renders while fetching

---

## Gate 13 — Final Sign-off

- [ ] All gates above pass
- [ ] Keith reviews screenshots at 3 viewports and approves layout
- [ ] `npm test` final run — all pass
- [ ] `npm run build` final run — clean
- [ ] Sprint status updated to Complete ✅
