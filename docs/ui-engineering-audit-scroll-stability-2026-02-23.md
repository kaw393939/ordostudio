# UI Engineering Audit — Scroll Stability & Responsiveness

Date: 2026-02-23

Goal: eliminate “scroll jump” and other janky behaviors during navigation and interaction.

---

## Reported symptom

- “Content scroll jumps when clicked.”

This is typically caused by one of:
1) **Programmatic focus** without `preventScroll`
2) **Scroll anchoring** fighting layout changes (sticky headers, expanding sections)
3) **Route transitions** forcing scroll restoration unexpectedly

---

## Findings (code)

### F1 — Route announcer focuses an off-screen element on every navigation

File: `src/components/route-announcer.tsx`

Behavior:
- On pathname change, it calls `.focus()` on an `sr-only` element.
- Browser may scroll to make the focused node “visible”, producing a perceived jump.

Fix:
- Focus with `{ preventScroll: true }` and fallback to `.focus()`.

### F2 — Calendar auto-focus can trigger scroll jumps

File: `src/components/ui/calendar.tsx`

Behavior:
- When a day is marked `focused`, the component calls `.focus()` on the day button.
- On long pages (e.g. `/admin/events`), this can yank scroll position.

Fix:
- Focus with `{ preventScroll: true }` and fallback to `.focus()`.

### F3 — Admin menu navigation was triggering Next.js auto-scroll

Files:
- `src/components/navigation/menu-nav.tsx`
- `src/components/admin/admin-shell.tsx`

Behavior:
- Next.js `Link` defaults to scrolling to the top on route navigation.
- In admin, this feels like a “jump” when switching between menu items after scrolling.

Fix:
- For admin navigation only (admin quick menu, admin sidebar, command palette), use `scroll={false}` / `router.push(href, { scroll: false })`.
- Public header/footer navigation keeps default scroll-to-top.

### F4 — Select dropdowns should never reflow the page

File:
- `src/components/ui/select.tsx`

Behavior:
- If a Select’s content is not consistently positioned as a popover, opening it can change document layout.
- Layout changes during interaction can present as a “vertical jump” (scroll anchoring + reflow).

Fix:
- Default Select content to popper positioning (`position="popper"`, `align="start"`).
- Remove any styling that could force the content into the normal document flow.

### F5 — Public header/menu layout shift (badge + theme toggle)

File:
- `src/components/navigation/menu-nav.tsx`

Behavior:
- Badge count loads after hydration and may appear/disappear.
- Theme toggle may appear based on feature flags.
- With `flex-wrap` layouts, these width changes can cause header re-wrapping, shifting page content vertically.

Fix:
- Always reserve space for the dashboard badge (render invisible placeholder when count is 0).
- Reserve a fixed `size-9` slot for the theme toggle in header variant.

---

## QA protocol (manual)

Test these flows with the mouse and keyboard:

### Admin navigation
1) Visit `/admin/deals`
2) Scroll mid-page
3) Click between admin quick links (Deals/Intake/Ledger/Newsletter)
4) Ensure scroll position is preserved (no auto scroll-to-top) when switching between admin pages.

### Cockpit interactions
1) In Deals/Intake/Ledger cockpits, scroll mid-page
2) Click queue items repeatedly
3) Ensure selection/focus does not yank scroll position.

### Mobile
1) Open sidebar drawer
2) Click a nav link
3) Drawer should close without pushing content down; content should not jump.

---

## QA protocol (automated)

We currently have page-export smoke coverage. For scroll stability, consider adding a small Playwright spec that:
- navigates between admin pages,
- records `window.scrollY` before/after a click,
- asserts changes are expected.

---

## Open items

- If any remaining jumps persist after the focus fix, check:
  - sticky header height changes
  - `details` expanding above the viewport
  - any remaining `.focus()` calls (calendar widgets, dialogs)
