# Sprint 63 — Ledger + Commissions + Payout Approvals (No Automation Yet)

## Goal
Create a ledgered, auditable money workflow for provider payouts and referrer commissions, with approval gates (manual payout execution allowed).

## Scope

### Ledger model
- Create `ledger_entries` table:
  - `id`, `deal_id`
  - `entry_type`: `PROVIDER_PAYOUT` | `REFERRER_COMMISSION` | `PLATFORM_REVENUE`
  - `beneficiary_user_id` (nullable for platform)
  - `amount_cents`, `currency`
  - `status`: `EARNED` | `APPROVED` | `PAID` | `VOID`
  - `earned_at`, `approved_at`, `paid_at`
  - `approved_by_user_id`
  - metadata (basis: gross/net, percent)

### Business rules
- Ledger entries are created at `DEAL.DELIVERED` by default.
- Refunds/chargebacks:
  - freeze or void ledger entries until resolved.

### Admin UI
- Payout approvals screen:
  - filter by status (earned/approved/paid)
  - approve batch with confirmation
  - export CSV

### Audit
- Ledger creation and approvals are high-severity audit events.

## Acceptance Criteria

- [x] Ledger model exists and is linked to deals.
- [x] Provider payout and referrer commission rows are created on DELIVERED.
- [x] Admin can approve ledger entries with confirmation.
- [x] CSV export exists.
- [x] Tests cover: earned creation, approval gating, refund freeze behavior.
- [x] Lint/tests/build pass.

## Shipped
- Migration `020_ledger_entries_core`
- Ledger domain (`src/lib/api/ledger.ts`) + audit actions
- Deal integration: earn on `DELIVERED`, void un-paid on `REFUNDED`
- Admin APIs: `/api/v1/admin/ledger`, `/api/v1/admin/ledger/export`
- Admin UI: `/admin/ledger` + nav link
- E2E: `src/app/__tests__/e2e-ledger.test.ts`

