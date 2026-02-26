# NWSL-01 — subscribeToNewsletter SELECT-then-INSERT TOCTOU

**Status:** Open  
**Priority:** Medium  
**Effort:** XS  
**Files:** `src/lib/api/newsletter.ts`

---

## Problem

`subscribeToNewsletter` (line ~412) performs a pre-flight SELECT before inserting:

```ts
const existing = db
  .prepare("SELECT ... FROM newsletter_subscribers WHERE email = ?")
  .get(email) as NewsletterSubscriberRecord | undefined;

if (!existing) {
  db.prepare("INSERT INTO newsletter_subscribers (...) VALUES (?)").run(...);
  return { ok: true };
}
if (existing.status === "ACTIVE") { return { ok: true }; }
// re-activate unsubscribed user ...
db.prepare("UPDATE newsletter_subscribers SET status = 'ACTIVE' ... WHERE id = ?").run(...);
```

The `newsletter_subscribers` table has `email TEXT NOT NULL UNIQUE`.  
Two concurrent subscribe requests for the same email both see `existing = undefined`,
both INSERT — the second throws an unhandled `SqliteError: UNIQUE constraint failed: newsletter_subscribers.email`
propagating as a 500.

---

## Fix

Remove the pre-flight SELECT. Attempt INSERT first; catch the UNIQUE constraint
on `newsletter_subscribers.email`, then SELECT the existing record to apply the
re-activation logic (status check + UPDATE).

```ts
let existing: NewsletterSubscriberRecord | undefined;

try {
  db.prepare(
    "INSERT INTO newsletter_subscribers (id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at) VALUES (?, ?, 'ACTIVE', ?, NULL, ?, ?)",
  ).run(randomUUID(), email, randomUUID(), now, now);
  return { ok: true };
} catch (err: unknown) {
  if (err instanceof Error && err.message.includes("UNIQUE constraint failed: newsletter_subscribers.email")) {
    existing = db
      .prepare(
        "SELECT id, email, status, unsubscribe_seed, unsubscribed_at, created_at, updated_at FROM newsletter_subscribers WHERE email = ?",
      )
      .get(email) as NewsletterSubscriberRecord | undefined;
    if (!existing) throw err; // unexpected — rethrow
  } else {
    throw err;
  }
}

if (existing.status === "ACTIVE") {
  return { ok: true };
}

db.prepare(
  "UPDATE newsletter_subscribers SET status = 'ACTIVE', unsubscribe_seed = ?, unsubscribed_at = NULL, updated_at = ? WHERE id = ?",
).run(randomUUID(), now, existing.id);

return { ok: true };
```

---

## Tests

- Add test: two sequential `subscribeToNewsletter` calls for the same email both
  return `{ ok: true }` (no unhandled SqliteError on second call).
- Add test: subscribing for a previously-unsubscribed email sets status back to `ACTIVE`.
