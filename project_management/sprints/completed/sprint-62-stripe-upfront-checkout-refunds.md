# Sprint 62 — Stripe Upfront Checkout + Payment Webhooks + Refund Console

## Goal
Enable upfront payment for standardized offers, with platform-controlled refunds and auditable payment state transitions.

## Scope

### Payments model
- Create `payments` table:
  - `deal_id`
  - `provider`: Stripe
  - `checkout_session_id`, `payment_intent_id`
  - `status`: `CREATED` | `PAID` | `REFUNDED` | `FAILED`
  - amounts + currency
  - timestamps

### Stripe integration
- Create checkout session per deal + offer.
- Webhook handler updates payment + deal state.
- Enforce `deal.status = PAID` only after confirmed payment.

### Refund console
- Admin can initiate refund with:
  - reason
  - amount (full initially)
  - confirmation gate
- Refund writes audit entry and updates deal/payment state.

### Safety
- Idempotent webhook handling.
- Audit entries for all payment/refund transitions.

## Acceptance Criteria

- [x] Checkout session created for a deal and offer.
- [x] Successful payment transitions deal to PAID.
- [x] Refund can be executed from admin and transitions to REFUNDED.
- [x] Webhooks are idempotent and auditable.
- [x] Tests cover: payment success path + refund path + idempotency.
- [x] Lint/tests/build pass.

## Shipped
- Stripe SDK + wrapper: `src/lib/integrations/stripe-client.ts`
- Payments domain: `src/lib/api/payments.ts`
- DB migration: `018_payments_stripe_core` (payments + webhook event log)
- API:
  - `POST /api/v1/admin/deals/[id]/checkout`
  - `POST /api/v1/admin/deals/[id]/refund`
  - `POST /api/v1/webhooks/stripe`
- Admin deals UI: Payment panel (create checkout + refund); PAID/REFUNDED removed from manual status
- Tests: `src/app/__tests__/e2e-stripe-payments.test.ts`

