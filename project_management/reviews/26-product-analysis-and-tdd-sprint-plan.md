# Product Analysis and TDD Sprint Planning Framework

## 1) Executive Summary

The review set shows two simultaneous realities:

1. The current product is a solid event-management foundation (auth, events, registrations, exports, admin operations).
2. It is not yet a complete consulting/training business platform for individuals and groups across online and in-person delivery.

The implementation strategy should therefore split into two tracks:

- Track A: Safety and operational hardening of existing flows (immediate risk reduction).
- Track B: Business-model expansion (service catalog, intake, engagement delivery, commercial operations, client outcomes).

Both tracks should run under strict TDD to reduce regressions and preserve release confidence.

## 2) Consolidated Problem Statement

### Immediate product risk
- Destructive and privileged workflows lack sufficient safety rails (confirmation depth, impact previews, durable action summaries).

### Structural business gap
- The domain is event-centric, not consulting/training-centric.
- Missing first-class concepts required for revenue operations and delivery quality:
  - Service offerings/packages
  - Booking and qualification pipeline
  - Instructor/TBA assignment lifecycle
  - Delivery-mode logistics (online/in-person/hybrid)
  - Group vs individual engagement management
  - Proposal/invoice/payment workflows
  - Client outcomes and follow-up continuity

## 3) Product Principles to Adopt

1. Safety before speed for destructive and privileged actions.
2. Explicit state over implicit behavior (especially TBA and workflow transitions).
3. One source of truth for commercial and delivery lifecycle.
4. Progressive disclosure for complex admin operations.
5. Durable system feedback for every async operation.
6. Measurable value delivery from inquiry to outcomes.

## 4) Target Domain Model (Minimum Viable)

### Core entities
- ServiceOffering
- ServicePackage
- BookingRequest
- Engagement
- Session
- SessionDelivery
- Instructor
- SessionInstructorAssignment (supports TBA)
- ClientOrganization
- EngagementParticipant
- Proposal
- Invoice
- Payment
- OutcomeReport
- SessionArtifact

### Key relationship flow
ServiceOffering -> BookingRequest -> Engagement -> Session(s)
Session(s) -> InstructorAssignment (TBA -> assigned -> confirmed)
Engagement -> Proposal/Invoice/Payment
Engagement -> Outcomes/Artifacts/Feedback

## 5) Workstream Breakdown

## Workstream A — Safety & Trust Hardening (existing pages)
- Account deletion confirmation and consequence disclosure
- Admin role/status mutation confirmations
- Batch operations preflight and post-action reconciliation
- Export compliance signaling and export receipts
- Audit filters/usability acceleration

## Workstream B — Service Offer System
- Offer catalog, packaging, pricing model primitives
- Offer discovery and clear CTA split (individual vs group)

## Workstream C — Intake & Qualification
- Public intake form with adaptive fields
- Admin intake queue with SLA and assignment workflow

## Workstream D — Delivery Operations
- Delivery mode logistics model (online/in-person/hybrid)
- Group roster and participant substitution workflows
- Instructor availability + assignment + TBA lifecycle

## Workstream E — Commercial Operations
- Proposal lifecycle
- Invoice and payment state management
- Revenue visibility by offering/client/instructor segment

## Workstream F — Client Value Layer
- My engagements dashboard
- Session outcomes, artifacts, action items
- Follow-up workflow and feedback loop

## 6) Dependency Map

### Foundational dependencies
1. Workstream A must start first to reduce operational risk.
2. Workstream B and C establish business intake and productized offers.
3. Workstream D depends on B/C domain entities for correct scheduling and staffing.
4. Workstream E depends on C/B and partially D for billable context.
5. Workstream F depends on D/E for meaningful client visibility.

### Parallelization opportunities
- B and A can run in parallel after safety interfaces are specified.
- C can start once minimal B offering schema is stable.
- D instructor assignment can begin with early C outputs.

## 7) Proposed TDD Sprint Sequence

Each sprint below is intentionally outcome-oriented and test-first.

## Sprint TDD-01 — Safety Rails P0/P1
Scope:
- Account delete two-step confirmation with typed intent
- Admin role/status mutation confirmation with impact summary
- Bulk cancel/check-in preflight summary + result report

Tests first:
- Destructive action cannot execute without confirmation token
- Privileged mutation requires explicit confirmation payload
- Batch endpoint response includes per-item success/failure structure

Exit criteria:
- No single-click destructive path remains
- All high-risk mutations produce durable result summaries

## Sprint TDD-02 — Audit/Export Operability Hardening
Scope:
- Date-time picker validation and quick range presets on audit
- Metadata prioritization/severity highlighting
- Export receipt metadata and privacy warning states

Tests first:
- Invalid date filters rejected with clear problem details
- Critical action types correctly severity-tagged
- Export with sensitive flags always emits receipt metadata

Exit criteria:
- Investigation and export flows are auditable and confidence-preserving

## Sprint TDD-03 — Service Catalog Core
Scope:
- ServiceOffering and ServicePackage backend + admin CRUD
- Public offer listing/detail views

Tests first:
- Offering schema validation for mode/audience/pricing fields
- Listing filters by delivery mode and audience
- Package comparison rendering with consistent ordering

Exit criteria:
- Offers are first-class and discoverable without event-copy workarounds

## Sprint TDD-04 — Intake and Qualification Pipeline
Scope:
- BookingRequest capture (individual/group)
- Admin intake queue and status transitions

Tests first:
- Adaptive intake validation by audience type
- Status transition guards and history audit entries
- Queue filters and SLA indicators

Exit criteria:
- Every inquiry is traceable from submission to outcome

## Sprint TDD-05 — Delivery Modes + Logistics
Scope:
- SessionDelivery model and mode-specific fields
- “How to attend” surfaces and reminder payload generation

Tests first:
- Mode-specific required fields enforced
- Join/location instructions render in confirmations
- Reminder generation includes mode-correct logistics

Exit criteria:
- Online/in-person/hybrid logistics are explicit and reliable

## Sprint TDD-06 — Instructor Assignment + TBA Lifecycle
Scope:
- Instructor entity + availability
- Assignment state machine with TBA and reassignment events

Tests first:
- State transitions (TBA -> assigned -> confirmed -> reassigned)
- Capability matching filters by mode/topic/availability
- Customer notification triggers on assignment changes

Exit criteria:
- TBA is first-class, visible, and auditable

## Sprint TDD-07 — Group vs Individual Engagement Experience
Scope:
- Distinct booking and dashboard pathways
- Group roster administration + substitutions

Tests first:
- Path selection logic by engagement type
- Group participant lifecycle operations
- Access control for organizer-only actions

Exit criteria:
- Individual and group experiences are differentiated and coherent

## Sprint TDD-08 — Commercial Operations Core
Scope:
- Proposal lifecycle + acceptance
- Invoice/payment state tracking

Tests first:
- Proposal state machine integrity
- Invoice totals and payment transitions
- Revenue reporting primitives by segment

Exit criteria:
- Engagements can move from intake to billable completion in-product

## Sprint TDD-09 — Client Portal Outcomes and Follow-Up
Scope:
- My engagements timeline
- Session outcomes, artifacts, and action-item tracking
- Feedback capture

Tests first:
- Engagement timeline ordering and status rollups
- Artifact access scope enforcement
- Feedback capture and reporting integrity

Exit criteria:
- Clients can see delivered value and next steps without external channels

## 8) TDD Structure Per Sprint (Template)

For each sprint:

1. Domain tests
- Entity invariants, state transitions, business rules

2. API contract tests
- Request/response schema, validation, error models, authorization

3. Integration tests
- Multi-entity workflow correctness and transaction consistency

4. UI behavior tests
- Critical path interactions and safety confirmations

5. Regression tests
- Prior P0/P1 safety behavior remains enforced

Definition of Done per sprint:
- All new tests pass
- Existing regression suite passes
- No new P0/P1 findings introduced
- Documentation updated for new workflows and states

## 9) Metrics and Governance

## Product KPIs
- Inquiry -> qualified -> booked conversion
- Booking lead time
- Session no-show rate
- Instructor utilization
- Revenue per offering
- Repeat booking rate
- Client satisfaction/NPS

## UX/ops safety KPIs
- Destructive-action reversal incidents
- Privileged mutation error rate
- Batch operation ambiguity incidents
- Audit investigation time-to-answer

## Governance cadence
- Weekly risk review (P0/P1)
- Bi-weekly sprint acceptance review with KPI snapshot
- Monthly product-model integrity review (entity/state sprawl control)

## 10) Recommended Immediate Next Actions

1. Start Sprint TDD-01 and TDD-02 immediately (risk reduction).
2. Approve canonical domain vocabulary for new entities before TDD-03.
3. Freeze API naming conventions for booking/engagement/session early to avoid migration churn.
4. Establish acceptance benchmark dashboard before implementation begins.

## 11) Planning Readiness Output

This analysis provides a comprehensive, dependency-aware implementation framework suitable for converting into sprint planning docs and task breakdowns with explicit TDD acceptance gates.
