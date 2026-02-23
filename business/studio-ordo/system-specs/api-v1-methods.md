# API v1 — Methods Catalog (As-Is)

This document lists every `/api/v1` endpoint and the HTTP methods it currently supports.

**Owner:** Keith Williams · **Last updated:** 2026-02-22

**Canonical source:** exported handlers in `src/app/api/v1/**/route.ts`.

---

## Root

- `/api/v1` — `GET`
- `/api/v1/docs` — `GET`
- `/api/v1/health` — `GET`
- `/api/v1/me` — `GET`
- `/api/v1/nav/context` — `GET`

## Auth

- `/api/v1/auth/register` — `POST`
- `/api/v1/auth/login` — `POST`
- `/api/v1/auth/logout` — `POST`
- `/api/v1/auth/password-reset/request` — `POST`
- `/api/v1/auth/password-reset/confirm` — `POST`
- `/api/v1/auth/verify/request` — `POST`
- `/api/v1/auth/verify/confirm` — `POST`

## Users

- `/api/v1/users` — `GET`
- `/api/v1/users/[id]` — `GET`, `PATCH`
- `/api/v1/users/[id]/roles` — `POST`
- `/api/v1/users/[id]/roles/[role]` — `DELETE`

## Audit

- `/api/v1/audit` — `GET`

## Events

- `/api/v1/events` — `GET`, `POST`
- `/api/v1/events/[slug]` — `GET`, `PATCH`
- `/api/v1/events/[slug]/publish` — `POST`
- `/api/v1/events/[slug]/cancel` — `POST`
- `/api/v1/events/[slug]/image` — `POST`, `DELETE`
- `/api/v1/events/[slug]/ics` — `GET`
- `/api/v1/events/[slug]/export` — `GET`
- `/api/v1/events/[slug]/registrations` — `GET`, `POST`
- `/api/v1/events/[slug]/registrations/[userId]` — `DELETE`
- `/api/v1/events/[slug]/registrations/substitutions` — `POST`
- `/api/v1/events/[slug]/checkins` — `POST`
- `/api/v1/events/[slug]/instructor` — `GET`, `PATCH`
- `/api/v1/events/[slug]/outcomes` — `POST`
- `/api/v1/events/[slug]/artifacts` — `POST`
- `/api/v1/events/[slug]/artifacts/attachments` — `POST`
- `/api/v1/events/[slug]/follow-up/reminders` — `POST`
- `/api/v1/events/[slug]/reminder-payload` — `GET`

## Instructors

- `/api/v1/instructors` — `GET`, `POST`
- `/api/v1/instructors/[id]/availability` — `POST`

## Offers

- `/api/v1/offers` — `GET`, `POST`
- `/api/v1/offers/[slug]` — `GET`, `PATCH`, `DELETE`
- `/api/v1/offers/[slug]/packages` — `GET`, `POST`
- `/api/v1/offers/[slug]/packages/[packageId]` — `PATCH`, `DELETE`

## Intake

- `/api/v1/intake` — `GET`, `POST`
- `/api/v1/intake/[id]` — `GET`, `PATCH`

## Deals + ledger + referrals (admin)

- `/api/v1/admin/deals` — `GET`, `POST`
- `/api/v1/admin/deals/[id]` — `GET`, `PATCH`
- `/api/v1/admin/deals/[id]/checkout` — `POST`
- `/api/v1/admin/deals/[id]/refund` — `POST`
- `/api/v1/admin/ledger` — `GET`, `POST`
- `/api/v1/admin/ledger/export` — `GET`
- `/api/v1/admin/ledger/payouts` — `POST`
- `/api/v1/admin/referrals` — `GET`
- `/api/v1/admin/referrals/export` — `GET`

## Newsletter

- `/api/v1/newsletter/subscribe` — `POST`
- `/api/v1/newsletter/unsubscribe` — `POST`

## Newsletter (admin)

- `/api/v1/admin/newsletter` — `GET`, `POST`
- `/api/v1/admin/newsletter/[id]` — `GET`, `PATCH`
- `/api/v1/admin/newsletter/[id]/generate` — `POST`
- `/api/v1/admin/newsletter/[id]/review` — `POST`
- `/api/v1/admin/newsletter/[id]/schedule` — `POST`
- `/api/v1/admin/newsletter/[id]/publish` — `POST`
- `/api/v1/admin/newsletter/[id]/export` — `GET`
- `/api/v1/admin/newsletter/[id]/send-runs` — `GET`

## Apprentices

- `/api/v1/apprentice-levels` — `GET`
- `/api/v1/apprentices` — `GET`
- `/api/v1/apprentices/[handle]` — `GET`
- `/api/v1/apprentices/[handle]/progress` — `GET`
- `/api/v1/apprentices/[handle]/vocabulary` — `GET`, `POST`
- `/api/v1/apprentices/[handle]/gate-submissions` — `POST`
- `/api/v1/apprentices/[handle]/gate-submissions/[id]` — `PATCH`

## Account

- `/api/v1/account/activity` — `GET`
- `/api/v1/account/attention` — `GET`
- `/api/v1/account/registrations` — `GET`
- `/api/v1/account/referral` — `GET`
- `/api/v1/account/engagements` — `GET`
- `/api/v1/account/engagements/[slug]/artifacts` — `GET`
- `/api/v1/account/engagements/[slug]/follow-up` — `GET`
- `/api/v1/account/engagements/[slug]/actions/[actionId]` — `PATCH`
- `/api/v1/account/engagements/[slug]/reminders/[id]` — `PATCH`
- `/api/v1/account/engagements/[slug]/feedback` — `POST`
- `/api/v1/account/deals/[id]` — `GET`, `PATCH`
- `/api/v1/account/apprentice-profile` — `GET`, `PUT`
- `/api/v1/account/apprentice-profile/avatar` — `POST`, `DELETE`
- `/api/v1/account/field-reports` — `GET`, `POST`
- `/api/v1/account/field-reports/attachments` — `POST`
- `/api/v1/account/field-reports/attachments/[attachmentId]` — `DELETE`
- `/api/v1/account/sessions` — `GET`
- `/api/v1/account/sessions/[sessionId]` — `DELETE`
- `/api/v1/account/sessions/revoke-all` — `POST`
- `/api/v1/account/delete` — `POST`
- `/api/v1/account/stripe-connect` — `GET`, `POST`

## Commercial

- `/api/v1/commercial` — `GET`
- `/api/v1/commercial/proposals` — `GET`, `POST`
- `/api/v1/commercial/proposals/[id]` — `GET`, `PATCH`
- `/api/v1/commercial/invoices` — `GET`, `POST`
- `/api/v1/commercial/invoices/[id]` — `GET`, `PATCH`
- `/api/v1/commercial/invoices/[id]/payments` — `POST`

## Admin misc

- `/api/v1/admin/invitations` — `POST`
- `/api/v1/admin/invitations/accept` — `POST`
- `/api/v1/admin/apprentices` — `GET`
- `/api/v1/admin/apprentices/[userId]` — `PATCH`
- `/api/v1/admin/field-reports` — `GET`
- `/api/v1/admin/field-reports/[id]` — `GET`
- `/api/v1/admin/field-reports/[id]/feature` — `POST`
- `/api/v1/admin/field-reports/export` — `GET`
- `/api/v1/admin/entitlements` — `GET`, `POST`
- `/api/v1/admin/entitlements/discord-link` — `POST`
- `/api/v1/admin/entitlements/discord-sync` — `GET`, `POST`
- `/api/v1/admin/measurement` — `GET`
- `/api/v1/admin/jobs` — `GET`
- `/api/v1/admin/engagement-feedback` — `GET`
- `/api/v1/admin/engagement-followup` — `GET`
- `/api/v1/admin/events/registration-counts` — `POST`

## Feature flags / measurement

- `/api/v1/feature-flags` — `GET`
- `/api/v1/measure/events` — `POST`

## Webhooks

- `/api/v1/webhooks/stripe` — `POST`
