# Usability, Menu, and SEO Audit (2026-02-17)

## Scope
- Public and admin navigation consistency
- Menu maintainability and extensibility
- Crawlability/discovery (`robots.txt`, `sitemap.xml`)
- Lighthouse quality for authenticated and unauthenticated paths

## What Was Audited
- Layout nav surfaces:
  - `src/app/(public)/layout.tsx`
  - `src/app/(admin)/layout.tsx`
- Menu system:
  - `src/lib/navigation/menu-registry.ts`
  - `src/lib/navigation/use-menu.ts`
  - `src/components/navigation/menu-nav.tsx`
- SEO discovery:
  - `src/app/robots.ts`
  - `src/app/sitemap.ts`
- Lighthouse runner:
  - `scripts/run-lighthouse.mjs`

## Findings and Improvements

### 1) Navigation Maintainability
**Finding**: Menus were previously hard-coded in multiple places.

**Improvement delivered**:
- Centralized menu registry with typed menu entries and audience model.
- Added `registerMenu(...)` validation to catch invalid menu definitions early.
- Added duplicate ID/HREF guardrails in registry registration.

**Impact**:
- New pages can be registered once and reflected consistently.
- Nav changes are safer and testable.

### 2) Role-Aware Menu UX
**Finding**: Public/admin nav items required session-aware visibility.

**Improvement delivered**:
- Implemented audience-aware rendering (`guest`, `user`, `admin`).
- Added non-erroring nav context endpoint (`/api/v1/nav/context`) so menu lookups do not emit 401 noise in browser console.

**Impact**:
- Cleaner runtime behavior.
- Better user affordance based on role.

### 3) SEO Discovery
**Finding**: Event discoverability should be automated.

**Improvement delivered**:
- Dynamic sitemap includes static public pages + published events.
- `robots.txt` references `sitemap.xml`.

**Impact**:
- Crawlers discover event pages via sitemap.
- SEO workflow aligns with dynamic content.

### 4) Accessibility
**Finding**:
- Admin forms/tables had missing labels and low-contrast empty-state text.

**Improvement delivered**:
- Added explicit labels for admin event and user filter controls.
- Improved empty-state text contrast in admin tables.

**Impact**:
- Better Lighthouse accessibility outcomes.
- Better keyboard/screen-reader clarity.

## Lighthouse Status
- Auth-aware auditing is active (unauthenticated, authenticated user, authenticated admin).
- Route coverage includes public pages, legal pages, account, and key admin flows.
- Current results are written to `tmp/lighthouse/summary.md` and `tmp/lighthouse/summary.json`.

## Remaining Risk / Practical Constraint
- Absolute/perfect 100 on **every** page and category can fluctuate due lab variance and framework/runtime factors (especially Performance).
- The current approach targets repeatable high scores with production-mode auditing, strict preflight checks, and seeded deterministic content.

## Recommended Next Steps
1. Keep Lighthouse runs in production mode only (`next start`) for release gates.
2. Track deltas over time in CI by archiving `summary.json` artifacts.
3. Add optional “performance-budget” assertions by route type (public listing/detail/admin).
4. Continue reducing client-side JS in shared layouts to improve home-page LCP and TTI.
