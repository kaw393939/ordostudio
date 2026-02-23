# Cross-Cutting UX Critical Findings (Forensic Pass)

This document captures high-priority usability and safety failures found across authenticated and unauthenticated routes.

## Priority 0 — Must fix immediately

### 1) Account deletion has no confirmation gate
- Route: `/account`
- Current behavior: Clicking `Delete account` immediately issues destructive request.
- Why this is severe: irreversible/destructive action without confirmation violates core usability safety principles and user trust.
- Required fix:
  - Add explicit confirmation modal with typed confirmation (`DELETE` or email re-entry).
  - Add second-step summary of consequences (data removed, retention policy, session termination).
  - Require final affirmative action in danger styling.

## Priority 1 — High risk / high confusion

### 2) Privileged admin mutations lack protective confirmation
- Routes: `/admin/users`, `/admin/events/[slug]/registrations`
- Risk: accidental role/status changes and bulk cancellation/check-in mistakes.
- Required fix: confirmation dialogs with affected entity list and impact summary.

### 3) Audit/investigation workflows are too error-prone
- Route: `/admin/audit`
- Risk: raw ISO date filters and unstructured metadata slow incident response.
- Required fix: validated date-time pickers, presets, severity highlighting, metadata prioritization.

### 4) Export governance affordance needs stronger privacy signaling
- Route: `/admin/events/[slug]/export`
- Risk: users can misread sensitivity of include-email option.
- Required fix: explicit privacy warning state + export receipt metadata.

## Priority 2 — Significant friction

### 5) Form and control consistency gaps across auth pages
- Routes: `/login`, `/register`
- Risk: avoidable input errors and lower trust from inconsistent UI language.

### 6) Dense control surfaces in event discovery/admin pages
- Routes: `/events`, `/admin/events`
- Risk: slower decision-making, especially for new users.

### 7) Legal pages too sparse for trust and compliance clarity
- Routes: `/privacy`, `/terms`
- Risk: reduced confidence and weak policy discoverability.

## “Don’t make me think” rewrite checklist
- Every destructive action requires progressive disclosure and explicit confirmation.
- Every privileged action displays affected target and consequence before commit.
- Every async action returns durable, scannable outcome feedback.
- Every high-density page has a clear visual hierarchy of primary vs secondary actions.
- Every legal/policy page offers plain-language summary + structured details.

## Suggested implementation order
1. `/account` destructive confirmation gate (P0)
2. Admin mutation confirmations + batch action summaries (P1)
3. Audit page filter/triage upgrades (P1)
4. Export compliance signaling upgrades (P1)
5. Auth flow consistency and recovery affordances (P2)
6. Discovery/admin density and IA refinements (P2)
7. Terms/privacy content architecture expansion (P2)
