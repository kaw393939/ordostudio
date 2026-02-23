# API Domain: Ledger (Commissions + Approvals + Payouts)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Routes: `src/app/api/v1/admin/ledger/**/route.ts`
- Business logic: `src/lib/api/ledger.ts`, `src/lib/api/ledger-payouts.ts`
- Schemas: `src/lib/api/schemas.ts`

---

## Roles

- Ledger admin endpoints require `ADMIN` or `SUPER_ADMIN`.

---

## Endpoints

### List ledger entries

- `GET /api/v1/admin/ledger`

Query params:

- `status` (EARNED | APPROVED | PAID | VOID)

Response:

- `200` HAL with `{ count, limit, offset, items[] }`

Links:

- Collection includes `export` link (optionally filtered by status).
- Each item includes `deal` link.

Caching:

- `no-store`

### Approve ledger entries

- `POST /api/v1/admin/ledger`
- Schema: `ledgerApproveSchema`

Request body:

- `entry_ids[]`
- `confirm` (boolean)

Precondition:

- Requires explicit `confirm: true` or returns `412`.

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `admin:write`

### Export

- `GET /api/v1/admin/ledger/export`

### Execute payouts

- `POST /api/v1/admin/ledger/payouts`
- Schema: `ledgerPayoutsSchema`

Request body:

- `entry_ids[]`
- `confirm` (boolean)

Precondition:

- Requires explicit `confirm: true` or returns `412`.

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `admin:write`

---

## Notes

- Ledger entries are the system’s canonical “money movement” ledger.
- The payout executor is designed to operate only on APPROVED entries.
