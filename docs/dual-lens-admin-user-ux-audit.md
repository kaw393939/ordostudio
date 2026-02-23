# Dual-Lens UX Audit: Admin + Registered User Experience

Date: 2026-02-17

Audit lenses:
- Lens A (clarity-first): instant comprehension, obvious actions, low cognitive load
- Lens B (systems-first): consistency, scalable interaction patterns, maintainable IA

## Executive Summary

The platform is in a strong state for reliability and quality gates (including Lighthouse), but there are still usability improvements that would significantly reduce operator/user friction in daily use.

Top strengths:
- Navigation is now centralized and audience-aware.
- Error and empty states are broadly present.
- Core flows (events, registration, admin CRUD) are operationally complete.

Top gaps:
- Heavy reliance on placeholders instead of explicit labels in admin forms.
- Action discoverability for critical admin workflows is inconsistent.
- Long, dense tables/lists require extra scanning and manual memory.
- Account and event-detail flows need stronger “what happens next” guidance.

---

## Ranked Top 10 Issues (Impact-Ordered)

### 1) Admin create/edit forms rely on placeholder-only fields in key paths
- Areas: `/admin/events`, `/admin/events/[slug]`, `/admin/audit`
- User impact: operators must infer meaning; error-prone when moving fast.
- Recommendation: explicit labels + helper text for ISO date/timezone/capacity semantics.
- Acceptance criteria:
  - Every input/select has visible label text.
  - Date/time fields include format helper copy.
  - No placeholder-only meaning.

### 2) Admin home is underpowered as a command center
- Area: `/admin`
- User impact: weak first-stop orientation and low task launch efficiency.
- Recommendation: replace scaffold text with actionable cards: Events, Users, Audit, and “Recent critical actions”.
- Acceptance criteria:
  - Admin home shows 3–5 task tiles with clear outcomes.
  - Time-to-first-task < 1 click from admin home.

### 3) User list workflow is “load-then-manage” instead of progressive exploration
- Area: `/admin/users`
- User impact: unnecessary interaction cost and context switching.
- Recommendation: auto-load on first render, keep explicit refresh, preserve selected user while filtering.
- Acceptance criteria:
  - Initial list appears without manual “Load users”.
  - Selected user persists unless excluded by filter.

### 4) Event creation and event management are co-located without visual hierarchy
- Area: `/admin/events`
- User impact: mixed intent (create vs manage) increases cognitive load.
- Recommendation: stronger section hierarchy and progressive disclosure for creation fields.
- Acceptance criteria:
  - Create section visually distinct and collapsible.
  - Discovery controls remain primary above fold.

### 5) Event detail page lacks explicit field semantics and validation affordances
- Area: `/admin/events/[slug]`
- User impact: higher risk of malformed dates/capacity and uncertainty before save.
- Recommendation: inline constraints and per-field validation messaging.
- Acceptance criteria:
  - ISO format guidance shown under date fields.
  - Invalid values show immediate inline message before submit.

### 6) Account page puts destructive action too close to routine tasks
- Area: `/account`
- User impact: accidental anxiety and increased safety risk perception.
- Recommendation: isolate account deletion in a dedicated danger zone with confirmation step.
- Acceptance criteria:
  - Delete account requires explicit confirmation affordance.
  - Destructive controls visually separated from registration management.

### 7) Event detail action model is good, but state transitions need stronger explanatory copy
- Area: `/events/[slug]`
- User impact: users may not understand WAITLISTED/CHECKED_IN implications.
- Recommendation: status-specific microcopy (“What this means” + expected next update path).
- Acceptance criteria:
  - Each registration state includes one-line explanatory text.
  - Post-action confirmation includes next expected state behavior.

### 8) Audit log usability for high-volume operators is limited
- Area: `/admin/audit`
- User impact: difficult triage when logs are large.
- Recommendation: add sticky filter summary and quick-copy controls for request_id.
- Acceptance criteria:
  - Active filters always visible while scrolling.
  - Request id copy action available per row.

### 9) Table-heavy admin pages need stronger scan aids
- Areas: `/admin/users`, `/admin/audit`, registrations views
- User impact: slower parsing and higher oversight risk.
- Recommendation: tighter row grouping, status emphasis, and action affordance consistency.
- Acceptance criteria:
  - Status values visually distinct and consistent.
  - Row action location/pattern standardized across admin tables.

### 10) Navigation context is strong globally but weak at local-task level
- Areas: all admin detail pages
- User impact: “Where am I / where next?” sometimes requires backtracking.
- Recommendation: add local page context headers (“Event: {title}”, quick links).
- Acceptance criteria:
  - Detail pages include local action rail with top tasks.
  - Breadcrumb + local actions are both present and consistent.

---

## Admin-Specific Fix Backlog (Sprint-Ready)

### A1. Form Clarity Hardening
- Scope:
  - Add labels/helper text to event create/edit + audit filters
  - Add inline validation message primitives where absent
- Estimation: M
- Success metric: reduction in correction retries during manual QA scenarios

### A2. Admin Home as Task Hub
- Scope:
  - Replace placeholder content with action cards and short guidance
- Estimation: S
- Success metric: 1-click entry to primary admin workflows

### A3. Table Scanability Pass
- Scope:
  - Harmonize status chips, action placement, and row density in admin lists
- Estimation: M
- Success metric: faster operator completion in scripted checklist

### A4. Audit Triage Quality
- Scope:
  - Sticky filter summary, request-id copy utility, clearer timestamp context
- Estimation: S
- Success metric: reduced time to isolate a known request

---

## Registered-User Experience Backlog (Sprint-Ready)

### U1. Registration State Education
- Scope:
  - Add concise explanatory copy for each registration state on event detail + account
- Estimation: S
- Success metric: fewer support-style clarifications in user testing

### U2. Account Safety & Separation
- Scope:
  - Move delete-account into explicit danger subsection with confirmation UX
- Estimation: S
- Success metric: lower accidental-risk perception in review

### U3. “Next Action” Confidence Layer
- Scope:
  - Add explicit post-action expectation copy (e.g., waitlist behavior)
- Estimation: S
- Success metric: improved completion confidence in walkthroughs

---

## Recommended Implementation Plan (2 Sprints)

Sprint 1 (high-impact clarity):
1. A1 Form Clarity Hardening
2. U1 Registration State Education
3. U2 Account Safety & Separation
4. A2 Admin Home as Task Hub

Sprint 2 (operator efficiency):
1. A3 Table Scanability Pass
2. A4 Audit Triage Quality
3. U3 Next Action Confidence Layer

---

## Guardrails for Ongoing Quality
- Keep menu registration as single source of truth.
- Keep Lighthouse and usability checks in release gate.
- For every new admin form/table:
  - visible labels,
  - explicit status semantics,
  - consistent action placement,
  - empty/error/loading states.
