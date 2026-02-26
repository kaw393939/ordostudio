# PAY-01 — Concurrent Checkout TOCTOU + Refund Status Guard

**Area:** `src/lib/api/payments.ts`, `src/cli/db.ts`
**Severity:** Critical
**Category:** Correctness (race condition + missing precondition)

---

## Problem 1 — TOCTOU in `createStripeCheckoutForDeal`

Two concurrent HTTP requests for the same `dealId` can both pass the
`loadLatestPayment` guard (neither yet PAID/REFUNDED), each INSERT a new
`deal_payments` row with a different UUID, and each call Stripe.  Result:
two Stripe checkout sessions and two `CREATED` payment records for one deal.
Only one session will ever be completed; the other becomes an orphan that
persists in DB as `CREATED` forever.

```ts
// Both requests race past here ↓
const existing = loadLatestPayment(db, input.dealId);
if (existing?.status === "PAID") throw ...;   // only guards PAID/REFUNDED
if (existing?.status === "REFUNDED") throw ...;

// Both INSERTs succeed — no UNIQUE constraint
db.prepare(`INSERT INTO deal_payments ...`).run(paymentId, ...);

// Both call Stripe (external, ~1-2 s window)
const session = await createCheckoutSession(...);
```

### Fix 1a — DB migration: partial UNIQUE index

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_payments_created
  ON deal_payments(deal_id)
  WHERE status = 'CREATED';
```

Allows at most one `CREATED` record per deal.  PAID/REFUNDED records are
exempt so the history is preserved.

### Fix 1b — App layer: return existing + catch UNIQUE constraint

Before INSERT, check if `existing?.status === "CREATED"` and return the
existing checkout session (idempotent re-checkout).  If concurrent requests
still race past that check, catch the UNIQUE constraint error and raise a
`PaymentConflictError("checkout_in_progress")`.

---

## Problem 2 — Refund guard misses non-PAID payments

`refundDealPaymentAdmin` blocks on `REFUNDED` but not on `CREATED` (an
unpaid, in-progress checkout):

```ts
if (payment.status === "REFUNDED") throw new PaymentConflictError("already_refunded");
// ← no check for CREATED / never-paid

// Stripe will error here with an opaque "no charge to refund" message
await createRefund({ paymentIntentId: payment.payment_intent_id, ... });
```

### Fix 2

Add `PaymentPreconditionError` reason variant `"payment_not_paid"` and guard:

```ts
if (payment.status !== "PAID") {
  throw new PaymentPreconditionError("payment_not_paid");
}
```

---

## Deliverables

- [ ] Migration `043_deal_payments_created_unique` in `src/cli/db.ts`
- [ ] `createStripeCheckoutForDeal`: idempotent-return existing `CREATED` record;
      UNIQUE constraint catch → `PaymentConflictError("checkout_in_progress")`
- [ ] `refundDealPaymentAdmin`: `if (payment.status !== "PAID")` guard
- [ ] `PaymentPreconditionError.reason` union updated
- [ ] Test: concurrent checkout returns consistent result (idempotency)
- [ ] Test: refund-of-CREATED → `PaymentPreconditionError("payment_not_paid")`
- [ ] All existing payment tests still pass

---

## Acceptance Criteria

1. Two simultaneous calls to `createStripeCheckoutForDeal` with same `dealId`
   produce exactly one `CREATED` row in `deal_payments` and the DB constraint
   prevents a second insert.
2. `refundDealPaymentAdmin` on a `CREATED` payment throws
   `PaymentPreconditionError("payment_not_paid")` before Stripe is called.
3. No regression in existing payment route tests.
