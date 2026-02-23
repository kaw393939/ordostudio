# Studio Ordo — Offer Catalog (Standardized)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## What this document is

This is the **as-is, code-backed** offer catalog.

Canonical sources:

- Seed fixture: `src/cli/db.ts` (`studioOrdoOffers` + `seedStudioOrdoFixture`)
- Runtime API: `GET /api/v1/offers`
- Persistence: `offers` + `offer_packages` tables in SQLite (defined in `src/cli/db.ts`)

If this document conflicts with any marketing copy or roadmap material, **this document wins** for “what exists today.”

---

## Philosophy

- Offers are standardized to protect apprentices, protect clients, and remove negotiation overhead.
- Pricing is set by the platform ("union pricing") and is queryable via `/api/v1/offers`.
- Each offer is addressable by `slug` and should be treated as a stable SKU.

---

## Current offers (seeded + ACTIVE)

### Workshops (individual / team)

Half-day workshops are $2,500; full-day workshops are $4,500.

| Slug | Title (short) | Price | Duration | Audience | Delivery |
| --- | --- | --- | --- | --- | --- |
| `workshop-disciplined-inquiry` | Disciplined Inquiry | $2,500 | Half-day (4 hours) | BOTH | HYBRID |
| `workshop-professional-judgment` | Professional Judgment | $2,500 | Half-day (4 hours) | BOTH | HYBRID |
| `workshop-problem-finding` | Problem Finding | $2,500 | Half-day (4 hours) | BOTH | HYBRID |
| `workshop-epistemic-humility` | Epistemic Humility | $2,500 | Half-day (4 hours) | BOTH | HYBRID |
| `workshop-accountable-leadership` | Accountable Leadership | $2,500 | Half-day (4 hours) | BOTH | HYBRID |
| `workshop-translation` | Translation | $2,500 | Half-day (4 hours) | BOTH | HYBRID |
| `workshop-resilience-thinking` | Resilience Thinking | $4,500 | Full-day (8 hours) | BOTH | HYBRID |
| `workshop-systems-thinking` | Systems Thinking | $4,500 | Full-day (8 hours) | BOTH | HYBRID |

### Corporate packages

These are modeled as offers with package rows in `offer_packages`.

| Slug | Price | Duration | Audience | Delivery |
| --- | --- | --- | --- | --- |
| `corporate-starter` | $2,000 | Half-day (4 hours) | GROUP | HYBRID |
| `corporate-professional` | $5,000 | 2 days (16 hours) | GROUP | HYBRID |
| `corporate-enterprise` | $10,000 | 4 weeks (32 hours) | GROUP | HYBRID |

Package pricing labels (as seeded) live in the `offer_packages.price_label` field.

### Community

| Slug | Price | Duration | Audience | Delivery |
| --- | --- | --- | --- | --- |
| `everydayai-community` | $0 | 4 weeks (8 hours total) | BOTH | IN_PERSON |

---

## Data contract (as implemented)

### Offers table fields

Each offer in the system includes (see `src/cli/db.ts` and the insert statement in the seed fixture):

- `slug` (unique)
- `title`
- `summary`
- `price_cents`
- `currency`
- `duration_label`
- `refund_policy_key`
- `audience` (e.g., BOTH, GROUP)
- `delivery_mode` (e.g., HYBRID, IN_PERSON)
- `status` (e.g., ACTIVE)
- `booking_url`
- `outcomes_json`

### Offer packages

For offers that have tiers/variants, the system uses `offer_packages`:

- `offer_id` (FK)
- `name`
- `scope`
- `price_label`
- `sort_order`

---

## Notes

- Consultation, advisory retainers, subscriptions, and apprenticeship tuition are **not** currently represented as offers in the seeded catalog.
- If we add those later, they should be introduced as new offer slugs with migrations + tests + a seed fixture update.

