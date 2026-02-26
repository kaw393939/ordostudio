# FIN-04 — Money comparison methods + 3-way split invariant test

**Category:** Completeness / documentation-as-tests (Knuth audit)  
**Priority:** Low  
**Effort:** ~30 minutes

---

## Finding A — No comparison methods on `Money`

**Location:** `src/core/domain/money.ts`

`Money` has `isZero()` and `isPositive()` but nothing for ordered comparisons.
Any time code needs to check "is the payout amount above the minimum payout
threshold?" it must access `.amountCents` directly, bypassing the value object.

Example of current workaround pattern (scattered in route handlers):
```ts
if (entry.amount_cents >= MIN_PAYOUT_CENTS) { ... }
```

**Fix:** Add `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`:

```ts
greaterThan(other: Money): boolean {
  assertSameCurrency(this, other);
  return this.amountCents > other.amountCents;
}

lessThan(other: Money): boolean {
  assertSameCurrency(this, other);
  return this.amountCents < other.amountCents;
}

greaterThanOrEqual(other: Money): boolean {
  assertSameCurrency(this, other);
  return this.amountCents >= other.amountCents;
}

lessThanOrEqual(other: Money): boolean {
  assertSameCurrency(this, other);
  return this.amountCents <= other.amountCents;
}
```

---

## Finding B — 3-way split invariant is implicit, not tested

**Location:** `src/lib/api/ledger.ts` — `ensureLedgerEarnedForDeliveredDeal`

The formula:
```ts
const platformRevenue = gross.subtract(referrerCommission).subtract(providerPayout);
```

is correct by construction (remainder approach), but no test explicitly asserts:

```
providerPayout + referrerCommission + platformRevenue === gross.amountCents
```

This property silently breaks if someone changes the split formula to use
independent rate applications for all three entries (the naive mistake is
applying `platformRate = 0.2` directly instead of taking the remainder).

**Fix:** Add to `money.test.ts` a parametric sweep:

```ts
describe("3-way split invariant", () => {
  const cases = [100, 333, 999, 1000, 10000, 99999];
  it.each(cases)("gross=%i: provider + referrer + platform === gross", (grossCents) => {
    const gross = Money.cents(grossCents, "USD");
    const referrer = gross.multiplyRate(AFFILIATE_COMMISSION_RATE);
    const provider = gross.multiplyRate(PROVIDER_PAYOUT_RATE);
    const platform = gross.subtract(referrer).subtract(provider);
    expect(referrer.amountCents + provider.amountCents + platform.amountCents)
      .toBe(gross.amountCents);
  });
});
```

This test is the machine-checked version of the mathematical invariant and will
catch any future floor/round change that breaks it.

---

## Deliverables

- [ ] `src/core/domain/money.ts` — add `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`
- [ ] `src/core/domain/__tests__/money.test.ts` — add comparison tests + 3-way split invariant suite
- [ ] Note: 3-way split test imports `AFFILIATE_COMMISSION_RATE` and `PROVIDER_PAYOUT_RATE` from `commissions.ts` (requires FIN-02 to be complete first, or inline the constants)

---

## Tests to add

```ts
describe("Money — comparison", () => {
  it("greaterThan returns true when left > right", ...);
  it("greaterThan returns false when equal", ...);
  it("lessThan returns true when left < right", ...);
  it("greaterThanOrEqual handles equality", ...);
  it("lessThanOrEqual handles equality", ...);
  it("comparison throws on currency mismatch", ...);
});

describe("3-way commission split invariant", () => {
  // parametric over gross amounts including fractional-cent floor cases
});
```
