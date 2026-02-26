# VOCA-01 — addVocabularyTerm SELECT-then-INSERT TOCTOU

**Status:** Open  
**Priority:** Low  
**Effort:** XS  
**Files:** `src/lib/api/apprentice-progress.ts`

---

## Problem

`addVocabularyTerm` (line ~357) performs a pre-flight SELECT before inserting:

```ts
const existing = db
  .prepare("SELECT id FROM apprentice_vocabulary WHERE user_id = ? AND term_slug = ?")
  .get(input.userId, input.termSlug) as { id: string } | undefined;
if (existing) throw new VocabularyTermAlreadyExistsError(input.termSlug);

db.prepare(
  `INSERT INTO apprentice_vocabulary (id, user_id, term_slug, term_name, ...) VALUES (...)`
).run(...);
```

The `apprentice_vocabulary` table has `UNIQUE(user_id, term_slug)`.  
Two concurrent calls for the same `(userId, termSlug)` both see no existing row,
both INSERT — the second throws an unhandled
`SqliteError: UNIQUE constraint failed: apprentice_vocabulary.user_id, apprentice_vocabulary.term_slug`
which propagates as a 500 instead of a clean `VocabularyTermAlreadyExistsError`.

---

## Fix

Remove the pre-flight SELECT. Wrap the INSERT in try/catch; catch the UNIQUE
constraint on `(user_id, term_slug)` and throw `VocabularyTermAlreadyExistsError`.

```ts
const id = randomUUID();
const now = new Date().toISOString();

try {
  db.prepare(
    `INSERT INTO apprentice_vocabulary (id, user_id, term_slug, term_name, demonstrated_at, context, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.userId, input.termSlug, input.termName, now, input.context ?? null, now);
} catch (err: unknown) {
  if (
    err instanceof Error &&
    err.message.includes("UNIQUE constraint failed") &&
    err.message.includes("apprentice_vocabulary")
  ) {
    throw new VocabularyTermAlreadyExistsError(input.termSlug);
  }
  throw err;
}
```

---

## Tests

- Add test: two sequential `addVocabularyTerm` calls for the same
  `(userId, termSlug)` throw `VocabularyTermAlreadyExistsError` on the second
  call, not a raw `SqliteError`.
