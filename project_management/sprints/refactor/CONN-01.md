# CONN-01 — Stripe Connect Double Account Creation Race

**Status:** Open  
**Priority:** High  
**Effort:** S  
**Files:** `src/lib/api/stripe-connect.ts`, `src/app/__tests__/e2e-stripe-connect-payouts.test.ts`

---

## Problem

`ensureConnectAccountRow` has a SELECT-then-CREATE race:

```ts
const existing = db.prepare("SELECT ... FROM stripe_connect_accounts WHERE user_id = ?").get(userId);
if (existing) return rowToRecord(existing);

const created = await createConnectAccount({ email });   // ← calls Stripe API
db.prepare("INSERT INTO stripe_connect_accounts ...").run(...);
```

Two concurrent onboarding link requests for the same user both observe `existing = undefined`,
both call `createConnectAccount` on Stripe, and each creates a **real Stripe Express account**.

The DB has `user_id TEXT PRIMARY KEY` so the second INSERT fails with:
```
SqliteError: UNIQUE constraint failed: stripe_connect_accounts.user_id
```
This exception is unhandled and propagates as a 500.  The first Stripe account is persisted; the
second Stripe account is **permanently leaked** — it exists in Stripe but is unreachable in the
application.

---

## Fix

Use `INSERT OR IGNORE` after the Stripe call and then re-read the row. If another concurrent
request already won the race, we discard our Stripe account creation result and use the
winner's account:

```ts
const inserted = db.prepare(`
  INSERT OR IGNORE INTO stripe_connect_accounts (...) VALUES (...)
`).run(userId, created.id, now, now);

// If another concurrent call won the race, inserted.changes === 0.
// Re-read the persisted row regardless.
const row = db.prepare("SELECT ... FROM stripe_connect_accounts WHERE user_id = ?").get(userId);
return rowToRecord(row as StripeConnectAccountDbRow);
```

**Note on Stripe account leak:** The INSERT OR IGNORE approach does not prevent creating the
second Stripe account.  The better long-term fix is a DB-level advisory lock or an application-
level mutex per userId before the Stripe call; however, since `ensureConnectAccountRow` is
called from a Next.js API route (one process, one event loop), true concurrency requires two
simultaneous HTTP requests.  `INSERT OR IGNORE` eliminates the crash and limits damage to an
occasionally abandoned Stripe account — acceptable while the account base is small.  Add a
comment marking this as a known limitation.

---

## Tests

- `e2e-stripe-connect-payouts.test.ts`: Add test — calling `createStripeConnectOnboardingLinkForUser`
  twice in sequence for the same user returns the same `stripe_account_id` both times (idempotent).
- Verify the second call does not throw.
