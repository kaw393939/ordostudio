# Real Workflow Verification (What Works Today)

This repo has a lot of surface area. The fastest way to get it “under control” is to **verify the real operator workflows** (admin + user) and capture gaps as issues.

This doc is intentionally practical: it maps **work processes → UI routes → existing automated checks**.

Date: 2026-02-22

---

## 0) Baseline: seed deterministic data

Run:
- `npm run seed:localhost`

Purpose:
- Creates realistic local content so admin lists and workflows have something to operate on.

---

## 1) Quick proof: the system renders and routes exist

Run:
- `npm run test:e2e -- e2e/critical-flows.spec.ts`

This confirms:
- Public auth pages render.
- `/events` renders.
- Admin routes are behind an auth gate.

---

## 2) Admin “tour” proof (populated UI pages)

Run:
- `npm run test:e2e -- e2e/inflate-realistic-data.spec.ts -g "Phase 10"`

What it does:
- Recreates an admin session cookie.
- Visits a list of admin pages and checks the page body contains expected text.

If it prints “GAPS FOUND…”, treat that as the first-pass “what’s broken in the UI right now” report.

---

## 3) Real operator workflows (manual checklist)

### A) Events operations (admin)

UI paths:
- `/admin/events` (list, create)
- `/admin/events/[slug]` (edit, publish/cancel)
- `/admin/events/[slug]/registrations` (add/cancel/check-in)
- `/admin/events/[slug]/export` (csv/json exports)

Manual steps:
1. Create an event.
2. Publish it (button appears only when available).
3. Open Registrations and add a registration.
4. Check-in the registration.
5. Export CSV/JSON and confirm governance (PII constraints) matches expectations.
6. Cancel the event and confirm state-driven action affordances change.

Automated evidence:
- See E2E coverage described in `project_management/sprints/completed/sprint-24-e2e-admin-operations-security.md`.

### B) Users operations (admin)

UI paths:
- `/admin/users`

Manual steps:
1. Load users and confirm you can find a known seeded user.
2. Enable/disable user (if present).
3. Assign ADMIN role idempotently (no duplication / no escalation beyond allowed roles).

### C) Intake → Deal lifecycle (admin)

UI paths:
- `/services/request` (public intake)
- `/admin/intake` (triage)
- `/admin/deals` + `/admin/deals/[id]` (conversion + operations)

Manual steps:
1. Submit an intake request.
2. Confirm it appears in admin triage.
3. Convert to a deal and verify state changes.

### D) Ledger / payments (admin)

UI paths:
- `/admin/ledger`

Manual steps:
1. Locate ledger entries created via seeded data or test flows.
2. Verify approvals and export behave as expected.

### E) Audit / operability

UI paths:
- `/admin/audit`

Manual steps:
1. Perform any mutation (event update, registration change).
2. Confirm an audit log entry exists with a usable timestamp + request_id.

---

## 4) What to write down as you test

For each gap, record:
- Page URL
- Expected outcome (what the operator is trying to do)
- Actual outcome (including screenshot)
- Whether it’s:
  - **Workflow-blocking** (can’t complete the process)
  - **UI clarity** (can complete, but confusing/slow)
  - **Data correctness** (completes but wrong)

---

## 5) Canonical “what exists” sources (don’t guess)

If you’re unsure whether something is supposed to exist, start here:
- `business/studio-ordo/system-specs/scope.md`
- `business/studio-ordo/system-specs/ui-routes.md`
- `business/studio-ordo/system-specs/capability-map.md`
- `docs/dual-lens-admin-user-ux-audit.md`
