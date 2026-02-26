# DEAL-01 — Deal State Machine Bypass + Intake TOCTOU

**Status:** Open  
**Priority:** Critical  
**Effort:** S  
**Files:** `src/lib/api/deals.ts`, `src/app/__tests__/e2e-deals.test.ts`

---

## Problem

### 1 · `assignDealAdmin` bypasses the domain state machine (Critical)

`assignDealAdmin` directly issues:

```sql
UPDATE deals SET assigned_admin_user_id = ?, status = 'ASSIGNED', updated_at = ?
WHERE id = ?
```

without calling `assertDealTransition(currentStatus, 'ASSIGNED')`.  
The state machine (`core/domain/deal-lifecycle.ts`) defines `ALLOWED_TRANSITIONS`:

```
QUEUED      → ASSIGNED ✓
ASSIGNED    → already ASSIGNED (self-transition — fine)
MAESTRO_APPROVED → ASSIGNED ✗  (not listed)
PAID        → ASSIGNED ✗
IN_PROGRESS → ASSIGNED ✗
DELIVERED   → ASSIGNED ✗
CLOSED      → ASSIGNED ✗
REFUNDED    → ASSIGNED ✗
```

A deal that is DELIVERED, PAID, or CLOSED can be silently moved back to ASSIGNED,
corrupting its lifecycle and invalidating ledger invariants.

### 2 · `createDealFromIntake` SELECT-then-INSERT TOCTOU (Medium)

```ts
const existing = db.prepare("SELECT id FROM deals WHERE intake_id = ?").get(intakeId);
if (existing) throw new DealAlreadyExistsError(...);
db.prepare("INSERT INTO deals ...").run(...);
```

Two concurrent requests for the same `intakeId` both pass the SELECT check before
either inserts.  The DB has `intake_id TEXT NOT NULL UNIQUE` so the second INSERT
throws an unhandled `SqliteError: UNIQUE constraint failed: deals.intake_id`.
The error propagates as a 500 instead of a clean 409.

---

## Fix

### 1 · State machine guard in `assignDealAdmin`

Before the UPDATE, read the current status and call `assertDealTransition`:

```ts
const current = db.prepare("SELECT status FROM deals WHERE id = ?").get(input.dealId) as
  { status: DealStatus } | undefined;
if (!current) throw new DealNotFoundError(input.dealId);
assertDealTransition(current.status as DealStatus, "ASSIGNED");
```

### 2 · Constraint-catch pattern for `createDealFromIntake`

Replace the SELECT-then-INSERT with an INSERT that catches the UNIQUE violation:

```ts
try {
  db.prepare("INSERT INTO deals ...").run(...);
} catch (err: unknown) {
  if (err instanceof Error && err.message.includes("UNIQUE constraint failed: deals.intake_id")) {
    throw new DealAlreadyExistsError(input.intakeId);
  }
  throw err;
}
```

Remove the pre-flight SELECT entirely.

---

## Tests

- `e2e-deals.test.ts`: Add test — `assignDealAdmin` on a DELIVERED deal throws `InvalidInputError`.
- `e2e-deals.test.ts`: Add test — `assignDealAdmin` on a QUEUED deal succeeds.
- `e2e-deals.test.ts`: Add test — concurrent `createDealFromIntake` for same intake throws `DealAlreadyExistsError` (second call), not a raw SqliteError.
