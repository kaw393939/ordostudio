# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- **Action Feed** (Sprint 08): Dashboard feed showing upcoming events, required actions, and reminders with load-more pagination.
- **Information Architecture** (Sprint 09): Phase 5 route structure, sidebar variant for MenuNav, mobile drawer navigation.
- **Admin RBAC** (Sprint 10): Per-page role gating (`hasRequiredRole`, `roleAccessProblem`), SUPER_ADMIN-only telemetry and agent-ops pages, admin error/404 boundaries.
- **Responsive Design** (Sprint 11): iOS zoom fix for Select triggers, overflow-x-auto for admin tables, responsive typography scaling, 44px touch targets on mobile.
- **Empty States & Error Handling** (Sprint 12): Standardised all empty states to `EmptyState` pattern, replaced inline error divs with `ErrorState`, added `loading.tsx` for 8 additional routes, enhanced `ProblemDetailsPanel` with status-aware icons and 400/422 mapping.
- **Performance & Core Web Vitals** (Sprint 13): `next/font/google` with Inter and `font-display: swap`, `next/dynamic` for Countdown component, analytics stub (`src/lib/analytics.ts`).
- **Core Platform E2E Testing** (Sprint 14): Playwright E2E specs for public navigation, auth flows, and admin shell; visual QA guard tests for design-system compliance.

### Changed
- **User Navigation** reorganised: removed duplicate Dashboard/Account/Logout from header; consolidated into `UserSidebar` component (desktop sidebar + mobile dropdown).
- **ProblemDetailsPanel** now shows contextual icons (LogIn, ShieldAlert, Search, RefreshCw) based on HTTP status.
- **Admin error boundary** (`admin/error.tsx`) now uses `PageShell` for consistency with outer boundary.
- **CSS `--font-sans`** updated from missing Geist reference to `var(--font-inter)` with system-ui fallback.

### Fixed
- Suspense fallbacks in login/register pages upgraded from bare `<div>Loading...</div>` to `LoadingState` component.
- Account page inline `animate-pulse` skeleton replaced with standard `LoadingState`.
- ActionFeed error state replaced from raw `text-red-500 bg-red-50` div to proper `ErrorState` component.

### Infrastructure
- Visual regression suite (Playwright `toHaveScreenshot`) covering key public/admin routes across light/dark and multiple viewports.
- Feature flags (build-time + optional runtime overrides) with gating for higher-risk UI transitions.
- Lighthouse gating improvements: Core Web Vitals metric budgets (LCP/INP/CLS/TBT) and a public-route SEO score gate.
- Bundle-size gate script to track per-route initial JS (gzipped) for key public routes.
- Published design-system documentation.
