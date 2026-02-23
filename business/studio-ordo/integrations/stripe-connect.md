# Integration — Stripe (Upfront Payments) + Connect (Contractor Payouts)

## Goals
- Upfront client payments for standardized offers.
- Platform-controlled refunds.
- Contractor payouts for providers and referrers.

## Phase A (MVP)
- Stripe Checkout for upfront payments.
- Payment success transitions deal to PAID.
- Refunds initiated by admins.
- Payouts remain approval-based and may be executed manually initially.

## Phase B (Connect)
- Providers onboard via Stripe Connect (Express recommended for speed).
- Platform executes payouts from approved ledger rows.

## Data model requirements
- Store Stripe object ids (checkout session, payment intent, refund id).
- Ledger rows:
  - provider payout
  - referral commission
  - platform remainder

## Safety
- Payouts never execute without approval.
- Refunds should freeze payout eligibility for affected deals.

