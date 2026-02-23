# API Domain: Offers (Service Catalog)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Route handlers: `src/app/api/v1/offers/**/route.ts`
- Business logic: `src/lib/api/offers.ts`
- Schemas: `src/lib/api/schemas.ts`
- Persistence: `offers`, `offer_packages` tables (defined in `src/cli/db.ts`)

---

## Endpoints

### List offers

- `GET /api/v1/offers`

Query params:

- `q` (string, optional)
- `audience` (string, optional; uppercased)
- `delivery_mode` (string, optional; uppercased)
- `status` (string, optional; uppercased)
- `limit` (number, optional)
- `offset` (number, optional)

Response:

- `200` HAL collection with `{ count, limit, offset, items[] }`

Caching:

- `cache-control: private, max-age=30, stale-while-revalidate=60`

Links:

- Each item includes:
  - `self` → `/api/v1/offers/{slug}`
  - `app:detail` → `/services/{slug}`
- If caller is admin, item also includes:
  - `app:packages` → `/api/v1/offers/{slug}/packages`
  - `app:activate` or `app:deactivate`

### Create offer (admin)

- `POST /api/v1/offers`
- Auth: `ADMIN` or `SUPER_ADMIN`
- Schema: `createOfferSchema`

Request body fields (selected):

- `slug`, `title`, `summary`
- `price_cents`, `currency`
- `duration_label`, `refund_policy_key`
- `audience`, `delivery_mode`
- `booking_url`
- `outcomes[]`
- `status`

Response:

- `201` HAL offer resource

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `user:write`

### Get offer by slug

- `GET /api/v1/offers/{slug}`

Rules:

- If offer is `INACTIVE`, non-admin callers receive `404`.

Caching:

- `private, max-age=30, stale-while-revalidate=60`

### Update offer (admin)

- `PATCH /api/v1/offers/{slug}`
- Auth: `ADMIN` or `SUPER_ADMIN`
- Schema: `updateOfferSchema`

Notable precondition:

- Price changes require `confirm_price_change: true` or response is `412`.

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `user:write`

### Delete offer (admin)

- `DELETE /api/v1/offers/{slug}`
- Auth: `ADMIN` or `SUPER_ADMIN`

---

## Packages

### List packages

- `GET /api/v1/offers/{slug}/packages`

### Create package (admin)

- `POST /api/v1/offers/{slug}/packages`
- Schema: `createPackageSchema`

### Update package (admin)

- `PATCH /api/v1/offers/{slug}/packages/{packageId}`
- Schema: `updatePackageSchema`

### Delete package (admin)

- `DELETE /api/v1/offers/{slug}/packages/{packageId}`

---

## Notes

- Business definition of what offers exist today is in `business/studio-ordo/product/offer-catalog.md`.
- The canonical “offer schema” in the running system includes fields like `duration_label` and `refund_policy_key` (as in `createOfferSchema`).
