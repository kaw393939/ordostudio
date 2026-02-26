# JOB-01 — Job Queue: Fast-fail Unknown Types + Stale-Recovery Exhaust Test

**Area:** `src/platform/job-queue.ts`, `src/platform/job-processor.ts`, `src/platform/job-handlers.ts`
**Severity:** Medium
**Category:** Correctness (late failure), Observability (silent abandonment)

---

## Problem 1 — Unknown job types survive `enqueue` and fail silently at runtime

`SqliteJobQueue.enqueue` accepts any `type` string and persists it:

```ts
enqueue(job: JobPayload, options?: EnqueueOptions): string {
  // No type validation — any string is accepted
  this.db.prepare(`INSERT INTO job_queue ... VALUES (?, ?, ...)`)
    .run(id, job.type, ...);
  return id;
}
```

A typo or missing handler registration (e.g. `"email.sned"`) persists to DB
and fires up to `max_retries` times before ending as `dead`.  Each worker
tick logs `Unknown job type: email.sned` but the enqueueing caller never
knew it was wrong.

### Fix

Pass the handler map (or a `Set<string>` of known types) into `enqueue` (or
expose a `validateType(type)` method on `SqliteJobQueue`) and throw
`UnknownJobTypeError` immediately.  The `JobProcessor` can expose its type
registry as a static check.

Alternatively: a lightweight `knownTypes` set in `SqliteJobQueue`
configured at construction time.

---

## Problem 2 — No test covers stale-recovery → attempts-exhaust path

`recoverStale` resets `status = 'pending'` without resetting `attempts`.
When the job is claimed again, `processNext` increments `attempts` once
more.  After `max_retries` total claims the job correctly goes to `dead`.

But this path is completely untested.  A regression here (e.g., accidentally
resetting `attempts = 0` in `recoverStale`) would silently make hung jobs
immortal.

### Fix

Add a unit test that:
1. Enqueues a job with `max_retries: 2`
2. Claims it (attempts = 1) — simulate a stale by updating `started_at` to the past
3. Calls `recoverStale` — job becomes `pending` again, attempts still = 1
4. Claims again (attempts = 2) — job fails
5. Asserts job is now `dead`

---

## Deliverables

- [ ] `SqliteJobQueue` constructor accepts optional `knownTypes: Set<string>`
- [ ] `enqueue` validates against `knownTypes` and throws `UnknownJobTypeError` if set and type unknown
- [ ] `buildHandlerMap` exports the handler type keys for use in `knownTypes`
- [ ] Test: `enqueue` with unknown type → immediate throw (not silent DB write)
- [ ] Test: stale recovery does not reset `attempts`; exhausted stale job reaches `dead`
- [ ] All existing job queue / processor tests pass

---

## Acceptance Criteria

1. `queue.enqueue({ type: "typo.job", data: {} })` throws before writing to DB
   when `knownTypes` is configured.
2. A job with `max_retries: 1` that goes stale once and then fails on re-run
   ends with `status = 'dead'` and `attempts = 2`.
