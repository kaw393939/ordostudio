# Sprint 38: Onboarding Workflow — Sprint Plan

## Tasks

### T1: Migration 039 — Onboarding Tables
- **File:** `src/cli/db.ts`
- Add migration `039_onboarding_workflow` with `onboarding_tasks` (seeded) and `onboarding_progress` tables.
- Full schema + seed values in `docs/agent_planning/04-onboarding-workflow.md`.
- Run `APPCTL_DB_FILE=./data/app.db npm run cli -- db migrate`

---

### T2: Account Provisioning Library
- **File:** `src/lib/api/provisioning.ts`
- Export `provisionAccount(db, contactId)`:
  1. Load contact (error if not QUALIFIED)
  2. Check if `users` record already exists for `contact.email` — if so, skip creation (idempotent)
  3. Create `users` record with generated temp password
  4. Set `contacts.user_id = newUser.id`, `contacts.status = 'ONBOARDING'`
  5. Load `onboarding_tasks` for user's role; create `onboarding_progress` rows
  6. Send welcome email (use existing email utility)
  7. Call `writeFeedEvent()` with type `onboarding.account.provisioned`

---

### T3: Provision API Route
- **File:** `src/app/api/v1/crm/contacts/[id]/provision/route.ts`
- `POST` — staff only. Calls `provisionAccount()`. Returns `{ user_id, email }`.
- 400 if contact not in QUALIFIED status.
- 409 if user account already exists (idempotent — return existing user_id).

---

### T4: Onboarding API Routes
- **File:** `src/app/api/v1/onboarding/route.ts` — `GET`, authenticated, returns task list with completion status
- **File:** `src/app/api/v1/onboarding/complete/[slug]/route.ts` — `POST`, authenticated, marks task complete, triggers completion check

---

### T5: Completion Check
- **File:** `src/lib/api/provisioning.ts` — export `checkOnboardingComplete(db, userId)`:
  - Load all required tasks for user's role
  - If all have `completed = 1`: update `contacts.status = 'ACTIVE'`, fire `onboarding.completed` feed event
  - Called from `POST /api/v1/onboarding/complete/:slug`

---

### T6: Dashboard Onboarding Widget
- **File:** `src/components/dashboard/onboarding-checklist.tsx`
- Props: `tasks: OnboardingTask[]`
- Renders checklist per UX spec (above ActionFeed etc.)
- Update `dashboard/page.tsx` to fetch `/api/v1/onboarding` and render widget when incomplete tasks exist

---

### T7: Add Provision Button to Contact Detail UI
- **File:** `src/app/(admin)/crm/contacts/[id]/page.tsx`
- Show "Approve & Create Account" button when `contact.status === 'QUALIFIED'`
- On click: confirm dialog → `POST /api/v1/crm/contacts/:id/provision` → show success

---

### T8: Write Tests (10 tests)

---

### T9: QA
