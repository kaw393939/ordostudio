# Sprint Traceability (Completed → Code → Tests)

This provides **high-level traceability** from completed sprint artifacts to the implemented code.

It is not intended to duplicate sprint documents; it is intended to answer:

- Where is the code for this capability?
- Where are the tests that prove it works?

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## Sprint artifacts

- Sprints 01–32 are concatenated in `project_management/sprints/completed/all-sprints-combined.md`.
- Sprints 33+ and the PRD/SYS/TDD/IP series are individual files in `project_management/sprints/completed/`.

---

## Subsystem map

### CLI foundation + DB lifecycle

- Sprint sources:

  - `sprint-01-foundation.md` … `sprint-06-hardening-release.md`
- Primary code:

  - `src/cli/run-cli.ts`, `src/cli/config.ts`, `src/cli/errors.ts`
  - `src/cli/db.ts` (migrations, seed, backup/restore, doctor)
- Tests:

  - `src/cli/__tests__/*`

### Auth, sessions, users/roles, invitations

- Sprint sources:
  - `sprint-03-auth-users.md`, `sprint-08-auth-session.md`, `sprint-09-users-api.md`, `sprint-28-feature-admin-invitations.md`
  - `sprint-26-feature-password-reset-recovery.md`, `sprint-27-feature-email-verification.md`
- Primary code:
  - API routes: `src/app/api/v1/auth/**`, `src/app/api/v1/me`, `src/app/api/v1/users/**`, `src/app/api/v1/admin/invitations/**`
  - Shared auth logic: `src/lib/api/auth.ts`
  - SQLite auth schema/queries: `src/adapters/sqlite/auth-schema.ts`, `src/adapters/sqlite/auth-queries.ts`
- Tests:
  - `src/app/api/v1/auth/__tests__/*`
  - `src/app/__tests__/e2e-password-reset.test.ts`
  - `src/app/__tests__/e2e-email-verification.test.ts`
  - `src/app/__tests__/e2e-admin-invitations.test.ts`

### Events + registrations + check-ins + exports

- Sprint sources:
  - `sprint-04-events.md`, `sprint-05-registrations-export.md`, `sprint-10-events-api.md`, `sprint-11-registrations-api.md`
  - UX series: `sprint-14-public-events-ui.md`, `sprint-16-registration-ux.md`, `sprint-30-feature-event-discovery-search-calendar.md` and later UX hardening sprints
- Primary code:
  - API routes: `src/app/api/v1/events/**`
  - Shared logic: `src/lib/api/events.ts`, `src/lib/api/registrations.ts`
- Tests:
  - `src/app/api/v1/events/__tests__/*`

### API contracts (HAL + Problem Details) + hardening

- Sprint sources:
  - `sprint-07-api-foundation.md`, `sprint-12-api-hardening-release.md`
- Primary code:
  - `src/app/api/v1/route.ts`
  - `src/lib/api/response.ts` (HAL + Problem Details)
  - `src/lib/api/request-logging.ts`
  - `src/lib/api/rate-limit-wrapper.ts`
- Tests:
  - `src/app/api/v1/__tests__/hardening.test.ts`

### UI foundation + admin console

- Sprint sources:
  - `sprint-13-ui-foundation-design-system.md`
  - Admin: `sprint-17-admin-events-console.md`, `sprint-18-admin-registrations-checkin-export.md`, `sprint-19-admin-users-ui.md`, `sprint-31-feature-audit-log-ui.md`
- Primary code:
  - UI pages: `src/app/(public)/**`, `src/app/(admin)/admin/**`
  - HAL client: `src/lib/hal-client.ts`
  - Access helpers: `src/lib/ui-access.ts`
- Tests:
  - `e2e/*.spec.ts` and `src/app/__tests__/e2e-*.test.ts`

### Service catalog (offers) + packages

- Sprint sources:
  - `sprint-tdd-03-service-catalog-core.md`
  - `sprint-61-offer-catalog-union-pricing-governance.md`
- Primary code:
  - API routes: `src/app/api/v1/offers/**`
  - Shared logic: `src/lib/api/offers.ts`
- Tests:
  - `src/app/api/v1/offers/__tests__/offers-api.test.ts`

### Intake qualification pipeline

- Sprint sources:
  - `sprint-tdd-04-intake-qualification-pipeline.md`
- Primary code:
  - API routes: `src/app/api/v1/intake/**`
  - Shared logic: `src/lib/api/intake.ts`
- Tests:
  - `src/app/api/v1/intake/__tests__/intake-api.test.ts`

### Managed marketplace: deals + checkout + refunds

- Sprint sources:
  - `sprint-60-deals-queue-maestro-assignment-approval.md`
  - `sprint-62-stripe-upfront-checkout-refunds.md`
- Primary code:
  - API routes: `src/app/api/v1/admin/deals/**`, `src/app/api/v1/webhooks/stripe`
  - Shared logic: `src/lib/api/deals.ts`, Stripe adapter modules
- Tests:
  - `src/app/api/v1/admin/deals/__tests__/deal-payments.test.ts`

### Ledger + commissions + payouts + Stripe Connect

- Sprint sources:
  - `sprint-63-ledger-commissions-payout-approvals.md`
  - `sprint-67-stripe-connect-onboarding-payout-execution.md`
  - Referrals: `sprint-56-referrals-qr-affiliate-foundation.md`
- Primary code:
  - API routes: `src/app/api/v1/admin/ledger/**`, `src/app/api/v1/admin/referrals/**`, `src/app/api/v1/account/stripe-connect`
  - Shared logic: `src/lib/api/ledger.ts`, `src/lib/api/referrals.ts`
- Tests:
  - API + E2E coverage exists; primary mapping is by module presence and route tests

### Newsletter engine

- Sprint sources:
  - `sprint-64-newsletter-subscribers-scheduling-email.md`
  - `sprint-57-agentic-newsletter-intelligence-pipeline.md`
- Primary code:
  - API routes: `src/app/api/v1/newsletter/**`, `src/app/api/v1/admin/newsletter/**`
  - CLI: `src/cli/newsletter.ts`
- Tests:
  - `src/app/__tests__/e2e-newsletter-sending.test.ts`

### Apprenticeship: profiles, levels, progress, gate submissions, field reports

- Sprint sources:
  - `sprint-55-studio-apprenticeship-events-field-notes.md`
  - `sprint-59-apprentice-profiles-directory.md`
  - `sprint-sys-02-apprentice-learning-paths.md`
- Primary code:
  - API routes: `src/app/api/v1/apprentice-levels`, `src/app/api/v1/apprentices/**`
  - Account endpoints: `src/app/api/v1/account/apprentice-profile/**`, `src/app/api/v1/account/field-reports/**`

### Entitlements (Discord)

- Sprint sources:
  - `sprint-65-discord-entitlements-sync.md`
- Primary code:
  - API routes: `src/app/api/v1/admin/entitlements/**`

### Background jobs

- Sprint sources:
  - `sprint-prd-06-background-jobs.md`
- Primary code:
  - Job queue: `src/platform/job-queue.ts`
  - Admin endpoint: `src/app/api/v1/admin/jobs/route.ts`
  - CLI: `src/cli/jobs.ts`

### MCP server

- Sprint sources:
  - `sprint-66-mcp-server-admin-ops.md`
- Primary code:
  - `src/mcp/*`

---

## How to verify a sprint against code

For any sprint file `project_management/sprints/completed/<sprint>.md`:

1. Identify named endpoints/commands and search under:
   - `src/app/api/v1/`
   - `src/cli/`
   - `src/lib/api/`
   - `src/core/`
2. Find corresponding tests in:
   - `src/app/api/v1/**/__tests__`
   - `src/app/__tests__`
   - `e2e/`
3. Confirm the sprint’s acceptance criteria correspond to a test name, or to a stable invariant enforced in code.
