# Sprint 32: Admin Engagements — Sprint Plan

## 1. Tasks

### T1: Audit Current Engagements Stub
- **File:** Find the admin engagements route (grep for "No engagements dashboard" or check `src/app/(admin)/engagements/`).
- **Action:** Read the current stub. Note:
  - Route path
  - What data model (if any) exists for engagements in the DB schema
  - Whether a DB table for engagements already exists (project uses better-sqlite3, not Prisma)
  - Whether a ledger table exists with `PLATFORM_REVENUE`, `REFERRER_COMMISSION` entry types
- **Why:** Before building any UI, understand what the data layer provides.

---

### T2: Define or Extend Data Model
- **Action (if engagement table doesn't exist):**
  Add to the DB schema (raw SQL — project uses better-sqlite3, same pattern as `feed_events` in Sprint 33 and `payout_tax_info` in Sprint 34):
  ```sql
  CREATE TABLE IF NOT EXISTS engagements (
    id             TEXT PRIMARY KEY,
    type           TEXT NOT NULL CHECK(type IN ('PROJECT_COMMISSION','MAESTRO_TRAINING')),
    client_name    TEXT,
    student_id     TEXT,
    project_type   TEXT,
    total_value    INTEGER,          -- stored in cents
    commission     INTEGER,          -- auto-set as total_value * AFFILIATE_COMMISSION_RATE (once Sprint 34 T1 is done)
    referral_code  TEXT,
    track          TEXT CHECK(track IN ('cohort','advisory')),
    cohort_start   TEXT,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING','RECEIVED','REFUNDED')),
    status         TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED')),
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
  CREATE INDEX IF NOT EXISTS idx_engagements_referral_code ON engagements(referral_code);
  ```
  Add this SQL to the DB initialisation script (wherever `openCliDb()` runs `CREATE TABLE IF NOT EXISTS` for other tables — check `src/cli/db.ts` or equivalent).
- **Action (if table exists):** Add any missing columns found in T1 using `ALTER TABLE`.
- **Note on commission column:** Until Sprint 34 T1 creates `AFFILIATE_COMMISSION_RATE`, compute as `total_value * 0.20`. After Sprint 34, replace the hardcoded `0.20` with the constant. See T4 note.

---

### T3: Build Engagements List Page
- **File:** `src/app/(admin)/engagements/page.tsx`
- **Action:** Replace stub with a server component that fetches and displays engagements in a table. Columns: client/student name, type, total value, commission, payment status, engagement status.
- Include tab filter: All / Project Commissions / Maestro Training.
- `"+ New Engagement"` button links to the create form.

---

### T4: Build New Engagement Form
- **File:** `src/app/(admin)/engagements/new/page.tsx`
- **Action:** Two-step form. Step 1: select type (Project Commission or Maestro Training). Step 2: type-specific fields based on `02-ux-design.md`.
- Commission field on Project Commission: auto-calculates `totalValue * 0.20`, displayed read-only. (**After Sprint 34 T1 runs:** replace `0.20` with `AFFILIATE_COMMISSION_RATE` from `@/lib/constants/commissions`.)
- Use server action for form submission.

---

### T5: Engagement Detail Page + Completion Action
- **File:** `src/app/(admin)/engagements/[id]/page.tsx`
- **Action:**
  1. Render engagement detail (all fields, read-only).
  2. `"Mark as Completed"` button — triggers a server action:
     - Sets `status = COMPLETED` on the engagement
     - Creates a `PLATFORM_REVENUE` ledger entry for the commission amount
     - If `referralCode` is present on the engagement: creates a `REFERRER_COMMISSION` ledger entry at `commission * AFFILIATE_COMMISSION_RATE` (20% of Studio Ordo's fee). Import `AFFILIATE_COMMISSION_RATE` from `@/lib/constants/commissions` — if Sprint 34 has not run yet, temporarily use `0.20` and update to the constant when Sprint 34 T1 runs.
  3. Confirm ledger entry schema matches what the ledger module expects. Read the existing ledger code before writing entries.

---

### T6: Verify + Build
- **Action:**
  1. Confirm `engagements` table exists in DB (run the SQL migration script against the local DB if not already applied).
  2. `npx vitest run` — no new failures.
  3. `npm run build` — no errors.
  4. Manual: `/admin/engagements` shows real module, not stub.
  5. Manual: Create a Project Commission engagement — verify commission auto-calculates.
  6. Manual: Mark engagement as Completed — verify ledger entries created.
  7. Manual: Mark engagement with `referralCode` as Completed — verify `REFERRER_COMMISSION` entry created.

---

## 2. Dependency Graph

```
T1 (audit data model)
     │
     ▼
T2 (define/extend model + migrate)
     │
     ├──► T3 (list page)
     ├──► T4 (new engagement form)
     └──► T5 (detail + completion action)
               │
               ▼
          T6 (verify + build)
```

**Note:** Sprint 32 is fully independent. It can be picked up at any time during the Sprint 24–31 sequence.
