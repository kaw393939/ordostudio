# Sprint 60 — Deal Model + Queue + Maestro Assignment/Approval Gates

## Goal
Introduce the core managed marketplace unit: a **Deal** created from Intake, assigned by a maestro, and gated so no work starts without approval + payment.

## Scope

### Data model
- Create `deals` table:
  - `id`, `intake_id`
  - `offer_slug` (temporary; offer catalog comes next sprint)
  - `status`: `QUEUED` | `ASSIGNED` | `MAESTRO_APPROVED` | `PAID` | `IN_PROGRESS` | `DELIVERED` | `CLOSED` | `REFUNDED`
  - `referrer_user_id` (attribution)
  - `requested_provider_user_id` (client request)
  - `provider_user_id` (assigned deliverer)
  - `maestro_user_id` (supervisor/approver)
  - timestamps
- Create `deal_status_history` (or audit metadata) for state transitions.

### Admin/Maestro UI
- Extend Intake admin queue:
  - convert Intake → Deal (creates QUEUED)
  - assign provider + maestro
  - approve deal (MAESTRO_APPROVED)
  - block transitions unless prerequisites met

### Safety rails
- Enforce gate:
  - cannot start `IN_PROGRESS` unless `MAESTRO_APPROVED` + `PAID`
- All state transitions write audit entries.

### APIs
- Admin endpoints:
  - create deal from intake
  - assign deal
  - approve deal
  - update delivery status (provider + maestro)

## Acceptance Criteria

- [x] Deal model exists and is linked to intake.
- [x] Maestro assignment and approval are required.
- [x] Gate is enforced for IN_PROGRESS.
- [x] Referrer + requested provider are recorded and visible.
- [x] Tests cover core transitions and gate enforcement.
- [x] Lint/tests/build pass.

## Shipped
- DB migration `014_deals_marketplace_core` (deals + status history)
- Deal domain API + guardrails
- Admin + account APIs
- Admin UI: intake → deal creation + deals list/detail
- E2E test: `src/app/__tests__/e2e-deals.test.ts`

