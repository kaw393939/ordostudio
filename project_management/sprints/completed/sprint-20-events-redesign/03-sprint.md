# Sprint 20 — Events Page Redesign: Sprint Plan

**Status:** Approved ✅  
**Date:** 2026-02-25  
**Depends on:** 01-spec.md and 02-ux-design.md approved

---

## Task Sequence

Tasks are ordered by dependency. Each task includes the files to touch, what to do, and how to verify. Estimated total: 10 tasks.

---

### Task 1 — Migrate events metadata to `buildMetadata()`

**Files:**
- `src/app/(public)/events/page.tsx`

**Work:**
1. Import `buildMetadata` from `@/lib/metadata`
2. Replace manual `Metadata` object with `buildMetadata({ title: "Events", description: "...", path: "/events" })`
3. Add SEO-quality description: "Discover upcoming Studio Ordo workshops, leadership briefings, and community events."

**Verify:** `npm run build` — no errors. Inspect page source for correct OG tags.

---

### Task 2 — Simplify EventCard to 3 type roles

**Files:**
- `src/components/events/event-card.tsx`
- `src/components/events/__tests__/event-card.test.tsx` (create or update)

**Work:**
1. Restructure card layout:
   - Line 1: Date range (`type-meta text-text-secondary`)
   - Line 2: Title link (`type-title text-text-primary`)
   - Line 3: Status pill + relative time + optional "Free" label (`type-meta`)
2. Remove from card surface: timezone label, location, capability badge, description (line-clamp-2)
3. Keep `resolveStatusPill()` logic — it's solid
4. Ensure card padding is 16px per spec
5. Update or create test file covering: pill resolution, render output, Free badge visibility

**Verify:** `npm test` — EventCard tests pass. Visual check: card shows 3 lines only.

---

### Task 3 — Extract EventsFilterBar component

**Files:**
- Create `src/components/events/events-filter-bar.tsx`
- Create `src/components/events/__tests__/events-filter-bar.test.tsx`

**Work:**
1. Extract from `page-client.tsx`:
   - Search input + submit button (always visible)
   - "Filters" toggle button with active count badge
   - Collapsible panel containing: DateRangePicker, Status select, quick-filter buttons (This week, This month, Clear all)
2. Props interface:
   ```ts
   type EventsFilterBarProps = {
     searchQuery: string;
     onSearchChange: (q: string) => void;
     onSearchSubmit: () => void;
     dateRange: DateRangeValue;
     onDateRangeChange: (range: DateRangeValue) => void;
     status: PublicStatusFilter;
     onStatusChange: (status: PublicStatusFilter) => void;
     onQuickFilter: (preset: "this-week" | "this-month" | "upcoming" | "clear") => void;
   };
   ```
3. Use shadcn `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` for the disclosure
4. Compute `activeFilterCount` from non-default values
5. Add `SlidersHorizontal` icon from lucide-react

**Verify:** `npm test` — filter bar tests pass (toggle open/close, badge count, search submit).

---

### Task 4 — Extract EventsViewToolbar component

**Files:**
- Create `src/components/events/events-view-toolbar.tsx`
- Create `src/components/events/__tests__/events-view-toolbar.test.tsx`

**Work:**
1. Extract from `page-client.tsx`:
   - View toggle (List / Month / Agenda) using icon-only `ToggleGroup`
   - Sort select (compact, inline)
   - "Submit report" secondary CTA using `<Button asChild>`
2. Props interface:
   ```ts
   type EventsViewToolbarProps = {
     view: DiscoveryView;
     onViewChange: (view: DiscoveryView) => void;
     sort: EventSort;
     onSortChange: (sort: EventSort) => void;
   };
   ```
3. Use `ToggleGroup` + `ToggleGroupItem` from shadcn (check if installed, add if needed)
4. Icon imports: `List`, `CalendarDays`, `ListOrdered` from lucide-react
5. Each toggle item gets `aria-label` for accessibility

**Verify:** `npm test` — toolbar tests pass (view toggle, sort change, report link renders).

---

### Task 5 — Extract EventsListView component

**Files:**
- Create `src/components/events/events-list-view.tsx`
- Create `src/components/events/__tests__/events-list-view.test.tsx`

**Work:**
1. Extract from `page-client.tsx` (lines ~361-412):
   - Grid of EventCards (`grid gap-3 md:grid-cols-2 lg:grid-cols-3`)
   - Pagination (Previous / Page N / Next)
2. Props: `events: EventListItemViewModel[]`, `page: number`, `onPageChange: (p: number) => void`, `isFirstRender: boolean`
3. Conditionally wrap in `StaggerContainer`/`StaggerItem` only when `isFirstRender` is true
4. Mobile: single column. Tablet: 2 columns. Desktop: 3 columns.
5. Page size remains 5 for list view

**Verify:** `npm test` — list view tests pass (renders cards, pagination buttons, stagger on first render only).

---

### Task 6 — Extract EventsMonthView with responsive fallback

**Files:**
- Create `src/components/events/events-month-view.tsx`
- Create `src/components/events/__tests__/events-month-view.test.tsx`

**Work:**
1. Extract from `page-client.tsx` (lines ~405-440) — the 7-column calendar grid
2. Add responsive behavior:
   - Use `useMediaQuery("(min-width: 768px)")` or a CSS-only approach (`hidden md:grid` / `md:hidden`)
   - **≥768px:** Render 7-column grid with day-of-week headers (Mon–Sun)
   - **<768px:** Render agenda-style date-grouped list (reuse `toAgendaGroups()` + EventCard)
3. Add day-of-week header row to desktop calendar
4. Month navigation: Previous/Next month buttons + month label
5. Props:
   ```ts
   type EventsMonthViewProps = {
     events: EventListItemViewModel[];
     monthKey: string | null;
     onMonthChange: (key: string) => void;
     onEventSelect?: (event: EventListItemViewModel) => void;
   };
   ```
6. Remove event chip borders on desktop calendar; use subtle background tint instead

**Verify:** `npm test` — month view renders grid at desktop, list at mobile. Resize behavior works.

---

### Task 7 — Extract EventsAgendaView component

**Files:**
- Create `src/components/events/events-agenda-view.tsx`
- Create `src/components/events/__tests__/events-agenda-view.test.tsx`

**Work:**
1. Extract from `page-client.tsx` (lines ~442-475) — date-grouped list
2. Each group: date header + list of event items with time context
3. Replace inline `<button>` + `<Link>` pattern with simplified EventCard or a new `EventAgendaItem` row
4. Remove the `onClick={() => setPreviewEvent(eventItem)}` handler (Quick Preview removed)
5. Props: `events: EventListItemViewModel[]`

**Verify:** `npm test` — agenda view renders grouped events with correct date headers.

---

### Task 8 — Recompose page-client.tsx as thin shell

**Files:**
- `src/app/(public)/events/page-client.tsx` (major rewrite)

**Work:**
1. Keep in this file:
   - `"use client"` directive
   - `useQueryStates()` hook (URL state)
   - `useEffect` for data fetching
   - `isFirstRender` ref for animation control
   - Composition of extracted components
2. Remove from this file:
   - Hero card markup (delete entirely)
   - Filter panel markup (→ `EventsFilterBar`)
   - View toggle + sort markup (→ `EventsViewToolbar`)
   - List view grid + pagination (→ `EventsListView`)
   - Month view (→ `EventsMonthView`)
   - Agenda view (→ `EventsAgendaView`)
   - Quick Preview card (delete entirely)
3. Target: ≤ 120 lines
4. Wire extracted components via props — no prop drilling beyond one level
5. Update existing tests in `src/__tests__/` that reference `page-client.tsx` patterns

**Verify:** `npm run build` — no errors. `npm test` — all pass. Page loads and functions identically.

---

### Task 9 — Remove stagger on filter changes

**Files:**
- `src/components/events/events-list-view.tsx` (already created in Task 5)

**Work:**
1. In `EventsListView`, use the `isFirstRender` prop to conditionally apply stagger
2. When `isFirstRender` is false, render plain `<div>` wrappers instead of `StaggerContainer`/`StaggerItem`
3. Ensure `StaggerContainer` respects `prefers-reduced-motion` (check existing implementation)

**Verify:** Filter change does not trigger card animation. First page load does animate. `prefers-reduced-motion: reduce` skips all animation.

---

### Task 10 — Final integration test and cleanup

**Files:**
- `src/app/(public)/events/page-client.tsx`
- All new component files
- `e2e/events-screenshots.spec.ts` (update or remove)

**Work:**
1. Run full test suite: `npm test`
2. Run Playwright screenshots at 375px, 768px, 1440px to verify responsive behavior
3. Verify no horizontal overflow at any breakpoint
4. Verify first event card is visible without scrolling on mobile
5. Verify `page-client.tsx` is ≤ 150 lines
6. Delete `e2e/events-screenshots.spec.ts` if no longer needed, or keep for regression
7. Verify `grep -r "inline-flex items-center justify-center" src/app/(public)/events/` returns zero matches

**Verify:** All acceptance criteria from 01-spec.md pass.

---

## File Change Summary

| Action | File | Lines (est.) |
|--------|------|-------------|
| Edit | `src/app/(public)/events/page.tsx` | ~15 |
| Rewrite | `src/app/(public)/events/page-client.tsx` | ~120 (from 529) |
| Edit | `src/components/events/event-card.tsx` | ~60 (from 126) |
| Create | `src/components/events/events-filter-bar.tsx` | ~80 |
| Create | `src/components/events/events-view-toolbar.tsx` | ~50 |
| Create | `src/components/events/events-list-view.tsx` | ~60 |
| Create | `src/components/events/events-month-view.tsx` | ~80 |
| Create | `src/components/events/events-agenda-view.tsx` | ~50 |
| Create | `src/components/events/__tests__/event-card.test.tsx` | ~80 |
| Create | `src/components/events/__tests__/events-filter-bar.test.tsx` | ~60 |
| Create | `src/components/events/__tests__/events-view-toolbar.test.tsx` | ~50 |
| Create | `src/components/events/__tests__/events-list-view.test.tsx` | ~50 |
| Create | `src/components/events/__tests__/events-month-view.test.tsx` | ~60 |
| Create | `src/components/events/__tests__/events-agenda-view.test.tsx` | ~50 |

**Net change:** 529 lines → ~500 lines across 8 files (+ ~350 lines of tests). Better organized, testable, maintainable.

---

## Dependency Graph

```
Task 1 (metadata) ─────────────────── standalone
Task 2 (EventCard) ────────────────── standalone
Task 3 (FilterBar) ────────────────── standalone
Task 4 (ViewToolbar) ──────────────── standalone
Task 5 (ListView) ─────── depends on Task 2
Task 6 (MonthView) ────── depends on Task 2
Task 7 (AgendaView) ───── depends on Task 2
Task 8 (recompose) ────── depends on Tasks 2–7
Task 9 (stagger fix) ──── depends on Task 5
Task 10 (integration) ─── depends on all
```

Tasks 1–4 can be done in parallel. Tasks 5–7 can be done in parallel after Task 2. Task 8 is the integration step. Tasks 9–10 are finishing moves.
