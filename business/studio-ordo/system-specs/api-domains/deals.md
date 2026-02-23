# API Domain: Deals (Managed Marketplace)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Admin deal routes: `src/app/api/v1/admin/deals/**/route.ts`
- Business logic: `src/lib/api/deals.ts`
- Payments: `src/lib/api/payments.ts`

---

## Roles

- Deal admin endpoints require one of: `ADMIN`, `SUPER_ADMIN`, or `MAESTRO`.

---

## Endpoints

### List deals (admin/maestro)

- `GET /api/v1/admin/deals`

Query params:

- `status` (QUEUED | ASSIGNED | MAESTRO_APPROVED | PAID | IN_PROGRESS | DELIVERED | CLOSED | REFUNDED)
- `intake_id`
- `limit`, `offset`

Caching:

- `no-store`

### Create deal from intake (admin/maestro)

- `POST /api/v1/admin/deals`
- Schema: `createDealSchema`

Request body:

- `intake_id` (required)
- `requested_provider_user_id` (optional)

Failure modes:

- `404` intake not found
- `409` conflict if deal already exists for intake
- `412` if intake preconditions fail (e.g., offer slug missing, offer inactive)

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `admin:write`

### Deal detail (admin/maestro)

- `GET /api/v1/admin/deals/{id}`
- `PATCH /api/v1/admin/deals/{id}`

---

## Checkout + refund

### Create Stripe checkout session

- `POST /api/v1/admin/deals/{id}/checkout`

Behavior:

- Creates a Stripe Checkout session for the deal.
- Returns `201` HAL with `checkout_url` and a `payment` object.

Failure modes:

- `412` precondition failure
- `409` if deal already has completed payment

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `admin:write`

### Refund

- `POST /api/v1/admin/deals/{id}/refund`

---

## Notes

- Deals are linked to the ledger system: delivery completion produces ledger entries, which are then approved and paid.
- Stripe webhooks are handled at `POST /api/v1/webhooks/stripe`.
