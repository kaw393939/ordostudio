# Sprint 67 — Stripe Connect Onboarding + Automated Payout Execution

## Goal
Enable provider/referrer onboarding and execute approved ledger payouts through Stripe Connect.

## Scope
- Connect onboarding flow for contractors.
- Store connect account id + onboarding status.
- Execute payouts from APPROVED ledger entries.
- Handle payout failures and retries.

## Shipped (2026-02-21)
- Account UI: “Stripe payouts” card on `/account` opens onboarding.
- Account API: `GET/POST /api/v1/account/stripe-connect` stores Connect account + refreshes status.
- Admin UI: `/admin/ledger` can execute payouts for selected APPROVED entries.
- Admin API: `POST /api/v1/admin/ledger/payouts` executes Stripe transfers and marks entries PAID.
- Persistence:
  - `stripe_connect_accounts` stores account id + onboarding status.
  - `stripe_payout_executions` stores idempotency + transfer id + attempts/errors.
- Idempotency: payouts use Stripe transfer idempotency key `ledger_payout_<ledger_entry_id>`.

## Acceptance Criteria
- [x] Contractors can onboard via Connect.
- [x] Approved ledger entries can be paid out.
- [x] Payout execution is auditable and idempotent.
- [x] Tests cover: onboarding state + payout execution path.
- [x] Lint/tests/build pass.

## Validation
- `npm test`
- `npm run lint`
- `npm run build`
