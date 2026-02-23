# Capability Map (Canonical)

This is the canonical capability map for LMS 219 / Studio Ordo.

It normalizes capability names and links each capability to **as-is system evidence**:

- UI routes
- API endpoints
- CLI/MCP commands
- Data model
- Tests

It is intended to make roadmap/sprint planning **accurate by default**.

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## How to use this

- Use this file as the primary capability index.
- For “what exists today,” defer to `scope.md`, `ui-routes.md`, and `api-v1-methods.md`.
- For sprint lineage and tests, start at `sprint-traceability.md`.
- For persona/journey-derived gaps, see `requirements-coverage.md`.

Status meanings:

- **Implemented**: exists as a stable surface (UI/API/CLI) with tests.
- **Partial**: surface exists but workflow is incomplete.
- **Not implemented**: no clear surface exists yet.
- **Unknown**: needs verification.

---

## Capability index

| Capability | Primary personas | Surface | Status | Specs (as-is) | Code pointers | Test anchors |
| --- | --- | --- | --- | --- | --- | --- |
| Auth: register/login/logout | All | API + UI | Implemented | `auth-rbac.md`, `api-domains/auth.md` | `src/app/api/v1/auth/**/route.ts`, `src/lib/api/auth.ts` | `src/app/api/v1/auth/__tests__/*`, `src/app/__tests__/e2e-auth-session-hardening.test.ts` |
| Auth: email verification | All | API | Implemented | `api-domains/auth.md` | `src/app/api/v1/auth/email-verification/**/route.ts` | `src/app/__tests__/e2e-email-verification.test.ts` |
| Auth: password reset | All | API | Implemented | `api-domains/auth.md` | `src/app/api/v1/auth/password-reset/**/route.ts` | `src/app/__tests__/e2e-password-reset.test.ts` |
| Sessions: list/revoke | All | API + UI | Implemented | `auth-rbac.md` | `src/app/api/v1/account/sessions/**/route.ts` | `src/app/__tests__/e2e-auth-session-hardening.test.ts` |
| RBAC + admin invitations | Admin | API + UI | Implemented | `auth-rbac.md` | `src/app/api/v1/admin/invitations/**/route.ts` | `src/app/__tests__/e2e-admin-invitations.test.ts` |
| Users (admin ops) | Admin | API + UI + CLI/MCP | Implemented | `auth-rbac.md`, `cli-surface.md` | `src/app/api/v1/users/**/route.ts`, `src/cli/auth-users.ts` | `src/app/__tests__/e2e-admin-operations-security.test.ts` |
| Offers catalog (union pricing) | Buyers | API + UI | Implemented | `api-domains/offers.md`, `../product/offer-catalog.md` | `src/app/api/v1/offers/**/route.ts`, `src/lib/api/offers.ts` | `src/app/api/v1/offers/__tests__/offers-api.test.ts` |
| Intake submission + triage | Buyers | API + UI | Implemented | `api-domains/intake.md` | `src/app/api/v1/intake/**/route.ts`, `src/lib/api/intake.ts` | `src/app/api/v1/intake/__tests__/intake-api.test.ts` |
| Deals queue + maestro assignment | Admin/Maestro | API + UI | Implemented | `api-domains/deals.md` | `src/app/api/v1/admin/deals/**/route.ts`, `src/lib/api/deals.ts` | `src/app/__tests__/e2e-deals.test.ts` |
| Stripe Checkout (deal payments) | Buyers/Admin | API + Webhooks | Implemented | `api-domains/deals.md` | `src/app/api/v1/admin/deals/[id]/checkout/route.ts`, `src/app/api/v1/webhooks/stripe/route.ts` | `src/app/__tests__/e2e-stripe-payments.test.ts` |
| Refund execution | Admin | API | Implemented | `api-domains/deals.md` | Stripe refund logic in API + adapters | `src/app/api/v1/admin/deals/__tests__/deal-payments.test.ts` |
| Ledger: entries + approvals + export | Admin | API + UI + CLI/MCP | Implemented | `api-domains/ledger.md` | `src/app/api/v1/admin/ledger/**/route.ts`, `src/lib/api/ledger.ts` | `src/app/__tests__/e2e-ledger.test.ts` |
| Stripe Connect onboarding + payouts | Admin/Maestro | API | Implemented | `api-domains/ledger.md` | `src/app/api/v1/account/stripe-connect/**/route.ts`, payout routes under admin | `src/app/__tests__/e2e-stripe-connect-payouts.test.ts` |
| Referrals attribution + reporting | Buyers/Admin | API | Implemented | `api-domains/referrals.md` | `src/app/api/v1/admin/referrals/route.ts`, `src/lib/api/referrals.ts` | `src/app/__tests__/e2e-referrals-attribution.test.ts` |
| Newsletter subscribers | Audience | API | Implemented | `api-domains/newsletter.md` | `src/app/api/v1/newsletter/**/route.ts` | `src/app/__tests__/e2e-newsletter.test.ts` |
| Newsletter issue workflow + sending | Admin | API + CLI | Implemented | `api-domains/newsletter.md`, `cli-surface.md` | `src/app/api/v1/admin/newsletter/**/route.ts`, `src/cli/newsletter.ts` | `src/app/__tests__/e2e-newsletter-sending.test.ts` |
| Events: CRUD + publish/cancel | Admin/Maestro | API + UI | Implemented | `api-domains/events.md` | `src/app/api/v1/events/**/route.ts`, `src/lib/api/events.ts` | `src/app/__tests__/e2e-event-delivery.test.ts` |
| Registrations: register/cancel + check-in | Users/Admin | API + UI | Implemented | `api-domains/events.md` | `src/lib/api/registrations.ts` + events routes | `src/app/__tests__/e2e-release-journeys-regression.test.ts` |
| Exports: CSV/JSON/ICS | Admin/Users | API | Implemented | `api-domains/events.md` | export routes under `src/app/api/v1/events/**` | `src/app/__tests__/e2e-caching-performance.test.ts` (smoke) |
| Apprentices: public directory + profile | Apprentices | API + UI | Implemented | `api-domains/apprentices.md` | `src/app/api/v1/apprentices/**/route.ts` | `src/app/__tests__/e2e-apprentices.test.ts` |
| Apprentices: learning path (levels/progress) | Apprentices | API | Implemented | `api-domains/apprentices.md` | `src/lib/api/apprentice-progress.ts` | `src/app/__tests__/e2e-apprentices.test.ts` |
| Apprentices: vocabulary (Spell Book) | Apprentices | API | Implemented | `api-domains/apprentices.md` | `src/app/api/v1/apprentices/[handle]/vocabulary/route.ts` | `src/app/__tests__/e2e-apprentices.test.ts` |
| Apprentices: gate submissions + review | Apprentices/Maestro | API | Implemented | `api-domains/apprentices.md` | `src/lib/api/gate-submissions.ts` | `src/app/__tests__/e2e-apprentices.test.ts` |
| Field reports + attachments | Apprentices | API + UI | Implemented | `scope.md` | account field report routes under `src/app/api/v1/account/field-reports/**` | `src/app/__tests__/e2e-field-reports.test.ts` |
| Audit log (API + UI) | Admin | API + UI | Implemented | `scope.md` | audit modules + admin UI | `src/app/__tests__/e2e-audit-ui.test.ts` |
| Hardening: Problem Details + request_id | All | API | Implemented | `api-v1.md` | `src/lib/api/response.ts`, `src/lib/api/request-logging.ts` | `src/app/api/v1/__tests__/hardening.test.ts` |
| Hardening: rate limits + same-origin mutation | All | API | Implemented | `auth-rbac.md` | `src/lib/api/rate-limit-wrapper.ts` + middleware helpers | `src/app/__tests__/e2e-admin-operations-security.test.ts` |
| Measurement events + feature flags | Admin | API | Implemented | `scope.md` | measure routes under `/api/v1/measure/*` | `src/app/__tests__/e2e-measurement.test.ts` |
| Background jobs (queue + dashboard) | Admin | API + CLI/MCP | Implemented | `scope.md`, `cli-surface.md` | `src/platform/job-queue.ts`, `src/app/api/v1/admin/jobs/route.ts` | `src/platform/__tests__/job-queue.test.ts` |
| Discord entitlements sync | Admin | API | Implemented | `scope.md` | `src/app/api/v1/admin/entitlements/**/route.ts` | `src/app/__tests__/e2e-entitlements.test.ts` |
| CLI/MCP control plane (appctl) | Admin/Super-admin | CLI + MCP | Implemented | `cli-surface.md` | `src/cli/main.ts`, `src/mcp/*` | `src/cli/__tests__/*` |

---

## Persona/journey alignment (planning notes)

This is a thin summary to keep planning honest; the detailed gap list remains in `requirements-coverage.md`.

- **Enterprise buyer (Marcus)**: Marketplace + payments + ledger + referrals are implemented; assessment/booking/reporting capabilities are mostly not implemented.
- **Studio apprentice (Alex)**: apprenticeship learning-path primitives are implemented; application/scorecard/career-bridge/incident-drills are not implemented.

---

## Next verification pass (recommended)

To convert **Unknown** and some **Partial** statuses into definitive planning inputs:

- Verify lead magnet + downloads + email capture flows in `src/app/(public)` and update the map.
- Identify whether “invoice generation” exists as a capability (it is referenced in journey maps but not clearly modeled).
- Add explicit links to `data-model.md` tables for each capability that mutates data.
