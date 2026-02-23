# Auth, Sessions, and RBAC (As-Is)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## Authentication model

### Mechanism

- The API uses **cookie-based sessions**.
- Session cookie name: `lms_session`.

Primary implementation: `src/lib/api/auth.ts`.

### Session lifetime

- Default session duration: 7 days.
- Absolute maximum: 30 days.
- Session activity update is throttled (1 hour) to reduce write load.

---

## Auth endpoints (API v1)

- Register: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login`
- Logout: `POST /api/v1/auth/logout`
- Current user: `GET /api/v1/me`

Account recovery:

- Password reset request: `POST /api/v1/auth/password-reset/request`
- Password reset confirm: `POST /api/v1/auth/password-reset/confirm`

Email verification:

- Verify request: `POST /api/v1/auth/verify/request`
- Verify confirm: `POST /api/v1/auth/verify/confirm`

---

## CSRF hardening

- All mutation handlers are expected to reject cross-origin mutations.
- Mechanism: `isSameOriginMutation(request)` in `src/lib/api/auth.ts`.

---

## Roles

System roles (as strings in the DB and API):

- `USER` — default role for authenticated users
- `APPRENTICE` — apprenticeship participation surfaces
- `MAESTRO` — delivery/approval authority in the managed marketplace
- `ADMIN` — administrative operations
- `SUPER_ADMIN` — break-glass access; intentionally limited

Role enumeration and permission mapping is also mirrored in business docs:

- `business/studio-ordo/ops/roles-rbac.md`

---

## Authorization rules (high-signal)

### Principle: No escalation via HTTP

- The HTTP API does not allow creating or granting `SUPER_ADMIN` privileges.
- SUPER_ADMIN is treated as break-glass and is expected to be assigned outside the public API surface.

### Admin gating

- Most admin endpoints require `ADMIN` or `SUPER_ADMIN`.
- Some operational endpoints allow `MAESTRO` as well (e.g., deals queue operations).

Example enforcement pattern:

- Handler checks `getSessionUserFromRequest(request)`
- Then checks `roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")`

### Maestro gating

- Maestro can access deal triage and approval flows.
- Maestro is intentionally not equivalent to admin for global user management.

### Same-origin mutation requirement

- `POST/PATCH/DELETE` endpoints enforce `isSameOriginMutation()`.

---

## Session management endpoints

- `GET /api/v1/account/sessions` — list active sessions
- `DELETE /api/v1/account/sessions/[sessionId]` — revoke one session
- `POST /api/v1/account/sessions/revoke-all` — revoke all sessions except current

---

## Audit implications

Auth and access changes are expected to be auditable:

- Login audits are used for `last_login_at` in `GET /api/v1/me`.
- Role changes, invitations, payouts, exports, and sensitive mutations are expected to append audit log entries.

Primary audit API:

- `GET /api/v1/audit`
