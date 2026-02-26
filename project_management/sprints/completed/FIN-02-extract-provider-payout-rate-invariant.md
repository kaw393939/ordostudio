# FIN-02 — Extract PROVIDER_PAYOUT_RATE + assert rate invariant

**Category:** Constants / correctness (Knuth audit)  
**Priority:** Medium  
**Effort:** ~30 minutes

---

## Finding

**Location:** `src/lib/api/ledger.ts` (top of file)

```ts
const REFERRER_COMMISSION_RATE = AFFILIATE_COMMISSION_RATE;
const PROVIDER_PAYOUT_RATE = 0.6;
```

`PROVIDER_PAYOUT_RATE = 0.6` is a magic local constant, while
`AFFILIATE_COMMISSION_RATE = 0.20` is exported from `src/lib/constants/commissions.ts`.
The relationship between them — specifically the invariant that their sum must
not exceed 1.0 — is documented nowhere in code or tests.

If either rate is ever changed independently, the silent clamping in
`Money.subtract` (pre FIN-01) would hide the resulting negative platform revenue.
After FIN-01 lands, `Money.subtract` will throw — but only at runtime.
An import-time assertion is preferable.

---

## Fix

**`src/lib/constants/commissions.ts`:**

```ts
/**
 * Rate paid to the service provider (instructor/maestro).
 * 60% of the gross deal value.
 */
export const PROVIDER_PAYOUT_RATE = 0.60;

/**
 * The commission rate paid to affiliates/referrers.
 * 20% of the gross deal value.
 */
export const AFFILIATE_COMMISSION_RATE = 0.20;

/**
 * Asserts that the payout rates are financially consistent:
 * provider + affiliate must not exceed 100% (platform must take ≥ 0%).
 *
 * Evaluated at import time so a mis-configuration throws immediately
 * rather than silently corrupting ledger entries at runtime.
 */
const _totalPayoutRate = PROVIDER_PAYOUT_RATE + AFFILIATE_COMMISSION_RATE;
if (_totalPayoutRate > 1.0) {
  throw new Error(
    `Commission rate invariant violated: PROVIDER_PAYOUT_RATE (${PROVIDER_PAYOUT_RATE}) + ` +
    `AFFILIATE_COMMISSION_RATE (${AFFILIATE_COMMISSION_RATE}) = ${_totalPayoutRate} > 1.0`,
  );
}
```

**`src/lib/api/ledger.ts`:**

```ts
import { AFFILIATE_COMMISSION_RATE, PROVIDER_PAYOUT_RATE } from "@/lib/constants/commissions";

// Remove the local re-declarations:
// const REFERRER_COMMISSION_RATE = AFFILIATE_COMMISSION_RATE;  ← delete
// const PROVIDER_PAYOUT_RATE = 0.6;                           ← delete
```

---

## Deliverables

- [ ] `src/lib/constants/commissions.ts` — add `PROVIDER_PAYOUT_RATE`, rate invariant assertion
- [ ] `src/lib/api/ledger.ts` — import `PROVIDER_PAYOUT_RATE`, remove local constants
- [ ] `src/lib/__tests__/commissions.test.ts` (new) — verify constants are correct values and invariant passes

---

## Tests to add

```ts
it("PROVIDER_PAYOUT_RATE is 0.60", () => {
  expect(PROVIDER_PAYOUT_RATE).toBe(0.60);
});
it("total payout rate does not exceed 1.0", () => {
  expect(PROVIDER_PAYOUT_RATE + AFFILIATE_COMMISSION_RATE).toBeLessThanOrEqual(1.0);
});
```
