# Maestro-01: Ops Agent (v2) — Sprint Tasks

**Sprint:** `sprint-maestro-01-ops-agent`

---

## T1 — Fix commission rate bug

**File:** `src/app/api/v1/account/referral/route.ts`

Change `commission_rate: 0.25` to `commission_rate: 0.04` per the locked commission model (affiliate earns 4% of project total = 20% of the platform fee).

Also fix in `src/lib/api/referrals.ts` — `getReferralAdminReport()` calculates at 25%; update to 4% (0.04).

**Acceptance:** Unit test; response body contains `commission_rate: 0.04`.

---

## T2 — Create `maestro-system-prompt.ts`

**New file:** `src/lib/api/maestro-system-prompt.ts`

Export `MAESTRO_SYSTEM_PROMPT` string per `02-architecture.md`.

---

## T3 — Create `maestro-tools.ts` (skeleton + Groups A & B)

**New file:** `src/lib/api/maestro-tools.ts`

Implement `ToolDefinition` type (or reuse from `agent-tools.ts`), `MAESTRO_TOOLS` array, `executeMaestroTool()` function.

Add Groups A (5 tools) and B (3 tools) first. Run `npx vitest run` at this checkpoint.

---

## T4 — Add Groups C, D, E, F to operator tools

Add remaining 17 tools (Groups C through F) per `03-tool-specs.md`. Each tool:
- Has valid Zod schema
- Has a correct SQL query or correct call to an existing lib function
- Write tools are wrapped in `db.transaction()`
- Write tools call `writeFeedEvent()` with the correct event type

---

## T5 — Expand `feed_events` writers

Update the following files to call `writeFeedEvent()`:

```
src/lib/api/intake.ts         → 'NewIntakeRequest'
src/lib/api/deals.ts          → 'DealClosed'
src/app/api/v1/webhooks/stripe/route.ts → 'PaymentReceived'
src/lib/api/newsletter.ts     → 'NewsletterScheduled'
src/lib/api/bookings.ts       → 'BookingCreated'
```

Each call must be inside the same DB transaction as the primary write.

**Acceptance:** After the transaction, `feed_events` table has a row with correct `type` and `user_id`.

---

## T6 — Create `/api/v1/agent/maestro` route

**New file:** `src/app/api/v1/agent/maestro/route.ts`

Pattern from `02-architecture.md`. Must handle:
- Auth check (401/403)
- Parse body
- Build message array with system prompt
- Agentic SSE loop (same as `/api/v1/agent/chat`)
- `capturedValues` emission for write tool results

---

## T7 — Register eval type and write eval scenarios

**File:** `src/evals/run.ts` — add `'maestro'` to type enum (and `'content-retrieval'` if not already done)

**New file:** `src/evals/scenarios/maestro.ts` — 18 scenarios per `04-eval-specs.md`

Add seed helpers to `src/evals/helpers/` as needed:
- `seedQueueIntakes(n)`
- `seedSingleIntake({ id, name, status })`
- `seedRoleRequests([{ id, user, role }])`
- `seedWorkflowExecution({ status })`
- `seedWorkflowRule({ id, enabled })`
- `seedFunnelIntakes(n)`
- `seedLedgerEntries([...])`
- `seedNewsletterSubscribers(n)`
- `seedAuditLogEntries(n)`

Seed helpers must clean up after themselves (DELETE in `afterEach` or explicit cleanup in `postTeardown`).

---

## T8 — Unit tests for tool validation

**New file:** `src/lib/api/__tests__/maestro-tools.test.ts`

```typescript
describe('maestro-tools validation', () => {
  it.each(MAESTRO_TOOLS)('$name rejects missing required args', ({ name, execute }) => {
    const result = execute({}, db);
    expect(result).toHaveProperty('error');
  });

  it('get_intake_queue returns intake list', () => { ... });
  it('approve_role_request writes feed event', () => { ... });
  it('cancel_availability_slot blocks BOOKED slots', () => { ... });
  it('get_revenue_summary returns correct totals', () => { ... });
});
```

---

## T9 — `evals:maestro` script

**File:** `package.json`

```json
{
  "evals:maestro": "tsx src/evals/run.ts --type maestro",
  "evals:all": "tsx src/evals/run.ts"
}
```

Run: `npm run evals:maestro` → 18/18 PASS  
Run: `npm run evals` (or `npm run evals:all`) → 35/35 PASS

---

## T10 — Commit

```bash
git add .
git commit -m "feat(maestro): ops agent route, 25 tools, 18 evals, feed event expansion, commission fix"
git push origin main
```
