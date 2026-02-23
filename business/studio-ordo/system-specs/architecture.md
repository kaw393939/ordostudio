# Architecture (As-Is)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## High-level components

### 1) Web UI (Next.js App Router)

- Pages live under `src/app/(public)` and `src/app/(admin)` and `src/app/account`.
- UI consumes the API through a HAL client (`src/lib/hal-client.ts`) and avoids hardcoding action URLs.
- UI renders RFC 9457 Problem Details consistently and surfaces `request_id` for support correlation.

### 2) HTTP API (`/api/v1`)

- Route handlers live under `src/app/api/v1/**/route.ts`.
- Responses:
  - Success: `application/hal+json`
  - Errors: `application/problem+json`
- Cross-cutting:
  - Request logging wrapper: `src/lib/api/request-logging.ts`
  - Rate limiting wrapper: `src/lib/api/rate-limit-wrapper.ts`
  - Same-origin mutation guard (CSRF hardening): `isSameOriginMutation()` in `src/lib/api/auth.ts`

### 3) Operational CLI (`appctl`)

- Entry: `src/cli/main.ts`
- Implements DB lifecycle, tokens, user/role ops, event ops, registrations/export, jobs/newsletter.
- Design goal: CLI is an auditable, deterministic operator surface.

### 4) MCP server (admin ops automation)

- Entry: `src/mcp/main.ts`
- Auth: service token hash lookup (same token store as CLI)
- Exposes admin-ops tools (wrapping the same platform capabilities), with request_id and audit expectations.

### 5) Persistence (SQLite)

- Database: SQLite (better-sqlite3)
- Schema/migrations are defined as a migration list in `src/cli/db.ts`.
- DB file configured via `APPCTL_DB_FILE` (and platform config precedence).

### 6) External systems

- Stripe:
  - Checkout + refunds
  - Webhooks
  - Connect onboarding for payout execution
- AWS S3 optional adapter for file storage (local is supported as well)
- Discord entitlements sync (link account, compute diff, apply role changes)

---

## Boundary rule (the “Uber spec” version)

- **Route handlers** are transport glue only: parse inputs, enforce auth/CSRF/rate-limit, call shared application logic.
- **Application logic** lives in `src/lib/api/*` and `src/core/*`.
- **Persistence adapters** live under `src/adapters/sqlite/*` and repository modules.
- **Auditing** is required for mutations and operationally significant reads (exports, payouts).

---

## Availability / reliability posture

- Most stateful operations are synchronous SQLite transactions (atomicity prioritized).
- Safety rails are preferred over convenience:
  - No SUPER_ADMIN escalation via HTTP
  - PII export constraints
  - Destructive operations require explicit confirmation

---

## Canonical discovery entrypoints

- API root: `GET /api/v1` (HAL root links)
- Docs: `GET /api/v1/docs` (OpenAPI skeleton; not a full contract)
- UI navigation context: `GET /api/v1/nav/context`
- Session identity: `GET /api/v1/me`
