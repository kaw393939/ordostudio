# Sprint Commerce-Agent — QA Checklist

## Tool Validation
- [ ] `list_deals` with unknown status enum returns `{ error }` — does not throw
- [ ] `advance_deal_stage` with invalid newStatus returns `{ error }`
- [ ] `get_deal_detail` with unknown dealId returns `{ error: 'NOT_FOUND' }`
- [ ] `get_customer_timeline` with unknown userId returns `{ timeline: [], note: 'No activity found' }`

## MAESTRO_APPROVED Gate
- [ ] `advance_deal_stage` to CONTRACT_SENT without `approve: true` returns gate error
- [ ] `advance_deal_stage` to CONTRACT_SENT with `approve: true` succeeds
- [ ] `advance_deal_stage` to CLOSED_LOST (no gate) succeeds without approve flag

## Auth
- [ ] `advance_deal_stage` called by USER role returns `{ error: 'FORBIDDEN' }`

## DB Consistency
- [ ] `DealAdvanced` feed event written on successful stage advance
- [ ] `deals.updated_at` updated on status change

## Evals
- [ ] `npm run evals:commerce` → 3/3 PASS
- [ ] `npm run evals` → full suite clean
