# Sprint Persona-02: Affiliate Link & Commission Tools — Sprint Plan

## Prerequisites
- [ ] Maestro-00b merged (`referral_conversions.conversion_type` enforcement in code)
- [ ] `referrals`, `referral_conversions`, `commissions` tables present
- [ ] `commission_rate: 0.04` bug fix verified in referral API route

## Tasks

### T1 — Implement 5 tools in `maestro-persona-affiliate.ts` (2 h)
- [ ] `get_affiliate_link` (upsert pattern)
- [ ] `get_affiliate_stats` (multi-join with date window)
- [ ] `list_pending_commissions` (auth bifurcation: admin vs. self)
- [ ] `approve_payout` (transaction + idempotency + audit_log)
- [ ] `void_commission` (transaction + idempotency + cannot-void-approved guard + audit_log)

### T2 — Register in `maestro-tools.ts` (15 min)
- [ ] Import + register 5 tools
- [ ] Assert total = 42

### T3 — Seed + evals (1 h)
- [ ] `affiliate-seeds.ts` (2 users, 1 referral, 3 conversions, 2 commissions)
- [ ] `persona-affiliate.eval.ts` (P2-01, P2-02, P2-03)
- [ ] Run: `npm run evals -- --file persona-affiliate`

### T4 — Unit tests (30 min)
- [ ] `approve_payout('com-1')` → status='approved'
- [ ] `approve_payout('com-1')` again → `{ alreadyApproved: true }`
- [ ] `void_commission` on approved commission → throws CANNOT_VOID_APPROVED
- [ ] Non-admin calling `approve_payout` → FORBIDDEN

### T5 — Full suite + build
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — clean

### T6 — Commit
```bash
git add src/lib/agent/tools/maestro-persona-affiliate.ts \
        src/lib/agent/maestro-tools.ts \
        src/evals/persona-affiliate.eval.ts \
        src/evals/fixtures/affiliate-seeds.ts
git commit -m "feat(agent): add affiliate persona tools — link, stats, commissions, payout (5 tools, 3 evals)"
```

## Definition of Done
- [ ] 5 tools returning typed responses
- [ ] P2-01 through P2-03 all pass
- [ ] P2-03 DB assertion confirms `status='approved'` AND `audit_log` row
- [ ] `void_commission` on already-approved → error (not silent)
- [ ] Affiliate cannot see other affiliates' commissions
- [ ] `npm test` 1714+/1715, build clean
