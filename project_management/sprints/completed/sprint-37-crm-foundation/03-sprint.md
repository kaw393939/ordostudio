# Sprint 37: CRM Foundation — Sprint Plan

## Tasks

### T1: Migration 038 — `contacts` Table
- **File:** `src/cli/db.ts`
- Add migration `038_contacts_crm` with `contacts` table DDL and `ALTER TABLE intake_requests ADD COLUMN contact_id TEXT REFERENCES contacts(id)`.
- Full schema in `docs/agent_planning/03-crm-foundation.md`.
- Run `APPCTL_DB_FILE=./data/app.db npm run cli -- db migrate`

---

### T2: Contact Library
- **File:** `src/lib/api/contacts.ts`
- Export `upsertContact(db, { email, fullName?, source })`: INSERT OR IGNORE on email, returns contact row
- Export `getContact(db, id)`: returns full contact with linked intake count
- Export `listContacts(db, filters)`: paginated, filterable by status/source/assigned_to
- Export `updateContact(db, id, { status?, notes?, assigned_to? })`: validates lifecycle transitions

---

### T3: Hook Contact Creation into All Intake Paths
- **File:** `src/app/api/v1/intake/route.ts` — call `upsertContact()` after intake insert
- **File:** `src/lib/api/agent-tools.ts` (Sprint 36) — `submit_intake` tool already calls the intake route; ensure contact upsert fires
- **File:** `src/app/api/v1/referral/convert/route.ts` — call `upsertContact()` on referral conversion

---

### T4: CRM API Routes
- **File:** `src/app/api/v1/crm/contacts/route.ts` — `GET` (paginated list) staff-only
- **File:** `src/app/api/v1/crm/contacts/[id]/route.ts` — `GET` (detail), `PATCH` (update status/notes/assigned_to)
- **File:** `src/app/api/v1/crm/pipeline/route.ts` — `GET` returns `{ LEAD: n, QUALIFIED: n, ... }`

---

### T5: CRM UI Pages
- **File:** `src/app/(admin)/crm/page.tsx` — pipeline board (kanban columns)
- **File:** `src/app/(admin)/crm/contacts/[id]/page.tsx` — contact detail

---

### T6: Nav + Footer Changes
- Remove login/register links from primary nav component
- Add `[Login]` and `[Staff access]` to site footer, de-emphasized

---

### T7: Write Tests (10 tests)

---

### T8: QA
