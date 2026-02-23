# API Domain: Referrals

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Business logic: `src/lib/api/referrals.ts`
- Admin report: `src/app/api/v1/admin/referrals/route.ts`
- Intake conversion hook: `src/app/api/v1/intake/route.ts` (cookie `so_ref`)

---

## Data model

Referrals are represented in SQLite by:

- `referral_codes`
- `referral_clicks`
- `referral_conversions`

Schema source: `src/cli/db.ts`.

---

## Intake attribution

- Intake submission checks cookie `so_ref`.
- If present, the system attempts to record a referral conversion for that intake request.
- Attribution failures are intentionally ignored (unknown code, etc.).

---

## Admin endpoints

All admin endpoints require `ADMIN` or `SUPER_ADMIN`.

### Referral report

- `GET /api/v1/admin/referrals`

Response:

- `200` HAL report with an export link.

Caching:

- `no-store`

### Export

- `GET /api/v1/admin/referrals/export`

---

## Account endpoint

- `GET /api/v1/account/referral` — account-side referral info (e.g., code and link).
