# Sprint 20 — Events Page Redesign: UX/UI Design

**Status:** Approved ✅  
**Date:** 2026-02-25  
**Depends on:** 01-spec.md approved

---

## Design Principles Applied

All changes enforce the established Swiss/Bauhaus system (`docs/swiss-bauhaus-ui-spec.md`, `docs/design-system.md`):

- **Hierarchy over density** — Show events first, controls second. Progressive disclosure for filters.
- **"Don't Make Me Think" (Krug)** — A visitor should immediately see event cards. No cognitive overhead parsing a control panel before interacting with content.
- **3-type-role card rule** — Each EventCard surface uses at most 3 semantic type roles in its default state.
- **Mobile grid contract** — 4 columns at mobile, 8 at tablet, 12 at desktop. No element exceeds its column span.
- **Motion for orientation only** — Stagger on first paint; no animation on filter changes.

---

## 1. Page Layout — Before / After

### Current layout (all viewports)
```
┌────────────────────────────────────────────────┐
│ PageShell: "Events"                            │
├────────────────────────────────────────────────┤
│ Hero Card (6 lines + 2 buttons)                │  ← ~120px
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │ Search input + Search button               │ │
│ │ DateRangePicker   | This week | This month │ │
│ │                   | Upcoming  | Clear      │ │
│ │ Visibility select | Sort select            │ │
│ │ [List] [Month] [Agenda]                    │ │
│ └────────────────────────────────────────────┘ │  ← ~280px filter panel
├────────────────────────────────────────────────┤
│ Event cards (3-col grid / 7-col calendar)      │  ← finally visible ~400px down
├────────────────────────────────────────────────┤
│ Pagination / Quick Preview                     │
└────────────────────────────────────────────────┘
```

**Problem:** On a 375px × 667px phone screen, the hero + filter panel occupies the entire viewport. Events are invisible without scrolling. On desktop, 13 interactive controls compete for attention before any content appears.

### Target layout (desktop ≥1024px)
```
┌────────────────────────────────────────────────┐
│ PageShell: "Events"                            │
│ subtitle: "Discover upcoming sessions."        │
├────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐  ┌───────────┐│
│ │ 🔍 Search events...        │  │ ⚙ Filters ││
│ └─────────────────────────────┘  └───────────┘│
│ [List]  [Month]  [Agenda]      Sort: Date ↑   │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Event 1  │  │ Event 2  │  │ Event 3  │     │
│  │ Apr 5    │  │ Apr 12   │  │ Apr 19   │     │
│  │ Open ●   │  │ Open ●   │  │ Closing ●│     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Event 4  │  │ Event 5  │  │ Event 6  │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │
│  ← Previous    Page 1    Next →                │
└────────────────────────────────────────────────┘
```

### Target layout (mobile <768px)
```
┌──────────────────────────┐
│ Events                   │
│ Discover upcoming...     │
├──────────────────────────┤
│ 🔍 Search events...     │
│ [List] [Month] [Agenda]  │
│ [⚙ Filters]              │  ← collapsed
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ Event 1              │ │
│ │ Apr 5 · Open         │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Event 2              │ │
│ │ Apr 12 · Open        │ │
│ └──────────────────────┘ │
│ ...                      │
│ ← Previous  Page 1  → │
└──────────────────────────┘
```

**Key changes:**
1. Hero card removed entirely. PageShell subtitle handles the welcome message.
2. Search input is always visible — it's the primary interaction.
3. All other filter controls (date range, quick filters, visibility, sort) collapse behind a "Filters" toggle button.
4. View toggle (List/Month/Agenda) and sort are a compact toolbar row.
5. Events are visible within the first ~120px of content area on mobile.

---

## 2. Filter Bar — Progressive Disclosure

### Compact bar (default state, always visible)
```tsx
<div className="flex flex-wrap items-center gap-2">
  {/* Search — always visible */}
  <form className="flex flex-1 min-w-[200px] gap-2">
    <Input placeholder="Search events..." />
    <Button type="submit" intent="primary" size="sm">Search</Button>
  </form>

  {/* Filters toggle — reveals panel */}
  <Button intent="secondary" size="sm" onClick={toggleFilters}>
    <SlidersHorizontal className="size-4 mr-1.5" />
    Filters
    {activeFilterCount > 0 && (
      <Badge className="ml-1.5">{activeFilterCount}</Badge>
    )}
  </Button>
</div>
```

### Expanded filter panel (on toggle)
When the user clicks "Filters", an inline `<Collapsible>` section opens below:

```tsx
<Collapsible open={filtersOpen}>
  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <DateRangePicker label="Date range" ... />
    <Select label="Status" ... />
    <Select label="Sort" ... />
    <div className="flex flex-wrap gap-2 items-end">
      <Button size="sm" intent="secondary">This week</Button>
      <Button size="sm" intent="secondary">This month</Button>
      <Button size="sm" intent="secondary">Clear all</Button>
    </div>
  </div>
</Collapsible>
```

**Filter count badge:** When any non-default filter is active (date range set, status ≠ "upcoming", sort ≠ "date-asc"), the Filters button shows a count badge so users know hidden filters are applied.

**Rationale (Krug):** "Happy talk must die." The user came to find an event, not to configure a dashboard. Show the search box, hide the rest until requested.

---

## 3. View Toolbar — Compact Toggle Row

### Current
Three full-size `<Button>` elements labeled "List", "Month", "Agenda" stacked below the filter panel.

### Target
A `ToggleGroup` component (shadcn/Radix) in a single compact row alongside the sort control:

```tsx
<div className="flex items-center justify-between mt-2">
  <ToggleGroup type="single" value={view} onValueChange={setView}>
    <ToggleGroupItem value="list" aria-label="List view">
      <List className="size-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="month" aria-label="Calendar view">
      <CalendarDays className="size-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="agenda" aria-label="Agenda view">
      <ListOrdered className="size-4" />
    </ToggleGroupItem>
  </ToggleGroup>

  <Select value={sort} onValueChange={setSort} size="sm">
    <SelectItem value="date-asc">Earliest first</SelectItem>
    <SelectItem value="date-desc">Latest first</SelectItem>
    <SelectItem value="status">By status</SelectItem>
  </Select>
</div>
```

**Rationale:** Icon toggles are smaller, universally understood (Gmail, Google Calendar, Outlook all use this pattern), and eliminate a full row of button text.

---

## 4. EventCard — Simplified Hierarchy

### Current card anatomy (7–9 type roles)
```
┌─────────────────────────────────────────┐
│ Title (link, type-title)     [Open ●]   │  role 1, 2
│ Free (badge, type-meta)                 │  role 3
│ Apr 5 – Apr 12 (type-body-sm)           │  role 4
│ America/New_York (type-meta)            │  role 5
│ Starts in 3 days (type-meta)           │  role 6
│ Virtual · https://... (type-meta)       │  role 7
│ [Capability badge] (type-meta)          │  role 8
│ Description text clamp 2... (type-b-sm) │  role 9
└─────────────────────────────────────────┘
```

### Target card anatomy (3 type roles)
```
┌─────────────────────────────────────────┐
│ Apr 5 – Apr 12                          │  role 1: type-meta (date)
│ Event Title Here                        │  role 2: type-title (name)
│ Open ● · Starts in 3 days              │  role 3: type-meta (status)
└─────────────────────────────────────────┘
```

**What moved:**
- **Free badge** → visible only when `isCommunity` is true, appended to the status line as a subtle label
- **Timezone** → removed from card; shown on event detail page and in Quick Preview (if retained)
- **Location** → removed from card; shown on event detail page
- **Capability badge** → removed from card; shown on event detail page
- **Description** → removed from card; the title is the discovery hook

**Design rationale:**
- Date leads because it's the primary scanning dimension for a time-based listing.
- Title is the click target — large, prominent, linked.
- Status + relative time gives urgency context without requiring a separate line.
- Everything else is detail that belongs on the event detail page. A card is a preview, not a detail view. (Krug: "Get rid of half the words on each page, then get rid of half of what's left.")

### Card spacing
- Padding: 16px (spec minimum)
- Gap between lines: 4px
- Card has `hover:border-border-strong` for interaction hint
- Status pill uses semantic colors (success/warning/info) as today

---

## 5. Month View — Responsive Fallback

### Current (all viewports)
A 7-column grid (`grid-cols-7`) with day cells containing event title buttons.

### Target

**Desktop (≥768px):** 7-column calendar grid (unchanged behavior, refined styling):
```
┌───┬───┬───┬───┬───┬───┬───┐
│Mon│Tue│Wed│Thu│Fri│Sat│Sun│  ← column headers (new)
├───┼───┼───┼───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │
│   │   │   │Ev1│   │   │   │
├───┼───┼───┼───┼───┼───┼───┤
│ 8 │...                     │
└───┴───────────────────────────┘
```

Additions:
- Day-of-week column headers ("Mon"–"Sun")
- Minimum cell height: 80px (not 96px — denser grid)
- Event chips use `type-meta` only, no border — just background tint

**Mobile (<768px):** Agenda-style date-grouped list (reuse agenda view renderer):
```
┌──────────────────────────┐
│ ◄ March 2026 ►           │
├──────────────────────────┤
│ Thu, Mar 5                │
│ ┌──────────────────────┐ │
│ │ Workshop: AI Pairing  │ │
│ │ 2:00 PM – 4:00 PM    │ │
│ └──────────────────────┘ │
│                          │
│ Fri, Mar 12              │
│ ┌──────────────────────┐ │
│ │ Leadership Briefing   │ │
│ │ 10:00 AM – 11:00 AM  │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Rationale:** A 7-column grid cannot fit in 4 columns (375px ÷ 16px gutters). Rather than forcing a broken layout, we detect the breakpoint and render the familiar agenda pattern. This follows the Swiss grid contract: mobile = 4 columns, and 7 calendar columns don't fit.

---

## 6. Hero Card — Removal

### Current
```tsx
<div className="mb-8 surface-elevated p-6 rounded-lg border border-border-subtle">
  <h2 className="type-title text-text-primary mb-2">Field Work & Live Sessions</h2>
  <p className="...">Our events are where we test new frameworks...</p>
  <Button intent="primary">View Upcoming Events</Button>
  <Link className="inline-flex...">Submit a Field Report</Link>  ← inline styles
</div>
```

### Target
**Remove entirely.** The PageShell already renders the page title ("Events") and subtitle. Two actions are rehomed:

1. **"View Upcoming Events"** — The default filter state already shows upcoming events. This button is redundant.
2. **"Submit a Field Report"** — Move to the view toolbar as a secondary action:

```tsx
<div className="flex items-center justify-between mt-2">
  <ToggleGroup ...>{/* view toggles */}</ToggleGroup>
  <div className="flex items-center gap-2">
    <Button asChild intent="secondary" size="sm">
      <Link href="/studio/report">Submit report</Link>
    </Button>
    <Select ...>{/* sort */}</Select>
  </div>
</div>
```

This keeps the CTA accessible without dedicating 120px of vertical space to a marketing block.

---

## 7. Quick Preview Card — Removal

### Current
A `<Card>` at page bottom showing selected event's title, time range, timezone, and a "View" link.

### Target
**Remove for V1.** The simplified EventCard still provides title, date, and status — enough for discovery. Clicking the card goes to the detail page. If user research later reveals demand for an inline preview, it should be a slide-over panel (desktop) or bottom sheet (mobile), not an appended card.

---

## 8. Inline Styles → Button Primitive

### Current (hero "Submit a Field Report" link, line ~210)
```tsx
<Link
  href="/studio/report"
  className="inline-flex items-center justify-center rounded-md text-sm font-medium
             transition-colors focus-visible:outline-none focus-visible:ring-2
             ... border border-border-subtle bg-surface hover:bg-surface-hover
             text-text-primary px-4 py-2"
>
  Submit a Field Report
</Link>
```

### Target
```tsx
<Button asChild intent="secondary" size="sm">
  <Link href="/studio/report">Submit report</Link>
</Button>
```

Uses the `asChild` + `Slot` pattern established in Sprint 19.

---

## 9. Metadata Migration

### Current (`page.tsx`)
```tsx
export const metadata: Metadata = {
  title: "Events",
  openGraph: { title: "Events" },
  alternates: { canonical: "/events" },
};
```

### Target
```tsx
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Events",
  description: "Discover upcoming Studio Ordo workshops, leadership briefings, and community events.",
  path: "/events",
});
```

This ensures consistent OG image, Twitter card, and canonical URL generation.

---

## 10. Motion — First Load Only

### Current
```tsx
<StaggerContainer className="grid gap-3 ...">
  {events.map(e => <StaggerItem key={e.id}><EventCard .../></StaggerItem>)}
</StaggerContainer>
```
Every filter change or page navigation triggers the stagger animation.

### Target
Track whether this is the initial render:

```tsx
const isFirstRender = useRef(true);
useEffect(() => { isFirstRender.current = false; }, []);

// In render:
const Container = isFirstRender.current ? StaggerContainer : "div";
const Item = isFirstRender.current ? StaggerItem : "div";
```

After first render, cards appear instantly. Respects `prefers-reduced-motion` via existing `StaggerContainer` internals.

---

## 11. Component Decomposition Map

### Current: 1 file, 529 lines

```
page-client.tsx (529 lines)
  └── everything
```

### Target: 6 focused modules

```
page-client.tsx (~100 lines)        — composition shell, URL state, data fetch
components/events/
  events-filter-bar.tsx (~80 lines) — search input, Filters toggle, collapsible panel
  events-view-toolbar.tsx (~50 lines) — ToggleGroup + sort + report link
  events-list-view.tsx (~60 lines)  — 3-col grid of EventCards + pagination
  events-month-view.tsx (~80 lines) — responsive calendar/agenda hybrid
  events-agenda-view.tsx (~50 lines) — date-grouped list
  event-card.tsx (revised, ~60 lines) — simplified 3-role card
```

Each module:
- Receives data and callbacks via props (no direct URL state access)
- Has its own test file
- Is < 150 lines

---

## Accessibility Notes

- **Filter disclosure:** `<Collapsible>` uses `aria-expanded` on the trigger button. Filter panel has `role="region"` with `aria-label="Event filters"`.
- **ToggleGroup:** Radix ToggleGroup provides `role="radiogroup"` and arrow-key navigation.
- **Sort select:** Maintains existing keyboard support via shadcn Select.
- **EventCard:** Title link remains the primary focusable element. Status pill is decorative (color is paired with text label per spec §4).
- **Month view mobile fallback:** Ensures all events are reachable via keyboard in the list-based layout.
- **Focus ring:** All interactive elements use `--focus-ring` token.
