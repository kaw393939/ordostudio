# Maestro-00b: DB Gap Closure — Architecture

**Sprint:** `sprint-maestro-00b-db-gaps`

---

## Migrations

### Migration 044 — Missing Roles Seed

**File:** `src/cli/db.ts`

There is no new table. The roles table is seeded in the DB init. Add the three missing roles to the seeding block:

```typescript
{
  name: "044_missing_roles_seed",
  sql: `
INSERT OR IGNORE INTO roles (id, name, description) VALUES
  ('role_associate',              'ASSOCIATE',              'Vetted practitioner, can take referral clients'),
  ('role_certified_consultant',   'CERTIFIED_CONSULTANT',   'Studio Ordo certified; can teach under the brand'),
  ('role_staff',                  'STAFF',                  'Internal operations; full ops agent access');
`,
}
```

**Why INSERT OR IGNORE:** idempotent. Running migrate twice is safe.

---

### Migration 045 — `referral_conversions` Extend Conversion Type

**File:** `src/cli/db.ts`

Existing table uses `conversion_type TEXT NOT NULL DEFAULT 'INTAKE_REQUEST'`. The column needs to accept `INVOICE_PAID` as well. SQLite does not have `ALTER COLUMN` — enforce at the application layer instead with a `CHECK` added to a new column or by using `STRICT` table declaration going forward.

Pragmatic approach: add a `CHECK` via a lookup/comment in the API layer (no migration needed for CHECK on existing column in SQLite without recreating the table). Document the new accepted value and enforce in application code:

```typescript
// In src/lib/api/referrals.ts — recordReferralConversion()
const VALID_CONVERSION_TYPES = ['INTAKE_REQUEST', 'INVOICE_PAID'] as const;
```

**No migration 045 needed** — enforce in code for now. Flag for next table rebuild.

---

### Bug Fix A — Self-Referral Block

**File:** `src/app/r/[code]/route.ts` (referral click resolution)

```typescript
// After resolving the referral code to an owner user_id:
if (session?.userId && session.userId === referralCode.user_id) {
  // Self-referral: silently redirect without setting cookie
  return NextResponse.redirect(targetUrl);
}
```

**Also:** In `src/lib/api/intake.ts` (or wherever intake+referral conversion is created), add:
```typescript
if (referralCode?.user_id === intakeSubmittedByUserId) {
  throw new Error('Self-referral not permitted');
}
```

Policy rule 3: "Self-referral must be blocked."

---

### Bug Fix B — Double-Booking Guard

**File:** `src/lib/api/bookings.ts` (or `create_booking` implementation)

Before inserting the booking row, check:
```typescript
const existing = db.prepare(`
  SELECT id FROM bookings WHERE slot_id = ? AND status != 'CANCELLED'
`).get(slotId);

if (existing) {
  return { error: 'Slot already booked' };
}
```

This check must be inside the same `db.transaction()` as the INSERT to prevent TOCTOU race (same pattern as TOCTOU fixes in previous sprints).

Policy rule 1: "No double-booking a slot."

---

### Bug Fix C — Refund Voids Commission

**File:** `src/app/api/v1/webhooks/stripe/route.ts`

In the handler for `charge.refunded` (or `payment_intent.payment_failed`):

```typescript
// After identifying the payment row, void associated ledger entries:
db.transaction(() => {
  db.prepare(`
    UPDATE ledger_entries
    SET status = 'VOID', metadata = json_patch(metadata, '{"voided_reason": "stripe_refund", "voided_at": ?}')
    WHERE deal_id = ? AND entry_type = 'REFERRER_COMMISSION' AND status IN ('EARNED', 'APPROVED')
  `).run(new Date().toISOString(), dealId);

  db.prepare(`
    UPDATE ledger_entries
    SET status = 'VOID', metadata = json_patch(metadata, '{"voided_reason": "stripe_refund", "voided_at": ?}')
    WHERE deal_id = ? AND entry_type = 'PLATFORM_REVENUE' AND status IN ('EARNED', 'APPROVED')
  `).run(new Date().toISOString(), dealId);
})();
```

Policy rule 8: "Commission voided on refund."

---

## Files Touched Summary

| File | Change | Migration? |
|------|--------|------------|
| `src/cli/db.ts` | Add migration 044 (role seed) | ✅ 044 |
| `src/app/r/[code]/route.ts` | Self-referral block at click time | ❌ no migration |
| `src/lib/api/intake.ts` | Self-referral block at intake creation | ❌ no migration |
| `src/lib/api/bookings.ts` | Double-booking guard in transaction | ❌ no migration |
| `src/app/api/v1/webhooks/stripe/route.ts` | Void ledger on refund | ❌ no migration |
| `src/lib/api/referrals.ts` | Add `INVOICE_PAID` to valid conversion type const | ❌ no migration |

---

## No New Tests from Framework, But Tests Required

| Test | What to test |
|------|-------------|
| Self-referral: `intake.test.ts` | Expect error when submitter userId matches referral code owner |
| Double-booking: `bookings.test.ts` | Expect `{ error }` on second booking of same slot |
| Refund commission void: `stripe-webhook.test.ts` | Mock charge.refunded event, assert ledger rows status = VOID |
| Role seed: `db.test.ts` | Query roles table after migrate, assert ASSOCIATE, CERTIFIED_CONSULTANT, STAFF rows exist |
