# API v1 (HAL + Problem Details)

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## Contract conventions

### Media types

- Success responses are HAL resources: `application/hal+json`
- Error responses use RFC 9457 Problem Details: `application/problem+json`

### Error shape (Problem Details)

The API returns a consistent object with at least:

- `type`, `title`, `status`
- optional: `detail`, `instance`
- optional: `request_id` (correlation)

See: `src/lib/hal-client.ts` for client-side parsing expectations.

### Request correlation

- `request_id` is generated and propagated in Problem Details.
- Support/debug flows should always capture `request_id`.

### Authentication

- Session cookie auth (credentials included in fetch).
- Endpoints enforce auth inside handlers, not via middleware alone.

### CSRF hardening

- Mutations require passing `isSameOriginMutation()` checks.
- Cross-origin mutations should return 403 Problem Details.

### Rate limiting

- Sensitive mutations are wrapped in `withRateLimit(<bucket>, handler)`.

### Discovery

- `GET /api/v1` returns a HAL root with stable link relations.

---

## Endpoint catalog (complete index)

This index is generated from the presence of `src/app/api/v1/**/route.ts` files.

### Root / discovery

- `/api/v1`
- `/api/v1/docs`
- `/api/v1/health`
- `/api/v1/me`
- `/api/v1/nav/context`

### Auth

- `/api/v1/auth/register`
- `/api/v1/auth/login`
- `/api/v1/auth/logout`
- `/api/v1/auth/password-reset/request`
- `/api/v1/auth/password-reset/confirm`
- `/api/v1/auth/verify/request`
- `/api/v1/auth/verify/confirm`

### Users (admin)

- `/api/v1/users`
- `/api/v1/users/[id]`
- `/api/v1/users/[id]/roles`
- `/api/v1/users/[id]/roles/[role]`

### Audit

- `/api/v1/audit`

### Feature flags / measurement

- `/api/v1/feature-flags`
- `/api/v1/measure/events`

### Files

- `/api/v1/files/[...key]`

### Offers / packages

- `/api/v1/offers`
- `/api/v1/offers/[slug]`
- `/api/v1/offers/[slug]/packages`
- `/api/v1/offers/[slug]/packages/[packageId]`

### Intake

- `/api/v1/intake`
- `/api/v1/intake/[id]`

### Commercial

- `/api/v1/commercial`
- `/api/v1/commercial/proposals`
- `/api/v1/commercial/proposals/[id]`
- `/api/v1/commercial/invoices`
- `/api/v1/commercial/invoices/[id]`
- `/api/v1/commercial/invoices/[id]/payments`

### Newsletter

- `/api/v1/newsletter/subscribe`
- `/api/v1/newsletter/unsubscribe`

### Events

- `/api/v1/events`
- `/api/v1/events/[slug]`
- `/api/v1/events/[slug]/publish`
- `/api/v1/events/[slug]/cancel`
- `/api/v1/events/[slug]/image`
- `/api/v1/events/[slug]/ics`
- `/api/v1/events/[slug]/export`
- `/api/v1/events/[slug]/registrations`
- `/api/v1/events/[slug]/registrations/[userId]`
- `/api/v1/events/[slug]/registrations/substitutions`
- `/api/v1/events/[slug]/checkins`
- `/api/v1/events/[slug]/instructor`
- `/api/v1/events/[slug]/outcomes`
- `/api/v1/events/[slug]/artifacts`
- `/api/v1/events/[slug]/artifacts/attachments`
- `/api/v1/events/[slug]/follow-up/reminders`
- `/api/v1/events/[slug]/reminder-payload`

### Instructors

- `/api/v1/instructors`
- `/api/v1/instructors/[id]/availability`

### Apprentices

- `/api/v1/apprentice-levels`
- `/api/v1/apprentices`
- `/api/v1/apprentices/[handle]`
- `/api/v1/apprentices/[handle]/progress`
- `/api/v1/apprentices/[handle]/vocabulary`
- `/api/v1/apprentices/[handle]/gate-submissions`
- `/api/v1/apprentices/[handle]/gate-submissions/[id]`

### Account

- `/api/v1/account/activity`
- `/api/v1/account/apprentice-profile`
- `/api/v1/account/apprentice-profile/avatar`
- `/api/v1/account/attention`
- `/api/v1/account/deals/[id]`
- `/api/v1/account/delete`
- `/api/v1/account/engagements`
- `/api/v1/account/engagements/[slug]/artifacts`
- `/api/v1/account/engagements/[slug]/feedback`
- `/api/v1/account/engagements/[slug]/follow-up`
- `/api/v1/account/engagements/[slug]/actions/[actionId]`
- `/api/v1/account/engagements/[slug]/reminders/[id]`
- `/api/v1/account/field-reports`
- `/api/v1/account/field-reports/attachments`
- `/api/v1/account/field-reports/attachments/[attachmentId]`
- `/api/v1/account/referral`
- `/api/v1/account/registrations`
- `/api/v1/account/sessions`
- `/api/v1/account/sessions/[sessionId]`
- `/api/v1/account/sessions/revoke-all`
- `/api/v1/account/stripe-connect`

### Admin

- `/api/v1/admin/invitations`
- `/api/v1/admin/invitations/accept`
- `/api/v1/admin/apprentices`
- `/api/v1/admin/apprentices/[userId]`
- `/api/v1/admin/deals`
- `/api/v1/admin/deals/[id]`
- `/api/v1/admin/deals/[id]/checkout`
- `/api/v1/admin/deals/[id]/refund`
- `/api/v1/admin/ledger`
- `/api/v1/admin/ledger/export`
- `/api/v1/admin/ledger/payouts`
- `/api/v1/admin/referrals`
- `/api/v1/admin/referrals/export`
- `/api/v1/admin/field-reports`
- `/api/v1/admin/field-reports/[id]`
- `/api/v1/admin/field-reports/[id]/feature`
- `/api/v1/admin/field-reports/export`
- `/api/v1/admin/newsletter`
- `/api/v1/admin/newsletter/[id]`
- `/api/v1/admin/newsletter/[id]/generate`
- `/api/v1/admin/newsletter/[id]/review`
- `/api/v1/admin/newsletter/[id]/schedule`
- `/api/v1/admin/newsletter/[id]/publish`
- `/api/v1/admin/newsletter/[id]/export`
- `/api/v1/admin/newsletter/[id]/send-runs`
- `/api/v1/admin/entitlements`
- `/api/v1/admin/entitlements/discord-link`
- `/api/v1/admin/entitlements/discord-sync`
- `/api/v1/admin/measurement`
- `/api/v1/admin/jobs`
- `/api/v1/admin/events/registration-counts`
- `/api/v1/admin/engagement-feedback`
- `/api/v1/admin/engagement-followup`

### Webhooks

- `/api/v1/webhooks/stripe`

---

## Method semantics

This doc intentionally does not guess HTTP methods for every path.

The canonical source of truth for methods is the exports in each handler file:

- `export const GET = ...`
- `export const POST = ...`
- `export const PATCH = ...`
- `export const DELETE = ...`

For example:

- Offers collection supports `GET` and `POST`: `src/app/api/v1/offers/route.ts`
- Intake supports `GET` (admin queue) and `POST` (public submission): `src/app/api/v1/intake/route.ts`
- Admin deals supports `GET` and `POST`: `src/app/api/v1/admin/deals/route.ts`

---

## Where business rules live

- Route handlers: `src/app/api/v1/**/route.ts`
- Shared API logic (domain rules + persistence wiring): `src/lib/api/*`
- Core domain/use-cases: `src/core/*`
