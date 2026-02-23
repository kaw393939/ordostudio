# API Domain: Auth

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Route handlers: `src/app/api/v1/auth/**/route.ts`
- Business logic: `src/lib/api/auth.ts`
- Schemas: `src/lib/api/schemas.ts`

---

## Endpoints

### Register

- `POST /api/v1/auth/register`
- Schema: `registerSchema`

Request body:

- `email` (string, required)
- `password` (string, required)
- `terms_accepted` (boolean, optional; if explicitly `false`, request fails)

Responses:

- `201` HAL with `{ id, email, status, roles }`
- `409` Problem: email already registered
- `400` Problem: invalid payload / terms not acknowledged

Controls:

- CSRF: same-origin mutation check
- Rate limit bucket: `auth:register`
- Cache: `no-store`

### Login

- `POST /api/v1/auth/login`
- Schema: `loginSchema`

Request body:

- `email` (string, required)
- `password` (string, required)

Responses:

- `200` HAL with `{ id, email, status, roles }`
- `401` Problem: invalid credentials
- `403` Problem: email verification required (when enabled)

Controls:

- Sets `lms_session` cookie on success
- CSRF: same-origin mutation check
- Rate limit bucket: `auth:login`
- Cache: `no-store`

### Logout

- `POST /api/v1/auth/logout`

Effect:

- Clears `lms_session` cookie.

### Password reset

- `POST /api/v1/auth/password-reset/request` — schema: `passwordResetRequestSchema`
- `POST /api/v1/auth/password-reset/confirm` — schema: `passwordResetConfirmSchema`

### Email verification

- `POST /api/v1/auth/verify/request` — schema: `verifyRequestSchema`
- `POST /api/v1/auth/verify/confirm` — schema: `verifyConfirmSchema`

---

## Notes

- Email verification enforcement is feature-configured via `APPCTL_REQUIRE_EMAIL_VERIFICATION`.
- Sessions are hash-stored and managed via SQLite auth queries in `src/adapters/sqlite/auth-queries.ts`.
