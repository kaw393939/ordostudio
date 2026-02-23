# Current Scope (Feature Inventory)

This document inventories **current system behavior** as implemented in code.

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## Product shape

LMS 219 is simultaneously:

- A Next.js web application (public marketing pages + account + admin console)
- A versioned HTTP API (`/api/v1`) using HAL + RFC 9457 Problem Details
- A production-grade operational CLI (`appctl`) for admin/super-admin operations
- An MCP server surface for admin-ops automation (`npm run mcp`)

---

## Implemented subsystems

### Identity & access

- Session-based auth (register/login/logout)
- Account session management (list sessions, revoke one, revoke all)
- Password reset request/confirm
- Email verification request/confirm
- Roles: USER, APPRENTICE, MAESTRO, ADMIN, SUPER_ADMIN
- Admin invitations (ADMIN only; no SUPER_ADMIN escalation via HTTP)

### Events & registrations

- Events CRUD + lifecycle (publish/cancel)
- Public browsing + event detail
- Event registrations (create/cancel as state transition)
- Check-ins
- CSV/JSON exports with PII governance
- ICS calendar export
- Event images + artifacts + attachments

### Offers, intake, and managed marketplace

- Offers listing + filtering + detail
- Offer packages
- Intake request submission (public) + admin queue triage
- Deals queue + admin/maestro conversion from intake
- Stripe checkout session creation + webhook intake
- Refund execution
- Ledger entries (earned/approved/paid/void) + admin approvals + export
- Stripe Connect onboarding (account side)

### Apprenticeship

- Apprentice profiles + avatar
- Public apprentice directory + detail
- Learning path endpoints: apprentice levels, vocabulary, progress, gate submissions
- Field reports + attachments

### Editorial / newsletter

- Newsletter subscribe/unsubscribe
- Admin newsletter issue workflow: generate, review, schedule, publish, export, send runs

### Compliance, safety, and operability

- Audit log (API + admin UI)
- Request logging with request_id
- Rate limiting wrapper on key mutation endpoints
- CSRF protection via same-origin mutation checks
- Security headers and no-store controls on sensitive endpoints
- Feature flags + measurement events
- Admin job queue dashboard

### Integrations

- Stripe webhooks
- Discord entitlements + link + sync

---

## Explicit non-goals (as of now)

These are **not** currently represented as stable public contracts:

- A complete OpenAPI document (the `/api/v1/docs` document is currently a minimal skeleton)
- Public, third-party API token auth for end users (sessions are cookie-based)
- Public partner API for affiliates (referral codes exist, but the affiliate program UX is still evolving)

---

## Primary code sources

- API routes: `src/app/api/v1/**/route.ts`
- Shared API logic: `src/lib/api/*`
- CLI: `src/cli/*` (manual: `docs/cli-manual.md`)
- MCP server: `src/mcp/*`
- SQLite migrations/schema: `src/cli/db.ts`
