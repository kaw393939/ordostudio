# REF-01 — getOrCreateReferralCode TOCTOU on user_id UNIQUE

**Status:** Open  
**Priority:** Medium  
**Effort:** XS  
**Files:** `src/lib/api/referrals.ts`

---

## Problem

`getOrCreateReferralCode` (line ~61) starts with a SELECT-then-INSERT pattern:

```ts
const existing = db
  .prepare("SELECT ... FROM referral_codes WHERE user_id = ?")
  .get(input.userId) as ReferralCodeRecord | undefined;

if (existing) {
  return existing;
}

for (let attempt = 0; attempt < 5; attempt += 1) {
  try {
    db.prepare("INSERT INTO referral_codes (id, user_id, code, ...) VALUES (...)").run(...);
    return { ... };
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) {
      continue;   // <-- catches BOTH user_id and code UNIQUE violations
    }
    throw error;
  }
}
throw lastError;
```

The `referral_codes` table has:
- `user_id TEXT NOT NULL UNIQUE`
- `code TEXT NOT NULL UNIQUE`

**Race condition:** Two concurrent requests for the same `userId` both pass the
initial SELECT (see no existing row), then both attempt INSERT.  
One succeeds; the second triggers a UNIQUE violation on `user_id`.  
The catch block treats it identically to a `code` collision and `continue`s — but
all 5 retries also fail on `user_id` UNIQUE (the `user_id` value never changes).  
The second request exhausts retries and throws an unhandled `SqliteError`.

---

## Fix

Inside the `catch` block, distinguish between a `user_id` UNIQUE failure (idempotent
conflict — the row was just created by a concurrent request; SELECT and return it)
and a `code` UNIQUE failure (transient collision — retry with new code).

```ts
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("UNIQUE constraint failed: referral_codes.user_id")) {
    // Row created by concurrent request — return it
    const created = db
      .prepare("SELECT id, user_id, code, created_at, updated_at FROM referral_codes WHERE user_id = ?")
      .get(input.userId) as ReferralCodeRecord | undefined;
    if (created) return created;
  }
  if (msg.toLowerCase().includes("unique")) {
    continue; // code collision — retry with a new code
  }
  throw error;
}
```

---

## Tests

- Add test: two sequential `getOrCreateReferralCode` calls for the same userId
  both return a `ReferralCodeRecord` with the same code (second call returns the
  existing row without error).
