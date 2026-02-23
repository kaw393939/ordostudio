# Sprint 45–52 — UI Modernization Program (shadcn + Forms + Date/Calendar UX)

## Status (2026-02-21)
This document is an umbrella program wrapper. The work shipped through the individual sprints below, which are already completed in `project_management/sprints/completed/`:
- Sprint 45 — shadcn foundation: `sprint-45-shadcn-foundation-token-interop.md`
- Sprint 46 — form field system: `sprint-46-form-field-system-validation-ux.md`
- Sprint 47 — date/time inputs: `sprint-47-date-time-inputs-timezone-invariants.md`
- Sprint 48 — public events + registration date UX: `sprint-48-public-events-registration-date-ux.md`
- Sprint 49 — account follow-up + reminders: `sprint-49-account-followup-date-reminder-ux.md`
- Sprint 50 — admin scheduling/calendar ops: `sprint-50-admin-scheduling-calendar-operations.md`
- Sprint 51 — safety + accessibility hardening: `sprint-51-action-safety-accessibility-hardening.md`
- Sprint 52 — regression gates + flags/rollout: `sprint-52-regression-gates-flags-rollout-release.md`

Current repo gates are green (lint/tests/build).

## Vision
Transform the application into a world-class, beautiful, and effortless experience—the kind of product people show to colleagues because it *feels* good to use. Every interaction should be intentional, every transition smooth, every error recoverable, and every date unambiguous.

## Goal
Execute a comprehensive UI modernization program that delivers a polished, accessible, delightful interface across all public, account, and admin surfaces with special depth on form-heavy and calendar/date-heavy workflows.

## Design Principles
1. **Clarity over cleverness** — Every element earns its pixels. Labels, spacing, and hierarchy guide the eye without requiring thought.
2. **Responsive by default** — Mobile-first layouts that scale gracefully to wide screens; touch targets ≥ 44px.
3. **Motion with purpose** — Subtle Framer Motion transitions for page/section entry, skeleton shimmer for loading, and micro-interactions for feedback—never gratuitous animation.
4. **Progressive disclosure** — Show only what's needed now; reveal complexity through expandable sections, popovers, and command palettes.
5. **Dark mode as a first-class citizen** — Explicit toggle, not just `prefers-color-scheme`; every surface tested in both modes.
6. **Generous whitespace** — Breathing room between sections, inside cards, around form fields; density only where operators explicitly need it.
7. **Instant feedback** — Optimistic UI for mutations, toast notifications for async outcomes, inline validation before submit.
8. **Zero-ambiguity dates** — Every date displayed with contextual timezone, relative-time helpers, and locale-aware formatting.

## Current State — Audit Findings (Input to This Program)
A comprehensive code-level UI audit revealed the following systemic issues that this program must resolve:

| Finding | Severity | Where | Sprint |
|---------|----------|-------|--------|
| **Placeholder-heavy forms** — fields rely on placeholder text instead of persistent labels; labels disappear on focus, causing accessibility and recall failures. | P0 | Login, Register, Admin event/user edit, Intake forms | 46 |
| **Browser `prompt/confirm` for destructive actions** — admin delete/disable flows use native dialogs with no styling, no undo, and poor keyboard UX. | P0 | Admin users, Admin events, Account cancellations | 51 |
| **Inconsistent primitive usage** — some pages use shared `<Button>`/`<Card>`, others use raw `<button>`/`<div>` with inline styles. No guardrail prevents drift. | P1 | Across all surfaces | 45 |
| **Missing loading/error/empty state trinity** — many async views show blank screens during load, no error recovery UI, and no empty-state guidance. | P1 | Events list, Account, Admin lists, Audit log | 45, 48, 49, 50 |
| **Sparse legal/trust pages** — Privacy Policy and Terms of Service pages are placeholder stubs, undermining user trust and compliance posture. | P1 | `/privacy`, `/terms` | 51 |
| **Admin discoverability** — flat navigation with no breadcrumbs, no search, and no quick-nav makes finding features slow for power users. | P1 | All admin pages | 50 |
| **No explicit dark-mode toggle** — dark mode is OS-preference-only; users cannot override within the app. | P2 | Global | 45 |
| **No error boundary or branded error pages** — unhandled exceptions show Next.js default error page; no custom 404/500. | P2 | Global | 51 |
| **Inconsistent date display** — some dates are raw ISO strings, others "X days ago" with no tooltip, others formatted differently per page. | P2 | Events, Account timeline, Admin lists | 47, 48 |
| **No canonical icon usage** — Lucide icons used ad-hoc with no standard mapping; same concept represented by different icons on different pages. | P2 | Across all surfaces | 45 |

## Icon System Decision
**Lucide React** (already installed, v0.574.0) is the canonical icon library. No Font Awesome or additional icon packages.
- Lucide is shadcn/ui's default; consistent stroke weight, tree-shakable, MIT-licensed, 1,500+ icons.
- Sprint 45 establishes a canonical icon map so the same concept always uses the same icon app-wide.

## Program Tracks
- **Track A — Design System Foundation**: shadcn/ui init, token mapping, dark-mode toggle, animation primitives, Lucide icon map, component catalog, `cn()` utility, existing-component migration matrix.
- **Track B — Form Excellence**: placeholder-to-label migration, shared field system, multi-step wizards, auto-save drafts, search/combobox, file upload with preview, character counts, unsaved-changes guard.
- **Track C — Calendar & Date Mastery**: date/time/range pickers, timezone invariants, relative-time display, recurring patterns, smart defaults, "Add to Calendar" export.
- **Track D — Public Experience Polish**: event cards with skeleton loading, countdown timers, visual timeline/calendar view, responsive discovery, rich empty states, services page refresh, SEO meta.
- **Track E — Account & Engagement UX**: progress rings, notification badges, inline editing, drag-to-reorder priority, overdue escalation visuals, registration history improvements.
- **Track F — Admin Command Center**: calendar grid view (month/week/day), drag-to-schedule, conflict detection, batch operations, print-friendly exports, admin command palette, sidebar/breadcrumb navigation, audit log UX.
- **Track G — Safety & Accessibility**: WCAG 2.2 AA compliance, focus management, reduced-motion support, undo patterns, toast system, skip-nav links, high-contrast mode, error boundaries, custom 404/500 pages, legal/trust page content.
- **Track H — Release Engineering**: visual regression screenshots, Core Web Vitals budgets, feature flags, design system docs page, rollback playbook, SEO audit.

## Planned Sprint Sequence
1. **Sprint 45** — shadcn foundation, dark-mode toggle, animation system, component catalog.
2. **Sprint 46** — form field system, validation UX, search/combobox, multi-step patterns.
3. **Sprint 47** — date/time input system, timezone invariants, relative-time, range pickers.
4. **Sprint 48** — public events discovery, registration date UX, countdown, "Add to Calendar".
5. **Sprint 49** — account follow-up date UX, progress tracking, inline editing, notifications.
6. **Sprint 50** — admin calendar grid, drag-to-schedule, batch ops, conflict visualization.
7. **Sprint 51** — destructive-action safety, toast/undo, WCAG 2.2 AA, reduced-motion, skip-nav.
8. **Sprint 52** — visual regression, Core Web Vitals budgets, feature flags, docs, release.

## Cross-Sprint Invariants
- No date stored or transmitted without explicit format/zone semantics.
- Every form control includes a **persistent visible label** (never placeholder-only); help text where applicable; accessible error messaging.
- Keyboard-only and screen-reader completion path for all critical forms and date interactions.
- No browser-native `prompt/confirm` UX in privileged or destructive actions.
- New UI surfaces use shared primitives; no one-off styling islands. Raw `<button>`/`<input>`/`<select>` outside `src/components/ui` is prohibited.
- Every new component works in both light and dark mode.
- Every async view implements the **loading → error → empty → data** state trinity (skeleton → error boundary → empty state → content).
- Animations respect `prefers-reduced-motion`.
- Touch targets ≥ 44px on all interactive elements.
- Icons use Lucide React exclusively; canonical icon map governs which icon represents each concept.
- Core Web Vitals budgets: LCP < 2.5s, INP < 200ms, CLS < 0.1.

## Exit Gate (Program)
Move this program to completed only when Sprint 45–52 acceptance criteria pass, Lighthouse scores meet budgets, visual regression screenshots are baselined, and release checklist is signed off.
