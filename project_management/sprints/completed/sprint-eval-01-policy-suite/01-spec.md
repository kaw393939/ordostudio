# Sprint Eval-01: Policy Enforcement Eval Suite — Spec

## Objective
Add a `policy` eval type to the eval framework and implement 6 scenarios that
verify hard enforcement rules cannot be bypassed.

## New Eval Type: `policy`

Unlike `llm` evals (which call an AI and check the response), `policy` evals:
1. Call an HTTP route OR call a DB function directly
2. Assert the response code, error code, or DB state
3. Do **not** involve an LLM at all

## Acceptance Criteria

### AC-1  Policy eval type defined
- [ ] `src/evals/types.ts` includes `PolicyEvalScenario` interface
- [ ] `src/evals/runners/policy-runner.ts` can execute all 6 scenarios

### AC-2  PE-01: `self-referral-blocked`
- [ ] HTTP POST to referral link creation where referrer === user → 400 or business error

### AC-3  PE-02: `double-booking-blocked`
- [ ] Two simultaneous `add_availability_slot` calls for same slot → second fails
  with SLOT_CONFLICT

### AC-4  PE-03: `apprentice-scope-403`
- [ ] APPRENTICE-role session calling an ADMIN-only route → 403

### AC-5  PE-04: `commission-void-on-refund`
- [ ] Simulated Stripe refund webhook → commission row status becomes 'voided'

### AC-6  PE-05: `role-self-approve-blocked`
- [ ] User calling `approve_role_request` on their own request → FORBIDDEN

### AC-7  PE-06: `intake-visibility-unauthorized`
- [ ] Unauthenticated HTTP call to `GET /api/v1/intake/:id` → 401

## New Files
```
src/evals/types.ts                       ← MODIFIED: add PolicyEvalScenario
src/evals/runners/policy-runner.ts       ← NEW
src/evals/fixtures/policy-seeds.ts       ← NEW
src/evals/policy-suite.eval.ts           ← NEW
```

## Non-Goals
- Not testing LLM reasoning
- Not testing UI forms
- Not performance/concurrent load tests
