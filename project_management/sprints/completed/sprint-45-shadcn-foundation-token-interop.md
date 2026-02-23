# Sprint 45 — shadcn Foundation, Dark Mode, Animation System & Component Catalog

## Goal
Stand up a world-class design-system foundation: shadcn/ui primitives mapped to existing tokens, an explicit dark-mode toggle, purposeful animation primitives, and a living component catalog so every subsequent sprint builds on proven, beautiful building blocks.

## Scope

### shadcn/ui Initialization
- Run `npx shadcn@latest init` with CSS-variables mode for Next.js App Router.
- Configure `components.json` to target `src/components/ui`, use `@/` aliases, and set `lucide` as icon library.
- Confirm `cn()` utility (clsx + tailwind-merge) is the single class-merge function; remove any duplicates.

### Core Primitive Set (Phase 1)
Add the following shadcn components — these cover ~80% of UI needs before forms/dates:
- **Layout & feedback**: `card`, `separator`, `skeleton`, `scroll-area`, `sheet` (mobile drawer), `tooltip`, `popover`, `toast` (via Sonner).
- **Actions & navigation**: `button`, `dropdown-menu`, `tabs`, `badge`, `breadcrumb`, `command` (palette).
- **Data display**: `table`, `avatar`.
- **Overlays**: `dialog`, `alert-dialog`.

### Canonical Lucide Icon Map
Establish a single source-of-truth icon mapping so the same concept always shows the same icon. Audit found ad-hoc icon usage varying across pages.

| Concept | Icon | Usage |
|---------|------|-------|
| Success / Complete | `Check`, `CheckCircle` | Status badges, toast, inline confirmation |
| Error / Danger | `AlertCircle`, `XCircle` | Error states, destructive status |
| Warning / Caution | `AlertTriangle` | Approaching deadline, conflict |
| Info | `Info` | Help text, tooltips |
| Calendar / Date | `Calendar`, `CalendarDays` | Date pickers, event cards |
| Clock / Time | `Clock` | Time inputs, countdown, "Closing Soon" |
| User / Account | `User`, `Users` | Profile, admin user lists |
| Search | `Search` | Search inputs, command palette |
| Settings / Config | `Settings` | Admin settings |
| Trash / Delete | `Trash2` | Destructive delete actions |
| Edit / Pencil | `Pencil` | Inline edit, form edit |
| Plus / Create | `Plus`, `PlusCircle` | Create actions |
| Download / Export | `Download` | CSV export, `.ics` download |
| External link | `ExternalLink` | "Add to Google Calendar", external nav |
| Filter | `Filter`, `SlidersHorizontal` | List filters |
| Sort | `ArrowUpDown` | Table column sort |
| Chevrons | `ChevronLeft`, `ChevronRight`, `ChevronDown` | Navigation, dropdowns, pagination |
| Menu | `Menu` | Mobile hamburger |
| Close | `X` | Dialog/sheet close |
| Sun / Moon | `Sun`, `Moon` | Dark-mode toggle |
| Eye / EyeOff | `Eye`, `EyeOff` | Password show/hide |
| Undo | `Undo2` | Undo toast action |
| Loader | `Loader2` (animated spin) | Submit/loading state |

Doc this map in `/docs/icon-map.md` and reference it from the component catalog.

### Existing Component Migration Inventory
Audit found inconsistent primitive usage: some pages use shared `<Button>`/`<Card>`, others use raw HTML. Create a migration matrix:
- Inventory every existing local component in `src/components/` (e.g., `button.tsx`, `page-shell.tsx`, `problem-details.tsx`).
- Map each to its shadcn replacement or confirm it remains as a domain-specific wrapper.
- Mark raw `<button>`/`<input>`/`<select>` occurrences across all pages for migration in Sprint 46.
- Publish matrix in sprint completion record for tracking.

### Loading / Error / Empty State Trinity
Audit found blank screens during async loads and no error recovery UI. Establish the pattern:
- **Loading**: `<Skeleton>` shimmer matching the shape of expected content. Never a blank white/dark screen.
- **Error**: `<ErrorState>` component with icon (`AlertCircle`), message, and "Retry" button.
- **Empty**: `<EmptyState>` component with illustration placeholder, explanatory copy, and CTA.
- Every async data-fetching section must implement all three states.
- Create `<AsyncBoundary>` wrapper that orchestrates loading → error → empty → data rendering.

### Token Mapping
- Map shadcn semantic variables (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`) to existing CSS custom properties in `globals.css`.
- Preserve current palette as authoritative; shadcn tokens are aliases, not replacements.
- Add `--sidebar-*` tokens for future admin sidebar upgrade.

### Dark-Mode Toggle
- Add explicit light/dark/system toggle using `next-themes` (or lightweight cookie-based approach).
- Surface toggle in top navigation bar.
- Verify every new primitive renders correctly in both modes; add dark-mode visual snapshot tests.

### Animation Primitives
- Create shared Framer Motion variants: `fadeIn`, `slideUp`, `scaleIn`, `staggerChildren`.
- Add `<AnimatePresence>` wrapper for page transitions.
- Add `<Skeleton>` shimmer for every async-loaded section.
- Respect `prefers-reduced-motion` globally — animations become instant crossfades.

### Component Catalog (Dev Reference)
- Add a `/dev/catalog` route (excluded from production build) showing all primitives in all states and both color modes.
- Include variant matrix: default, hover, focus, disabled, error, loading for interactive components.

### Migration Guidelines
- Document when to use shadcn primitives vs legacy local components.
- Add ESLint rule or guardrail doc prohibiting new raw `<button>`, `<input>`, `<select>` elements outside `src/components/ui`.
- Add `<Breadcrumb>` component integrated into `<PageShell>` for consistent wayfinding across admin and multi-level public pages.
- All pages must set `<title>` and `og:title` via Next.js `metadata` exports for SEO and tab clarity.

## TDD Process
1. Write failing smoke tests that assert each new primitive is importable and renders without error.
2. Write failing tests for `cn()` merge behavior with conflicting classes.
3. Write failing tests for dark-mode toggle state persistence across navigation.
4. Write failing tests for animation variant application and reduced-motion bypass.
5. Write failing tests for `<AsyncBoundary>` rendering: loading → error → empty → data state progression.
6. Write failing tests for `<Breadcrumb>` rendering correct hierarchy from route segments.
7. Implement token mapping, primitives, dark mode, animation layer, and state-trinity components.
8. Refactor 2–3 existing components (e.g., `PageShell`, `Button`, `Card`) to consume new primitives.
9. Create component migration inventory and publish icon map doc.

## Stories
- As a developer, I can build beautiful UI faster using proven, consistent primitives and never guess at colors, spacing, or which icon to use.
- As a user, I can switch between light and dark mode and have every surface adapt seamlessly.
- As a reviewer, I can open the component catalog and verify every primitive state at a glance.
- As a user navigating admin pages, I see breadcrumbs that tell me exactly where I am.
- As a user waiting for data to load, I see a skeleton shimmer — never a blank screen.

## Acceptance Criteria
- [ ] shadcn is installed and configured; `components.json` committed.
- [ ] All Phase 1 primitives are generated in `src/components/ui/`.
- [ ] Token map in `globals.css` connects shadcn semantic vars to existing custom properties for both light and dark.
- [ ] Dark-mode toggle appears in navigation and persists preference.
- [ ] Framer Motion entry animations work on page transitions; skeletons display during loading.
- [ ] `prefers-reduced-motion` is respected (animations become instant).
- [ ] Component catalog route renders all primitives in all states.
- [ ] Canonical Lucide icon map documented in `/docs/icon-map.md`.
- [ ] `<AsyncBoundary>` handles loading/error/empty states; demonstrated on at least one async page.
- [ ] `<Breadcrumb>` renders hierarchy on admin pages.
- [ ] Component migration inventory published (local component → shadcn mapping).
- [ ] No visual regressions in existing pages (typography, spacing, color).
- [ ] Lint, tests, and build pass.

## End-of-Sprint Verification
```bash
npm run test -- src/components/** src/lib/**
npm run lint
npm run build
```
Manual checks:
- Toggle dark mode on home, events list, login, and one admin page. Confirm no broken surfaces.
- Visit `/dev/catalog` and verify all primitive states render.
- Enable `prefers-reduced-motion` in OS settings and confirm animations gracefully degrade.
- Inspect focus ring visibility on buttons, inputs, dialogs in both modes.

Pass condition:
- Foundation is rock-solid: beautiful defaults, two color modes, purposeful motion, living catalog.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
