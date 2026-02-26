# ENT-01 — Entitlement Grant + Payout Execution Unhandled Constraint Races

**Status:** Open  
**Priority:** Medium  
**Effort:** S  
**Files:** `src/lib/api/entitlements.ts`, `src/lib/api/ledger-payouts.ts`, `src/app/__tests__/e2e-entitlements.test.ts`

---

## Problem

Both `grantEntitlementAdmin` and `upsertExecutionAttempt` use a SELECT-then-INSERT pattern
without catching the resulting UNIQUE constraint errors on a race.

### 1 · `grantEntitlementAdmin` — UNIQUE(user_id, entitlement_key)

```ts
const existing = db.prepare("SELECT ... FROM entitlements WHERE user_id = ? AND entitlement_key = ?").get(...)
if (!existing) {
  db.prepare("INSERT INTO entitlements ...").run(...);   // ← throws if race
}
```

The `entitlements` table has `UNIQUE(user_id, entitlement_key)`.  Two concurrent grant requests
for the same `(userId, key)` both see `existing = undefined`, then both INSERT.  The second
INSERT throws:
```
SqliteError: UNIQUE constraint failed: entitlements.user_id, entitlements.entitlement_key
```
This is unhandled and propagates as a 500.  The desired semantics — "grant is idempotent" —
require silently returning the row that was just inserted by the winning thread.

### 2 · `upsertExecutionAttempt` — ledger_entry_id PRIMARY KEY

```ts
const existing = db.prepare("SELECT attempt_count FROM stripe_payout_executions WHERE ledger_entry_id = ?").get(...)
if (!existing) {
  db.prepare("INSERT INTO stripe_payout_executions ...").run(...)   // ← throws if race
}
```

`stripe_payout_executions` has `ledger_entry_id TEXT PRIMARY KEY`.  Two concurrent payout
runners for the same entry both see `existing = undefined` and both INSERT.  The second INSERT
throws an unhandled primary key violation (SQLite error code 19).

Similar issue exists in `markExecutionFailed` which also does SELECT-then-INSERT.

---

## Fix

### 1 · `grantEntitlementAdmin` — use `INSERT OR IGNORE`

Replace the INSERT with `INSERT OR IGNORE`.  After the insert, always re-read by `(user_id, entitlement_key)` — this returns the row regardless of whether it was just inserted or existed already.  Drop the separate `db.prepare("SELECT ... WHERE id = ?").get(id)` after-insert re-read.

```ts
db.prepare(`INSERT OR IGNORE INTO entitlements (...) VALUES (...)`).run(...);
const result = db.prepare("SELECT ... FROM entitlements WHERE user_id = ? AND entitlement_key = ?").get(userId, key);
```

### 2 · `upsertExecutionAttempt` and `markExecutionFailed` — use `INSERT OR IGNORE`

Same pattern: replace `INSERT` with `INSERT OR IGNORE`.  If `changes === 0`, the row already
exists (created by the concurrent call); proceed to the UPDATE branch to increment `attempt_count`.

```ts
const insertResult = db.prepare("INSERT OR IGNORE INTO stripe_payout_executions ...").run(...);
if (insertResult.changes === 0) {
  // Row already existed — fall through to UPDATE
  const existing = db.prepare("SELECT attempt_count FROM ... WHERE ledger_entry_id = ?").get(...);
  db.prepare("UPDATE stripe_payout_executions SET ...).run(...);
}
```

---

## Tests

- `e2e-entitlements.test.ts`: Add test — calling `grantEntitlementAdmin` twice for the same
  `(userId, key)` returns the same entitlement record both times (idempotent, no throw).
- Add test — calling `revokeEntitlementAdmin` on a non-existent entitlement throws
  `EntitlementNotFoundError` (existing coverage, confirm unaffected).
