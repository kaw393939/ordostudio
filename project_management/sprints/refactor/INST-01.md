# INST-01 — createInstructor SELECT-then-INSERT TOCTOU

**Status:** Open  
**Priority:** Medium  
**Effort:** XS  
**Files:** `src/lib/api/instructors.ts`

---

## Problem

`createInstructor` (line ~259) performs a pre-flight SELECT before inserting:

```ts
const existing = db.prepare("SELECT id FROM instructors WHERE email = ?").get(email) as { id: string } | undefined;
if (existing) {
  throw new InvalidInputError("instructor_email_exists");
}
db.prepare("INSERT INTO instructors (id, name, email, ...) VALUES (...)").run(...);
```

The `instructors` table has `email TEXT NOT NULL UNIQUE`.  
Two concurrent creation requests for the same email both see `existing = undefined`,
both INSERT — the second throws an unhandled `SqliteError: UNIQUE constraint failed: instructors.email`
which propagates as a 500 instead of a clean `InvalidInputError`.

---

## Fix

Remove the pre-flight SELECT entirely. Wrap the INSERT in try/catch; catch the
UNIQUE constraint on `instructors.email` and throw `InvalidInputError("instructor_email_exists")`.

```ts
try {
  db.prepare(`INSERT INTO instructors (id, name, email, status, capabilities_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(...);
} catch (err: unknown) {
  if (err instanceof Error && err.message.includes("UNIQUE constraint failed: instructors.email")) {
    throw new InvalidInputError("instructor_email_exists");
  }
  throw err;
}
```

---

## Tests

- `src/lib/api/__tests__/instructors.test.ts` (or nearest test file): Add test —
  two sequential `createInstructor` calls with the same email throw `InvalidInputError`
  on the second call, not a raw `SqliteError`.
