# Data Model (SQLite)

This describes the SQLite schema **as implemented**.

**Owner:** Keith Williams · **Last updated:** 2026-02-22

**Canonical schema source:** `src/cli/db.ts` (migration list + SQL)

---

## Core identity tables

- `users` — user accounts (id, email, status, timestamps)
- `roles` — role names
- `user_roles` — many-to-many mapping
- `service_tokens` — operator/MCP service tokens (hash stored; revocation + last_used)

## Audit

- `audit_log` — append-only operational audit log
  - actor: `actor_type`, `actor_id`
  - action: string namespace (e.g., `api.auth.login`)
  - target: `target_type`, `target_id`
  - metadata: JSON string
  - correlation: `request_id`

## Events + registrations

- `events` — event lifecycle + time window + capacity
- `event_registrations` — unique (event_id, user_id), status-based (no hard delete)

## Service catalog

- `offers` — standardized offer definitions (slug, audience, delivery_mode, status, booking_url)
- `offer_packages` — offer packages (name/scope/price_label, sort_order)

## Intake

- `intake_requests` — inbound consult/service requests
- `intake_status_history` — state transitions for intake triage

## Delivery logistics

- `event_delivery` — delivery mode + location/meeting link (1:1 with event)

## Instructors

- `instructors` — instructor directory (status)
- `instructor_availability` — availability slots
- `event_instructor_assignments` — per-event assignment state machine
- `event_instructor_assignment_history` — assignment change history

## Managed marketplace + commercial

The schema includes support for proposals, invoices, payments, engagements, follow-ups, and deal/ledger flows. The authoritative table list is in `src/cli/db.ts`.

High-signal tables to know:

- `proposals`, `proposal_status_history`
- `invoices`, `invoice_status_history`
- `payments`
- `engagement_sessions`
- `engagement_action_items`, `engagement_action_item_reminders`
- `event_engagement`
- `deals`, `deal_status_history`
- `deal_payments`
- `ledger_entries` — the canonical money-movement ledger (earned/approved/paid/void)

## Newsletter / editorial

- `newsletter_subscribers`
- `newsletter_issues`
- `newsletter_blocks`
- `newsletter_issue_field_reports`
- `newsletter_issue_research_sources`
- `newsletter_send_runs`
- `newsletter_delivery_events`

## Referrals

- `referral_codes` — codes associated with users
- `referral_clicks` — click tracking
- `referral_conversions` — conversions (e.g., intake attribution)

## Apprenticeship

- `apprentice_profiles` — apprentice public/profile data

## Entitlements + Discord

- `entitlements`
- `user_discord_accounts`

## Stripe

- `stripe_webhook_events` — idempotency store for processed events
- `stripe_connect_accounts` — Connect onboarding state

---

## Database invariants (selected)

- Many workflows use **state transition tables** (status history) rather than hard deletes.
- Most uniqueness rules that matter are enforced at the DB layer (e.g., `users.email`, `events.slug`, `(event_id,user_id)` registrations).
- Auditing is treated as first-class: `audit_log` is always present and referenced widely.

---

## Migration tracking

- `app_migrations` table tracks which migrations have been applied.
- CLI preconditions often require “no pending migrations” before allowing operations.

See migration enforcement in `src/cli/db.ts` and schema preconditions in `src/cli/schema-guard.ts`.
