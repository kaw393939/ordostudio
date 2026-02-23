# API Domain: Intake (Qualification Pipeline)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Route handlers: `src/app/api/v1/intake/**/route.ts`
- Business logic: `src/lib/api/intake.ts`
- Schemas: `src/lib/api/schemas.ts`
- Referrals: `src/lib/api/referrals.ts`

---

## Endpoints

### Submit intake (public)

- `POST /api/v1/intake`
- Schema: `createIntakeSchema`

Request body fields (optional/required depend on schema defaults):

- `offer_slug`
- `audience` (INDIVIDUAL | ORGANIZATION | TEAM | ENTERPRISE)
- `organization_name`
- `contact_name`
- `contact_email`
- `goals`
- `timeline`
- `constraints`

Response:

- `201` HAL intake request with `self` and `collection` links.

Referral attribution:

- If cookie `so_ref` is present, the API attempts to record a referral conversion for the intake.
- Attribution failures are ignored (unknown code, etc.).

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `public:write`

### List intake queue (admin)

- `GET /api/v1/intake`
- Auth: `ADMIN` or `SUPER_ADMIN`

Query params:

- `status`
- `audience`
- `owner_user_id`
- `q`
- `limit`, `offset`

Caching:

- `no-store`

### Get intake request by id (admin)

- `GET /api/v1/intake/{id}`
- Auth: `ADMIN` or `SUPER_ADMIN`

Caching:

- `no-store`

### Update intake request (admin)

- `PATCH /api/v1/intake/{id}`
- Auth: `ADMIN` or `SUPER_ADMIN`
- Schema: `updateIntakeSchema`

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `public:write` (as implemented)

---

## Notes

- Intake is the top of the managed marketplace funnel: intake → deal conversion is performed via admin deals endpoints.
- This API is designed to support triage ownership (`owner_user_id`) and prioritization (`priority`).
