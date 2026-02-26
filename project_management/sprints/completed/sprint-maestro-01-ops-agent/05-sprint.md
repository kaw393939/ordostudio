# Maestro-01: Ops Agent (v2) — Sprint Tasks

**Sprint:** `sprint-maestro-01-ops-agent`

---

## T1 — Fix commission rate bug

**File:** `src/app/api/v1/account/referral/route.ts`

Change `commission_rate: 0.25` to `commission_rate: 0.04` per the locked commission
model (affiliate earns 4% of project total = 20% of the platform fee).

Also fix in `src/lib/api/referrals.ts` — `getReferralAdminReport()` calculates at 25%;
update to 4% (0.04).

**Acceptance:** Unit test; response body contains `commission_rate: 0.04`.

---

## T2 — Create `maestro-system-prompt.ts`

**New file:** `src/lib/api/maestro-system-prompt.ts`

Export `MAESTRO_SYSTEM_PROMPT` string per `02-architecture.md`.

---

## T3 — Create `maestro-tools.ts` with 10 core tools

**New file:** `src/lib/api/maestro-tools.ts`

Implement:
- `ToolDefinition` type (reuse or extend from `agent-tools.ts`)
- `MAESTRO_TOOLS` array (10 tools per `03-tool-specs.md`)
- `executeMaestroTool()` function

**Tool groups to implement (in order — run vitest at each checkpoint):**
1. Group A: `get_intake_queue`, `get_intake_detail`, `update_intake_status`
2. Group B: `list_role_requests`, `approve_role_request`, `reject_role_request`
3. Group C: `get_revenue_summary`, `get_recent_activity`
4. Group D: `get_ops_summary`, `get_audit_log`

Unit test assertion: `expect(MAESTRO_TOOLS.length).toBe(10)`

> **Do not add bookings, workflow, or remaining KPI tools** — those are M-01b.
> If you feel the urge to add scope here, write it down and add it to M-01b
> instead. The constraint is intentional.

---

## T4 — Expand `feed_events` writers

Update the following files to call `writeFeedEvent()`:

```
src/lib/api/intake.ts                        → 'NewIntakeRequest'
src/lib/api/deals.ts                         → 'DealClosed'
src/app/api/v1/webhooks/stripe/route.ts      → 'PaymentReceived'
src/lib/api/newsletter.ts                    → 'NewsletterScheduled'
src/lib/api/bookings.ts                      → 'BookingCreated'
```

Each call must be inside the same DB transaction as the primary write.

**Acceptance:** After the transaction, `feed_events` has a row with correct `type` + `user_id`.

---

## T5 — Create `/api/v1/agent/maestro` route

**New file:** `src/app/api/v1/agent/maestro/route.ts`

Per `02-architecture.md`. Must handle:
- Auth check (401/403)
- Parse body
- Build message array with system prompt
- Agentic SSE loop (same pattern as `/api/v1/agent/chat`)
- `capturedValues` emission for write tool results

---

## T6 — Register eval type and write 10 eval scenarios

**File:** `src/evals/run.ts` — add `'maestro'` to type enum
**New file:** `src/evals/scenarios/maestro.ts` — 10 scenarios per `04-eval-specs.md`

Run: `npm run evals:maestro` → 10/10 PASS

---

## T7 — Final gate

```
npm run build         # clean
npm run test          # ≥ 1730 passing
npm run evals         # 27/27 PASS
```

Hand off to Maestro-02. The UI sprint (M-02) starts immediately — its only
dependency is this running route.
