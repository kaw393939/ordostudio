# Sprint Persona-02: Affiliate Link & Commission Tools — Spec

## Objective
Implement 5 affiliate tools giving affiliates visibility into their link/stats
and giving admins payout approval and commission void capabilities.

## Acceptance Criteria

### AC-1  `get_affiliate_link`
- [ ] Returns the caller's referral link (from `referrals` table)
- [ ] If no referral record exists → create one automatically (upsert)
- [ ] Returns `{ referralCode, referralUrl, createdAt }`

### AC-2  `get_affiliate_stats`
- [ ] Returns clicks, conversions, earned commissions for caller
- [ ] Supports `days` param (default 30)
- [ ] Returns `{ clicks, conversions, totalEarned, pendingPayout, period }`

### AC-3  `list_pending_commissions`
- [ ] ADMIN/STAFF: list all commissions with `status='pending'`
- [ ] AFFILIATE: list only their own pending commissions
- [ ] Supports `limit` param

### AC-4  `approve_payout`
- [ ] ADMIN/STAFF only
- [ ] Accepts `commissionId`; sets `status='approved'`, `approved_at=now()`
- [ ] Idempotent: if already approved, return `{ alreadyApproved: true }`
- [ ] Logs to `audit_log`

### AC-5  `void_commission`
- [ ] ADMIN/STAFF only
- [ ] Accepts `commissionId`, `reason`
- [ ] Sets `status='voided'`, `voided_at=now()`, `void_reason=reason`
- [ ] Cannot void already-approved payout
- [ ] Logs to `audit_log`

## New Files
```
src/lib/agent/tools/maestro-persona-affiliate.ts
src/evals/fixtures/affiliate-seeds.ts
src/evals/persona-affiliate.eval.ts
```

## Modified Files
```
src/lib/agent/maestro-tools.ts   ← register 5 tools
```

## Non-Goals
- No Stripe API calls from tools (payout is flag in DB only)
- No referral click simulation
- No migrations
