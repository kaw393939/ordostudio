# FIN-03 — Unify commission math: use Money.multiplyRate in referrals report

**Category:** DRY / correctness (Knuth audit)  
**Priority:** Medium  
**Effort:** ~1 hour

---

## Finding

**Location:** `src/lib/api/referrals.ts:326`

```ts
const commission = Math.floor(grossAccepted * AFFILIATE_COMMISSION_RATE);
```

There are now **two independent implementations** of "apply the commission rate
to a cents amount":

| Location | Implementation |
|---|---|
| `src/lib/api/ledger.ts` | `gross.multiplyRate(REFERRER_COMMISSION_RATE)` via `Money` value object |
| `src/lib/api/referrals.ts` | `Math.floor(grossAccepted * AFFILIATE_COMMISSION_RATE)` raw |

Both are numerically equivalent today (`Math.floor` === `Money.multiplyRate`'s
floor), but:

1. They're required to stay in sync. A future change that adjusts `multiplyRate`
   (e.g. to use banker's rounding) would affect only the ledger path, causing
   the referral report totals to diverge from actual ledger entries.

2. The raw path bypasses `Money`'s currency validation and integer enforcement,
   making it easier to introduce float drift if `grossAccepted` is ever read from
   a DB column that returns a float.

---

## Fix

In `src/lib/api/referrals.ts`, replace the raw math with `Money.multiplyRate`:

```ts
import { Money } from "@/core/domain/money";

// Remove raw line:
// const commission = Math.floor(grossAccepted * AFFILIATE_COMMISSION_RATE);

// Replace with:
const grossMoney = Money.cents(grossAccepted, row.currency ?? "USD");
const commissionMoney = grossMoney.multiplyRate(AFFILIATE_COMMISSION_RATE);
const commission = commissionMoney.amountCents;
```

The `row` type from the SQL query must include `currency`:
```ts
.all() as Array<{
  user_id: string;
  user_email: string;
  code: string;
  clicks: number;
  conversions: number;
  gross_accepted_cents: number;
  currency: string;  // ← add to SELECT and type
}>;
```

Update the SQL query to include `currency` from the `proposals` table:
```sql
SUM(CASE WHEN p.status = 'ACCEPTED' THEN p.amount_cents ELSE 0 END) as gross_accepted_cents,
MAX(p.currency) as currency   -- all proposals share a currency per user; MAX is safe
```

---

## Deliverables

- [ ] `src/lib/api/referrals.ts` — replace raw `Math.floor` with `Money.multiplyRate`
- [ ] Update SQL query to surface `currency` column
- [ ] Update row TypeScript type annotation
- [ ] `src/app/__tests__/e2e-commission-math.test.ts` — add test that ledger entry commission === referral report commission for same deal (cross-path parity test)

---

## Tests to add / modify

Add to `e2e-commission-math.test.ts`:

```ts
it("ledger REFERRER_COMMISSION entry matches referral report commission_owed_cents", () => {
  // Set up deal + proposal + referral conversion
  // Run ensureLedgerEarnedForDeliveredDeal
  // Run getReferralAdminReport
  // Assert ledger amount_cents === report commission_owed_cents
});
```
