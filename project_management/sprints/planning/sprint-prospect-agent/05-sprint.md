# Sprint Prospect-Agent — Sprint Tasks

---

## T1 — Implement `subscribe_to_newsletter`

**File:** `src/lib/api/agent-tools.ts`

Add tool per `03-tool-specs.md`. Idempotent on email. Fires `NewNewsletterSubscriber`
feed event on INSERT only (not on duplicate update).

**Acceptance:** PA-01 + PA-02 evals pass.

---

## T2 — Implement `convert_subscriber_to_lead`

**File:** `src/lib/api/agent-tools.ts`

Use subscriber's email to find or create intake row. `source = 'chat_agent'`.
Returns existing intake ID if already open — no duplicate.

**Acceptance:** PA-03 eval passes. DB has one intake row.

---

## T3 — Implement `capture_content_interest`

**File:** `src/lib/api/agent-tools.ts`

Write topics array to metadata of the most-recent `intake_conversations` row
matching the session. Graceful if no conversation found (returns sessionTracked: false).

---

## T4 — Register eval type and write 3 scenarios

**New file:** `src/evals/scenarios/prospect.ts`
Register `'prospect'` type in `src/evals/run.ts`.
Run: `npm run evals:prospect` → 3/3 PASS

---

## T5 — Final gate

```
npm run build         # clean
npm run test          # no regressions
npm run evals         # full suite passes
```
