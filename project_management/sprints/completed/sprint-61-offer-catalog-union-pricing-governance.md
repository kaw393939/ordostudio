# Sprint 61 — Offer Catalog (Union Pricing) + Governance

## Goal
Make offers first-class and standardized: platform-owned catalog with controlled pricing and stable SKUs.

## Scope

### Offer model
- Create `offers` table:
  - `slug` (SKU)
  - `title`
  - `description`
  - `price_cents`, `currency`
  - `duration_label`
  - `active` flag
  - `refund_policy_key`
  - timestamps

### Admin UI
- Admin offers console:
  - create/edit offers
  - activate/deactivate
  - pricing change confirmation (no accidental edits)
  - audit entries for changes

### Deal integration
- Deals reference `offer_slug` that must exist and be active at time of purchase.

### Public
- Minimal public offers list for consulting marketplace (separate from training tracks if needed).

## Acceptance Criteria

- [x] Offer catalog exists with stable slugs/SKUs.
- [x] Admin can manage offers with audit entries.
- [x] Deals reference offers.
- [x] Tests cover: offer activation and deal reference constraints.
- [x] Lint/tests/build pass.

## Shipped
- Migration `015_offer_catalog_union_pricing` (extends offers with price/currency/duration/refund policy)
- Offer domain + API updates (required pricing fields + confirm-price-change guardrail)
- Admin offers UI captures pricing + confirm checkbox
- Deal creation precondition: offer must exist + be ACTIVE
- DB constraints: deals.offer_slug FK + deal_status_history FK fix (`016`, `017`)

