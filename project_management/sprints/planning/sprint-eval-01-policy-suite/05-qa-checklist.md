# Sprint Eval-01: Policy Enforcement Eval Suite — QA Checklist

## Pre-Deploy
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TypeScript errors
- [ ] 6 policy scenarios executed

## Policy Runner Validation
- [ ] `http` action type: `NextRequest` mock properly constructed for GET and POST
- [ ] `tool-call` action type: tool called with correct caller context (id + role)
- [ ] `db-call` action type: exception captured, not re-thrown to runner
- [ ] `webhook` action type: webhook handler called without Stripe signature check
- [ ] All assertion types evaluated: `http-status`, `throws-with-code`, `db-row-exists`,
  `db-row-not-exists`, `response-contains`

## Scenario Gate
| Scenario | Enforcement Point | Expected | Pass? | Gap? |
|---|---|---|---|---|
| PE-01 self-referral | referral click route | 400 + no DB row | | |
| PE-02 double-booking | booking DB transaction | throws SLOT_CAPACITY_EXCEEDED | | |
| PE-03 apprentice 403 | admin route middleware | 403 | | |
| PE-04 commission-void-refund | Stripe webhook handler | commission.status='voided' | | |
| PE-05 role-self-approve | approve_role_request tool | throws CANNOT_APPROVE_OWN_REQUEST | | |
| PE-06 intake unauth | intake GET route | 401 | | |

## Gap Documentation Protocol
If any scenario **fails** (meaning the enforced block is NOT present):
- [ ] Document in `project_management/sprints/planning/hotfixes.md`:
  - Scenario ID
  - What was expected
  - What actually happened
  - Sprint where fix should be applied
- [ ] DO NOT apply hotfix in this sprint

## Accept / Reject
| Check | Result |
|---|---|
| Policy runner type-checks cleanly | |
| All 6 scenarios run to completion | |
| Any failures documented in hotfixes.md | |
| No production code modified | |
| Build clean | |
| Test suite no regression | |
