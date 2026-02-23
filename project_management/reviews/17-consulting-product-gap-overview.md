# Product Gap Review — Consulting + Training Business Readiness

## Purpose
Identify the fundamental product capabilities missing from the current event-centric system to operate a real consulting and training business for individuals and groups, across online and face-to-face delivery.

## Current baseline (what exists)
- Event lifecycle + registration/check-in/export
- Basic auth/account/admin surfaces
- User role management (`USER`, `ADMIN`, `SUPER_ADMIN`)

## Business model target
- Services sold as consulting engagements and training offerings
- Delivery modes: online, in-person, hybrid
- Audience types: individual and group/cohort
- Instructor model: assigned instructor or `TBA`

## Fundamental gaps (P0/P1/P2)

### P0 — Must exist to operate commercially
1. Service catalog + offer packaging
2. Intake/lead qualification and booking request workflows
3. Instructor assignment model with `TBA` lifecycle
4. Commercial operations (quotes/proposals, payment terms, invoice state)
5. Engagement/session artifacts (agenda, objectives, outcomes)

### P1 — Must exist to scale reliably
1. Capacity and resource planning (rooms, virtual links, equipment)
2. Group roster lifecycle (invites, attendance, substitutions)
3. Communications layer (confirmations, reminders, pre-work, follow-ups)
4. Policy governance (reschedule/cancel/no-show/refund)

### P2 — Needed for operational excellence
1. Client portal with history and outcomes
2. KPI dashboard (utilization, conversion, margin, completion)
3. NPS/feedback loops and quality control

## Why current “events” model is insufficient
- Events describe occurrences, not commercial service products.
- Registrations describe attendance, not client outcomes, contracts, or engagement scope.
- No representation of instructor planning uncertainty (`TBA`) as first-class state.

## Recommended domain expansion (minimum viable)
- `ServiceOffering`
- `Engagement`
- `Session`
- `InstructorAssignment`
- `ClientOrganization`
- `Invoice` / `Payment`
- `AttendanceRecord`
- `OutcomeReport`

## Success definition
The product is business-ready when a team can:
1) Publish offers,
2) Convert inquiry to booked work,
3) Deliver sessions with assigned/TBA instructor state,
4) Track attendance + outcomes,
5) Bill and reconcile revenue,
6) Retain audit confidence across all steps.
