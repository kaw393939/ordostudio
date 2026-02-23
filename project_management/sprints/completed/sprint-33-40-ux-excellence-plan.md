# Sprint 33–40 — UX Excellence Program

## Goal
Deliver a premium, high-trust product experience with clear navigation, fast feedback, resilient recovery, and token-based theming.

## Program Scope
- Establish the frontend architecture foundation in Sprint 33A.
- Execute shell clarity pass in Sprint 33 on top of that foundation.
- Execute usability-focused product increments through Sprint 40.
- Keep all work aligned with HAL/HATEOAS affordances and governance rules.

## Global UX Standards (Applies to all Sprints)
- Every route segment has `loading.tsx` and `error.tsx`.
- Every async surface has loading, empty, error, and success feedback states.
- Public/Admin context is always obvious in shell and navigation.
- No hard-coded colors; semantic design tokens only.
- Keyboard-accessible completion for core tasks.

---

## Sprint 33A — Frontend Foundation (DRY + Clean Architecture)

### Goal
Establish reusable frontend architecture patterns to reduce refactoring in subsequent UX sprints.

### Scope
- Define semantic design token contracts and theme foundations.
- Scaffold component layers (primitives, patterns, layout, screen composition).
- Introduce view-model adapter boundary for API-to-UI normalization.
- Standardize loading/empty/error/success UX pattern components.
- Add consistency guardrails (naming/import boundaries/no hard-coded colors).

### Stories
- As a developer, I can build new screens from reusable patterns instead of ad hoc structures.
- As a design owner, I can evolve visual styling through tokens without feature rewrites.

### Acceptance Criteria
- Shared token system and pattern components are in place and documented.
- At least one representative screen uses adapter + pattern architecture end-to-end.
- Guardrails are active to discourage architecture drift during later sprints.

### End-of-Sprint Verification
```bash
npm run test -- ui-foundation design-system
npm run lint
npm run build
```
Manual checks:
- Verify token updates propagate consistently through primitives/patterns.
- Verify representative screen uses shared states and adapter boundary.

### Exit Gate
Move sprint only when foundation and guardrail criteria pass.

---

## Sprint 33 — Obviousness Pass (Navigation, Shell, Clarity)

### Goal
Users can instantly identify context and next actions.

### Scope
- Implement route group separation: `/(public)` and `/(admin)` with distinct layouts.
- Add admin header role/environment badges.
- Add breadcrumb pattern on detail pages.
- Add segment-level loading/error boundaries on major routes.

### Stories
- As a first-time user, I can quickly tell whether I’m in Public or Admin.
- As an operator, I receive clear feedback during loading/failure states.

### Acceptance Criteria
- User can answer “Am I in Admin or Public?” in <5 seconds.
- No major route shows blank screen while loading.
- Errors are isolated to page segment; shell remains usable.

### End-of-Sprint Verification
```bash
npm run test -- ui-shell navigation
npm run lint
npm run build
```
Manual checks:
- Validate public/admin shell differentiation on desktop and mobile.
- Trigger route-level error and verify containment.

### Exit Gate
Move sprint only when shell clarity and resilience criteria pass.

---

## Sprint 34 — Events Discovery Upgrade

### Goal
Users can find events quickly without guesswork.

### Scope
- Add search, sort, and filters to `/events` and `/admin/events`.
- Add admin status tabs (Draft, Published, Cancelled).
- Add URL-synced list state for search/filter/sort/page.
- Improve empty states with recovery CTA.

### Stories
- As a user, I can find an event in one to two quick actions.
- As an admin, I can share a filtered list view via URL.

### Acceptance Criteria
- Any known event can be found in ≤2 interactions.
- Shared URL reproduces same list view state.
- Empty state includes clear “Clear filters” or equivalent action.

### End-of-Sprint Verification
```bash
npm run test -- events-list filters sort
npm run lint
npm run build
```
Manual checks:
- Copy/paste URL with filters and verify restored state.
- Verify keyboard interaction for filter controls.

### Exit Gate
Move sprint only when findability and state-sharing behavior pass.

---

## Sprint 35 — Event Detail Action Clarity

### Goal
Event detail clearly communicates status and single primary next action.

### Scope
- Add dedicated Action Panel on event detail.
- Render primary CTA from HAL affordances (register/waitlist/cancel/none).
- Add clear status chips (Registered, Waitlisted, Cancelled, Checked-in).
- Add immediate confirmation feedback (inline + toast).

### Stories
- As a user, I can instantly understand my registration status.
- As a user, I can complete the next action without searching the page.

### Acceptance Criteria
- Primary action is always visible on mobile and desktop.
- Status and next action are understandable at a glance.
- Mutation feedback resolves “did it work?” ambiguity.

### End-of-Sprint Verification
```bash
npm run test -- event-detail cta status
npm run lint
npm run build
```
Manual checks:
- Verify state transitions across register/cancel/waitlist flows.
- Verify affordance-driven action rendering.

### Exit Gate
Move sprint only when action clarity and feedback criteria pass.

---

## Sprint 36 — Calendar and Date UX

### Goal
Enable calendar-native planning and date clarity.

### Scope
- Add List ↔ Calendar toggle to event discovery surfaces.
- Deliver month + agenda views initially.
- Add quick preview interaction from calendar cells.
- Add ICS download on event detail.
- Improve timezone display (event tz + local context where relevant).

### Stories
- As a user, I can understand weekly/monthly schedule at a glance.
- As a user, I can add an event to my personal calendar reliably.

### Acceptance Criteria
- Users can identify this week’s events without opening each detail page.
- ICS export imports successfully into major calendar apps.
- Timezone presentation is explicit and consistent.

### End-of-Sprint Verification
```bash
npm run test -- calendar ics timezone
npm run lint
npm run build
```
Manual checks:
- Validate ICS open/import in Apple/Google calendar.
- Validate calendar/list parity for core metadata.

### Exit Gate
Move sprint only when calendar utility and date trust pass.

---

## Sprint 37 — Account Experience (My Registrations)

### Goal
Provide a reliable user home base for attendance confidence.

### Scope
- Expand `/account` with registrations list (upcoming first).
- Show status chips and event links.
- Allow cancellation from account when permitted.
- Standardize registration/cancellation confirmation pattern.

### Stories
- As a user, I can verify attendance without searching manually.
- As a user, I get consistent confirmation regardless of entry point.

### Acceptance Criteria
- Registration status is visible and understandable in account view.
- Cancel from event and account surfaces yields consistent UX.
- Confirmation includes direct path back to account state.

### End-of-Sprint Verification
```bash
npm run test -- account-registrations
npm run lint
npm run build
```
Manual checks:
- Register/cancel from both entry points and compare UX parity.
- Validate auth/session edge states.

### Exit Gate
Move sprint only when account confidence and parity criteria pass.

---

## Sprint 38 — Admin Operations Speed and Confidence

### Goal
Make admin workflows kiosk-fast and low-error.

### Scope
- Upgrade admin registrations screen with status-focused filtering/search.
- Add check-in mode optimized for fast repetitive actions.
- Add safe bulk actions where supported.
- Improve export UX with governance explanation and output preview.

### Stories
- As an admin, I can process attendee check-in quickly under pressure.
- As an admin, I understand export governance before downloading data.

### Acceptance Criteria
- Check-in operations support high-throughput workflow.
- Restricted export states explain next steps clearly.
- Bulk actions provide clear safeguards and feedback.

### End-of-Sprint Verification
```bash
npm run test -- admin-checkin admin-export
npm run lint
npm run build
```
Manual checks:
- Run a 50-attendee simulation workflow.
- Verify include-email governance messaging in non-local context.

### Exit Gate
Move sprint only when throughput and safety clarity criteria pass.

---

## Sprint 39 — Error and Recovery Pass

### Goal
Translate technical failures into human recovery flows.

### Scope
- Refactor Problem Details rendering into user-centered copy.
- Add clear next-action controls in error states.
- Add retry patterns for transient failures.
- Surface support/request ID as secondary detail.

### Stories
- As a user, I can recover from failures without guessing.
- As support, I can obtain diagnostics when needed.

### Acceptance Criteria
- Every primary error state provides a next step.
- Retry options exist for transient failure classes.
- Support code exists but does not dominate UI.

### End-of-Sprint Verification
```bash
npm run test -- problem-details recovery
npm run lint
npm run build
```
Manual checks:
- Simulate auth, conflict, and transient errors.
- Validate clarity of error headlines and actions.

### Exit Gate
Move sprint only when recovery confidence criteria pass.

---

## Sprint 40 — Performance and Accessibility Polish

### Goal
Ship a fast, stable, accessible experience across core journeys.

### Scope
- Expand streaming/skeleton strategy across major routes.
- Add navigation prefetch for likely next paths.
- Tune read endpoint cache strategy and rendering behavior.
- Complete keyboard/focus/aria pass on tables, forms, and dialogs.
- Add UX regression checklist to PR workflow.

### Stories
- As a user, the app feels responsive and stable.
- As a keyboard-only user, I can complete critical journeys.

### Acceptance Criteria
- Core journeys show measurable responsiveness improvement.
- Keyboard-only completion succeeds for core public/admin flows.
- No major layout shifts in key templates.

### End-of-Sprint Verification
```bash
npm run test -- a11y ui-regression
npm run lint
npm run build
```
Manual checks:
- Keyboard-only run of discover/register/check-in/export.
- Spot-check focus traps and return focus behavior in dialogs.

### Exit Gate
Move sprint only when performance and accessibility criteria pass.

---

## Program-Level Metrics
Track each sprint using:
- Task completion time (public registration, admin check-in)
- Error recovery success rate
- UI inconsistency bugs per sprint
- A11y violations in CI/manual audits
- Core Web Vitals trend on key pages

## Program Completion Gate
Program is complete when:
- Sprint 33–40 exit gates all pass.
- Architecture standards in `docs/frontend-architecture.md` are implemented.
- UX regression checklist is active and used in PR reviews.

## Continuation Program
Post-40 hardening sprints are defined in:
- `project_management/sprints/planning/sprint-41-44-usability-seo-hardening.md`
