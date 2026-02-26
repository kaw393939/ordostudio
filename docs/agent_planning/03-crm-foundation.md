# Sprint 37 — CRM Foundation

**Status:** Planning · **Date:** 2026-02-25
**Prerequisite:** Sprint 36 — intake agent must be running so contacts are being created
**Delivers to:** Sprint 38 (contacts must exist before onboarding workflow can act on them)

---

## What This Sprint Is

Studio Ordo has two sides: **prospects/customers** and **staff**. They currently share the same user table and the same login entry point. This sprint cleanly separates them.

The key architectural decision: **contacts are not users**. A prospect exists as a `contact` (with lifecycle status) before they ever receive a login. When staff approves them, a `user` record is created and linked. This eliminates ghost accounts and gives staff a full CRM view of a prospect's history before any account is provisioned.

Login and registration are also moved to the footer in this sprint. The public site is a qualification surface. The login page is a utility, not a destination.

---

## What's Broken / Missing Now

| Issue | Impact |
|-------|--------|
| Register link in primary nav creates a login-first impression | Signals "portal" not "premium service" |
| Every intake submission is orphaned — no unified contact history | Staff cannot see past conversations, submissions, or interactions |
| No concept of a "prospect" — only users | Approved users and anonymous prospects are indistinguishable in DB |
| No staff-facing pipeline view | Intake reviews happen through raw DB queries |
| Contact status not tracked | No way to know if a lead is cold, warm, in onboarding, or active |

---

## Data Model

### `contacts` (new — migration 038)

```sql
CREATE TABLE contacts (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  user_id     TEXT,                          -- NULL until account created
  source      TEXT NOT NULL DEFAULT 'AGENT', -- AGENT | FORM | REFERRAL | MANUAL
  status      TEXT NOT NULL CHECK(status IN (
                'LEAD','QUALIFIED','ONBOARDING','ACTIVE','CHURNED'
              )) DEFAULT 'LEAD',
  notes       TEXT,                          -- staff-editable freeform
  assigned_to TEXT,                          -- user_id of staff member
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);
```

**Lifecycle rules (enforced in application layer, not DB):**
- `LEAD` → `QUALIFIED` when staff approves the intake
- `QUALIFIED` → `ONBOARDING` when account is created (Sprint 38)
- `ONBOARDING` → `ACTIVE` when onboarding sequence completes
- Any status → `CHURNED` on explicit staff action

### `intake_requests` — backfill link to contacts

When a contact is created from an intake submission, write `contact_id` back to the `intake_requests` row. Add the column via migration 038 addendum:

```sql
ALTER TABLE intake_requests ADD COLUMN contact_id TEXT
  REFERENCES contacts(id);
```

---

## Contact Creation Rules

A contact record is created at the earliest point of identification:
1. **Via agent conversation** — when chat agent calls `submit_intake`, extract email from conversation and upsert a contact
2. **Via static intake form** — `POST /api/v1/intake` creates contact on submission
3. **Via referral conversion** — `POST /api/v1/referral/convert` creates contact if one doesn't exist for the email

De-duplication: `email` is the unique key. All three paths upsert on email.

---

## API Routes

### `GET /api/v1/crm/contacts`

Staff-only. Returns paginated contact list with status, source, assigned_to, last activity.

**Query params:** `status`, `source`, `assigned_to`, `page`, `limit` (default 25)

### `GET /api/v1/crm/contacts/:id`

Staff-only. Returns full contact record including linked `intake_requests` (with transcript if present), `bookings`, `referral_conversions`, `feed_events`.

### `PATCH /api/v1/crm/contacts/:id`

Staff-only. Editable fields: `status`, `notes`, `assigned_to`. Status transitions are validated against the lifecycle rules.

### `GET /api/v1/crm/pipeline`

Staff-only. Returns count of contacts in each status bucket. Powers the pipeline board.

---

## UI — Staff CRM

### `/admin/crm` — Pipeline board

Kanban-style columns: `LEAD | QUALIFIED | ONBOARDING | ACTIVE | CHURNED`

Each card shows:
- Contact name + email
- Source badge (AGENT / FORM / REFERRAL)
- Assigned staff member (or "Unassigned")
- Days since last activity
- "View →" link to contact detail

Default sort: newest first.

### `/admin/crm/contacts/:id` — Contact detail

Sections:
1. **Header** — name, email, status dropdown (editable), source, created date
2. **Notes** — freeform text, staff-editable
3. **Intake records** — linked intake submissions with "View transcript" if one exists
4. **Bookings** — scheduled or past Maestro consultations
5. **Activity timeline** — feed events linked to this contact (by email match)
6. **Assign** — select staff member from dropdown

---

## Navigation Changes — Login/Register to Footer

The login and register links move out of the primary navigation and into the site footer.

**Primary nav (after this sprint):**
```
Studio Ordo    [Commission a project]    [Enroll in training]    [Talk to us]
```
No login link in the nav. No register link anywhere above the fold.

**Footer (after this sprint):**
```
Studio Ordo · hello@studioordo.com · +1 (000) 000-0000
[Privacy] [Terms] [Login] [Staff access]
```

The "Staff access" link goes to `/login`. It is visually de-emphasized (same weight as Privacy/Terms).

---

## Test Plan

| # | Test | Type |
|---|------|------|
| T1 | `contacts` migration creates table with correct columns | unit |
| T2 | `intake_requests` migration adds `contact_id` column | unit |
| T3 | `POST /api/v1/intake` creates or upserts a contact record | unit |
| T4 | Duplicate email on `POST /api/v1/intake` updates existing contact, not creates new | unit |
| T5 | `GET /api/v1/crm/contacts` requires staff auth | unit |
| T6 | `GET /api/v1/crm/contacts` returns paginated results filterable by status | unit |
| T7 | `PATCH /api/v1/crm/contacts/:id` updates status and notes | unit |
| T8 | `PATCH /api/v1/crm/contacts/:id` rejects invalid status transitions | unit |
| T9 | `GET /api/v1/crm/pipeline` returns correct counts per status | unit |
| T10 | Contact detail page shows linked intake records (e2e) | unit |

---

## Definition of Done

- [ ] Migration 038 applied — `contacts` table present, `intake_requests.contact_id` column added
- [ ] Contact creation fires on intake form submission
- [ ] Contact de-duplication on email works correctly (upsert)
- [ ] `/admin/crm` pipeline board renders with status columns
- [ ] `/admin/crm/contacts/:id` contact detail page renders
- [ ] Login/register links removed from primary nav, present in footer only
- [ ] All 10 tests pass
- [ ] `npm run build` clean
