# CTCT-01 — upsertContact SELECT-then-INSERT TOCTOU

**Status:** Open  
**Priority:** Medium  
**Effort:** XS  
**Files:** `src/lib/api/contacts.ts`

---

## Problem

`upsertContact` (line ~68) performs a pre-flight SELECT before inserting:

```ts
const existing = db
  .prepare(`SELECT * FROM contacts WHERE email = ?`)
  .get(email) as ContactRecord | undefined;

if (existing) {
  // optionally update full_name ...
  return existing;
}

db.prepare(`INSERT INTO contacts (id, email, ...) VALUES (...)`).run(...);
```

The `contacts` table has `email TEXT NOT NULL UNIQUE`.  
Two concurrent calls for the same email both see `existing = undefined`,
both INSERT — the second throws an unhandled `SqliteError: UNIQUE constraint failed: contacts.email`
which propagates as a 500 instead of gracefully returning / updating the existing record.

---

## Fix

Remove the pre-flight SELECT. Attempt INSERT first; catch the UNIQUE constraint
on `contacts.email`, then SELECT the existing record and apply the conditional
`full_name` update logic.

```ts
const id = randomUUID();
let row: ContactRecord;
try {
  db.prepare(
    `INSERT INTO contacts (id, email, full_name, user_id, source, status, notes, assigned_to, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'LEAD', NULL, NULL, ?, ?)`,
  ).run(id, email, input.fullName?.trim() ?? null, input.userId ?? null, input.source, now, now);
  row = db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id) as ContactRecord;
} catch (err: unknown) {
  if (err instanceof Error && err.message.includes("UNIQUE constraint failed: contacts.email")) {
    row = db.prepare(`SELECT * FROM contacts WHERE email = ?`).get(email) as ContactRecord;
  } else {
    throw err;
  }
}

// Update full_name if now known and wasn't before
if (input.fullName && !row.full_name) {
  db.prepare(`UPDATE contacts SET full_name = ?, updated_at = ? WHERE email = ?`).run(
    input.fullName.trim(), now, email,
  );
  return { ...row, full_name: input.fullName.trim(), updated_at: now };
}
return row;
```

---

## Tests

- Add test to contacts test file: two concurrent `upsertContact` calls for the
  same email return a `ContactRecord` on both calls (no unhandled SqliteError).
- Add test: second call with a `fullName` when first call had none → `full_name`
  is populated on the returned record.
