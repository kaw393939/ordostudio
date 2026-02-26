# Sprint 38 — Onboarding Workflow

**Status:** Planning · **Date:** 2026-02-25
**Prerequisite:** Sprint 37 — `contacts` table, CRM pipeline, and contact lifecycle must exist
**Delivers to:** Sprint 39 (onboarding events feed the routing engine)

---

## What This Sprint Is

When a contact is approved (status moves to `QUALIFIED`), something must happen next. Currently nothing does — it requires manual follow-up and a manually created account. This sprint automates the path from approval to an active customer with an onboarding sequence they can complete.

The onboarding sequence is not an email drip. It is a set of **tasks** — steps the new member must complete to be active. Each completion fires a feed event, which future sprints can route through the workflow engine.

---

## What's Broken / Missing Now

| Issue | Impact |
|-------|--------|
| Approved contacts require manual account creation | Delay between approval and onboarding; staff bottleneck |
| No onboarding sequence — new users see an empty dashboard | First login is disorienting; no clear next action |
| Role-request approval does not trigger onboarding | Affiliates approved via /apply role flow have no guided next step |
| No way to track which onboarding steps a user has completed | Staff cannot see where a new member is stuck |

---

## Data Model

### `onboarding_tasks` — definition table (migration 039)

```sql
CREATE TABLE onboarding_tasks (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,         -- machine-readable key
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  role         TEXT NOT NULL,                -- which role this task applies to
  position     INTEGER NOT NULL DEFAULT 0,  -- display order
  required     INTEGER NOT NULL DEFAULT 1   -- 1 = must complete to be ACTIVE
);
```

**Seed data:**

| slug | title | role | position |
|------|-------|------|----------|
| `profile.complete` | Complete your profile | all | 1 |
| `affiliate.card-order` | Order your QR business card | affiliate | 2 |
| `affiliate.stripe-setup` | Set up payout account | affiliate | 3 |
| `apprentice.intro-call` | Schedule intro call with Maestro | apprentice | 2 |
| `apprentice.skills-survey` | Complete skills survey | apprentice | 3 |

### `onboarding_progress` — per-user completion (migration 039)

```sql
CREATE TABLE onboarding_progress (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  task_id     TEXT NOT NULL,
  completed   INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (user_id, task_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES onboarding_tasks(id)
);
```

---

## Approval → Account Creation Flow

1. Staff moves contact status to `QUALIFIED` via `PATCH /api/v1/crm/contacts/:id`
2. API handler calls `provisionAccount(contactId)`:
   - Creates `users` record (email, generated temp password, role = lowest qualifying role)
   - Sets `contacts.user_id` FK
   - Creates `onboarding_progress` rows for all tasks matching the user's role
   - Sends welcome email with login link and temp password
   - Fires `feed_event` of type `onboarding.account.provisioned`
3. Contact status automatically advances to `ONBOARDING`

### Completion → Active

When all `required = 1` tasks for a user's role are marked complete:
- `contacts.status` → `ACTIVE`
- `users` record remains unchanged
- Feed event fires: `onboarding.completed`

---

## API Routes

### `GET /api/v1/onboarding`

Authenticated user. Returns their task list with completion status.

**Response:**
```json
{
  "tasks": [
    {
      "slug": "profile.complete",
      "title": "Complete your profile",
      "completed": false,
      "position": 1
    },
    {
      "slug": "affiliate.stripe-setup",
      "title": "Set up payout account",
      "completed": true,
      "completed_at": "2026-02-25T14:30:00Z",
      "position": 3
    }
  ],
  "all_required_complete": false
}
```

### `POST /api/v1/onboarding/complete/:slug`

Authenticated user. Marks a task complete. Triggers completion check — if all required tasks done, fires `onboarding.completed` feed event and updates contact status.

### `POST /api/v1/crm/contacts/:id/provision`

Staff-only. Runs the `provisionAccount()` flow. Can only be called when contact is in `QUALIFIED` status. Idempotent — safe to call twice.

---

## Dashboard Onboarding Widget

The dashboard detects incomplete onboarding and displays a checklist above all other content until all required tasks are done.

**States:**

1. **Task list** — All tasks shown with checkboxes. Completed tasks strike-through. Next required task has a "Do this →" button.
2. **All done** — "You're active. Welcome to Studio Ordo." confirmation, collapses after 48 hours.
3. **Hidden** — after 48 hours post-completion.

**Rules:**
- Widget sits at the top of the dashboard grid (above `ActionFeed`, `ReferralCard`, `PayoutActivation`)
- Each task row has a direct action link where applicable:
  - `profile.complete` → `/account/profile`
  - `affiliate.stripe-setup` → triggers existing `PayoutActivation` flow
  - `apprentice.intro-call` → booking URL from `site_settings.contact.booking_url`

---

## Welcome Email

Sent via the existing email infrastructure when `provisionAccount()` runs.

**Subject:** `Welcome to Studio Ordo — your next step`

**Body (plain text):**
```
[Full name],

Your application has been approved.

Your login: [email]
Temporary password: [generated 12-char password]

Log in and complete your onboarding checklist:
[login URL]

If you have any questions, reply to this email or call [phone from site_settings].

— Studio Ordo
```

Temp password is invalidated on first login (force-change flow).

---

## Test Plan

| # | Test | Type |
|---|------|------|
| T1 | `onboarding_tasks` migration creates table with seed data | unit |
| T2 | `onboarding_progress` migration creates table | unit |
| T3 | `POST /api/v1/crm/contacts/:id/provision` creates user and progress rows | unit |
| T4 | Provision is idempotent — calling twice does not duplicate records | unit |
| T5 | `GET /api/v1/onboarding` returns correct tasks for user's role | unit |
| T6 | `POST /api/v1/onboarding/complete/:slug` marks task complete | unit |
| T7 | Completing all required tasks fires `onboarding.completed` feed event | unit |
| T8 | Contact status advances to ACTIVE when onboarding completes | unit |
| T9 | Dashboard shows onboarding widget for user with incomplete tasks | unit |
| T10 | Welcome email contains login link and temp password | unit |

---

## Definition of Done

- [ ] Migration 039 applied — `onboarding_tasks` (with seed) and `onboarding_progress` present
- [ ] `provisionAccount()` creates user, progress rows, sends email, fires feed event
- [ ] `POST /api/v1/crm/contacts/:id/provision` is staff-gated and idempotent
- [ ] Dashboard onboarding widget renders for incomplete users
- [ ] Task completion advances contact to `ACTIVE` when all required done
- [ ] All 10 tests pass
- [ ] `npm run build` clean
