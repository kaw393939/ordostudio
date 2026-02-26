# Sprint Persona-02: Affiliate Link & Commission Tools — QA Checklist

## Pre-Deploy
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TypeScript errors
- [ ] 3 evals pass: P2-01, P2-02, P2-03
- [ ] Tool count = 42

## Tool Behaviour Spot-Checks

### `get_affiliate_link`
- [ ] First call for new user → creates referral row, returns code + URL
- [ ] Second call → returns same code (no duplicate rows created)
- [ ] `referralUrl` matches `NEXT_PUBLIC_BASE_URL + "/r/" + code`

### `get_affiliate_stats`
- [ ] Returns `clicks: 2`, `conversions: 1`, `pendingPayout: 40.00` for `u-aff-1`
- [ ] Does not include voided commission in `pendingPayout`

### `list_pending_commissions`
- [ ] ASSOCIATE caller → only sees their own commissions
- [ ] ADMIN caller with `status='all'` → sees all commissions
- [ ] `status='voided'` filter → returns voided rows only

### `approve_payout`
- [ ] Valid call → `commissions.status = 'approved'`
- [ ] Duplicate call → `{ alreadyApproved: true }` (no error, no duplicate audit row)
- [ ] Non-ADMIN caller → FORBIDDEN

### `void_commission`
- [ ] Valid pending commission → `status='voided'`, `void_reason` stored
- [ ] Attempting to void an approved commission → error
- [ ] Duplicate void → `{ alreadyVoided: true }`

## Eval Gate
| Eval | Expected | Pass? |
|------|----------|-------|
| P2-01 get-link | code returned, URL formatted | |
| P2-02 view-commissions | correct $40 amount, no data leak | |
| P2-03 payout-approve | DB approved + audit_log row | |

## Security Check
- [ ] Affiliates cannot approve or void each other's commissions
- [ ] Affiliates cannot see other users' stats
- [ ] All inputs bound via prepared statements (no injection vector)

## Accept / Reject
| Check | Result |
|---|---|
| All 3 evals pass | |
| Idempotency confirmed for approve + void | |
| Data isolation: affiliate sees only own records | |
| Build clean | |
| No test regression | |
