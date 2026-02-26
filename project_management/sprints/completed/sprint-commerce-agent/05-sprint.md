# Sprint Commerce-Agent — Sprint Tasks

---

## T1 — Implement `list_deals` and `get_deal_detail`

**File:** `src/lib/api/maestro-tools.ts`

Both pure read tools. Add to `MAESTRO_TOOLS`. Validate with: `npm run evals:commerce` (CA-01).

---

## T2 — Implement `advance_deal_stage`

Write tool. Auth check (ADMIN/STAFF). MAESTRO_APPROVED gate per `02-architecture.md`.
`db.transaction()` required. `writeFeedEvent('DealAdvanced')`.

**Acceptance:** CA-02 eval passes. DB shows updated status.

---

## T3 — Implement `get_customer_timeline`

Union query across 4 tables. Graceful empty for unknown user. CA-03 eval.

---

## T4 — Final gate

```
npm run build     # clean
npm run test      # no regressions
npm run evals     # full suite passes
```
