# Maestro-00b: DB Gap Closure — Sprint Tasks

**Sprint:** `sprint-maestro-00b-db-gaps`

---

## T1 — Add migration 044: missing roles seed

**File:** `src/cli/db.ts`

Find the migrations array. After migration `043_deal_payments_unique_created`, append:

```typescript
{
  name: "044_missing_roles_seed",
  sql: `
INSERT OR IGNORE INTO roles (id, name, description) VALUES
  ('role_associate',              'ASSOCIATE',              'Vetted practitioner, eligible for client referrals'),
  ('role_certified_consultant',   'CERTIFIED_CONSULTANT',   'Studio Ordo certified; authorized to teach under brand'),
  ('role_staff',                  'STAFF',                  'Internal operations; has Maestro ops agent access');
`,
},
```

Run: `npx tsx src/cli/cli.ts db migrate`

**Acceptance:** No error. Roles present in DB.

---

## T2 — Test: roles seed

**File:** `src/lib/api/__tests__/roles.test.ts` (or `db.test.ts`)

```typescript
it('seeds ASSOCIATE, CERTIFIED_CONSULTANT, STAFF roles', () => {
  const roles = db.prepare(
    "SELECT name FROM roles WHERE name IN ('ASSOCIATE', 'CERTIFIED_CONSULTANT', 'STAFF')"
  ).all() as { name: string }[];
  expect(roles.map(r => r.name).sort()).toEqual(
    ['ASSOCIATE', 'CERTIFIED_CONSULTANT', 'STAFF'].sort()
  );
});
```

**Acceptance:** Test passes.

---

## T3 — Self-referral block at referral click

**File:** `src/app/r/[code]/route.ts`

After resolving the code to a `referralCode` object (which has `user_id`):

```typescript
const session = await getSession(request);
if (session?.userId && session.userId === referralCode.user_id) {
  // Silent pass-through: no referral cookie, just redirect
  const response = NextResponse.redirect(destinationUrl);
  return response;
}
```

**Acceptance:** No cookie written when referrer is also the visitor.

---

## T4 — Self-referral block at intake creation

**File:** `src/lib/api/intake.ts` (or wherever `createIntakeRequest()` lives)

Before inserting:
```typescript
if (submittedByUserId && referralCode?.user_id === submittedByUserId) {
  throw new Error('Self-referral not permitted');
}
```

**Acceptance:** `createIntakeRequest()` throws when called with matching userId and referralCode owner.

---

## T5 — Test: self-referral

```typescript
it('blocks self-referral at intake creation', () => {
  expect(() => createIntakeRequest({
    userId: 'user-123',
    referralCodeOwnerId: 'user-123', // same person
    ...
  })).toThrow('Self-referral not permitted');
});
```

---

## T6 — Double-booking guard

**File:** `src/lib/api/bookings.ts` (find `createBooking()` or equivalent)

Wrap existing INSERT in a transaction if not already. Add existence check before INSERT:

```typescript
export function createBooking(slotId: string, userId: string): BookingResult {
  return db.transaction(() => {
    const conflict = db.prepare(
      "SELECT id FROM bookings WHERE slot_id = ? AND status != 'CANCELLED'"
    ).get(slotId);
    if (conflict) return { error: 'Slot is already booked' };

    // ... existing INSERT ...
    return { booking: { id: newId, slotId, userId } };
  })();
}
```

---

## T7 — Test: double-booking

```typescript
it('blocks double-booking the same slot', () => {
  const slotId = 'slot-test-001';
  createTestSlot(slotId); // helper: insert into maestro_availability
  const first = createBooking(slotId, 'user-aaa');
  expect(first).not.toHaveProperty('error');
  const second = createBooking(slotId, 'user-bbb');
  expect(second).toHaveProperty('error', 'Slot is already booked');
});
```

---

## T8 — Stripe refund → void commission

**File:** `src/app/api/v1/webhooks/stripe/route.ts`

Find the `charge.refunded` or `invoice.voided` handler. Add commission voiding:

```typescript
case 'charge.refunded': {
  const chargeId = event.data.object.id;
  // Resolve to dealId via payments table
  const payment = db.prepare(
    "SELECT deal_id FROM payments WHERE stripe_charge_id = ?"
  ).get(chargeId) as { deal_id: string } | undefined;

  if (payment?.deal_id) {
    db.transaction(() => {
      db.prepare(`
        UPDATE ledger_entries
        SET status = 'VOID',
            metadata = json_patch(COALESCE(metadata, '{}'), ?)
        WHERE deal_id = ?
          AND entry_type IN ('REFERRER_COMMISSION', 'PLATFORM_REVENUE')
          AND status IN ('EARNED', 'APPROVED')
      `).run(
        JSON.stringify({ voided_reason: 'stripe_refund', voided_at: new Date().toISOString() }),
        payment.deal_id
      );
    })();
  }
  break;
}
```

---

## T9 — Test: commission void on refund

```typescript
it('voids commission entries when Stripe refund received', () => {
  // Seed: deal + payment + ledger entry
  const dealId = seedTestDeal();
  seedLedgerEntry(dealId, 'REFERRER_COMMISSION', 'EARNED');

  // Fire the webhook handler
  handleStripeWebhook({ type: 'charge.refunded', data: { object: { id: 'ch_test' } } });

  // Assert
  const entry = db.prepare(
    "SELECT status FROM ledger_entries WHERE deal_id = ? AND entry_type = 'REFERRER_COMMISSION'"
  ).get(dealId) as { status: string };
  expect(entry.status).toBe('VOID');
});
```

---

## T10 — Commit

```bash
git add src/cli/db.ts src/app/r/ src/lib/api/ src/app/api/v1/webhooks/
git commit -m "fix(db): add missing roles seed; enforce self-referral block, double-booking guard, refund commission void"
git push origin main
```
