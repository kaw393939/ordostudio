# FIN-01 — Money.subtract underflow + ledger duplicate-entry race

**Category:** Correctness (Knuth audit)  
**Priority:** Critical  
**Effort:** ~2 hours

---

## Background

Two independent correctness bugs were found during the financial domain audit.
They are grouped together because both can cause silent data corruption.

---

## Finding 1 — `Money.subtract` silently clamps to zero on underflow

**Location:** `src/core/domain/money.ts` — `subtract()` method

**Current code:**
```ts
subtract(other: Money): Money {
  assertSameCurrency(this, other);
  const result = this.amountCents - other.amountCents;
  return new Money(result < 0 ? 0 : result, this.currency);
}
```

**Problem:**  
If a caller accidentally subtracts more than the balance, the result is silently
`$0.00` instead of an error. In financial logic this masks bugs — e.g. the
3-way ledger split formula
`gross.subtract(referrerCommission).subtract(providerPayout)` would silently
produce a zero platform-revenue entry if the rates were ever misconfigured to
exceed 100%.

**Fix:**  
Throw `InvalidInputError("money_underflow")` instead of clamping. Rename the
silent variant to `subtractSaturating` so intentional clamping is explicit.

```ts
subtract(other: Money): Money {
  assertSameCurrency(this, other);
  const result = this.amountCents - other.amountCents;
  if (result < 0) {
    throw new InvalidInputError("money_underflow");
  }
  return new Money(result, this.currency);
}

/** Subtracts, clamping to zero instead of throwing. Use only where underflow is intentional. */
subtractSaturating(other: Money): Money {
  assertSameCurrency(this, other);
  const result = this.amountCents - other.amountCents;
  return new Money(result < 0 ? 0 : result, this.currency);
}
```

Update the 3-way split formula in `ledger.ts`:
```ts
// safe: rates 0.6 + 0.2 = 0.8 ≤ 1.0, but now throws if invariant breaks
const platformRevenue = gross.subtract(referrerCommission).subtract(providerPayout);
```

Update the existing `money.test.ts` test that asserts clamping:
```ts
// was: "subtract clamps to zero when result would be negative"
it("subtract throws on underflow", () => {
  expect(() => Money.cents(100, "USD").subtract(Money.cents(500, "USD"))).toThrow("money_underflow");
});

it("subtractSaturating clamps to zero", () => {
  expect(Money.cents(100, "USD").subtractSaturating(Money.cents(500, "USD")).amountCents).toBe(0);
});
```

---

## Finding 2 — TOCTOU race: `ensureLedgerEarnedForDeliveredDeal` has no DB-level uniqueness guard

**Location:** `src/lib/api/ledger.ts` — `ensureLedgerEarnedForDeliveredDeal()`

**Problem:**  
```ts
const existing = db.prepare("SELECT COUNT(1)...").get(dealId); // read
if (existing.count > 0) return;                                 // check
// ... INSERT three rows                                        // write
```

Two concurrent webhook deliveries for the same deal can both read `count = 0`
before either commits, resulting in 6 ledger rows instead of 3. There is no
`UNIQUE` constraint on `(deal_id, entry_type)` in `ledger_entries`.

**Fix — DB migration:**  
Add a new migration to `src/cli/db.ts`:
```sql
-- migration 040_ledger_unique_deal_entry_type
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_deal_entry_type
  ON ledger_entries(deal_id, entry_type)
  WHERE deal_id IS NOT NULL;
```

This makes any duplicate insert fail at the DB level (SQLite `UNIQUE` constraint
violation) regardless of application-level race conditions.

**Fix — application layer:**  
In `ensureLedgerEarnedForDeliveredDeal`, wrap the INSERT logic in a transaction
and catch the unique-constraint error as a no-op:

```ts
try {
  db.transaction(() => {
    // check + inserts
  })();
} catch (err: unknown) {
  if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
    // idempotent — already created by a concurrent request
    return;
  }
  throw err;
}
```

---

## Deliverables

- [ ] `src/core/domain/money.ts` — add `subtractSaturating`, change `subtract` to throw
- [ ] `src/core/domain/__tests__/money.test.ts` — update underflow test
- [ ] `src/lib/api/ledger.ts` — wrap inserts in transaction + catch unique violation
- [ ] `src/cli/db.ts` — migration `040_ledger_unique_deal_entry_type`
- [ ] `src/core/domain/__tests__/ledger-lifecycle.test.ts` — no changes needed
- [ ] Integration test: `ensureLedgerEarnedForDeliveredDeal` called twice for same deal → second call is a no-op

---

## Tests to add / modify

1. `money.test.ts`: `subtract throws on underflow` (modify existing)
2. `money.test.ts`: `subtractSaturating clamps to zero` (new)
3. `e2e-ledger.test.ts` or new unit test: calling `ensureLedgerEarnedForDeliveredDeal` twice produces exactly 3 rows
