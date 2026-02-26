# Sprint Eval-01: Policy Enforcement Eval Suite — Sprint Plan

## Prerequisites
- [ ] Maestro-00b merged (self-referral block, double-booking guard in code)
- [ ] Persona-01 merged (role approval route with ADMIN auth guard)
- [ ] Vec-01 merged (RBAC visibility layer)

## Tasks

### T1 — Extend eval types (30 min)
- [ ] Add `PolicyEvalScenario` interface to `src/evals/types.ts`
- [ ] Add `PolicyAction` union type
- [ ] Add `PolicyAssertion` union type

### T2 — Build policy runner (1.5 h)
- [ ] `src/evals/runners/policy-runner.ts`
- [ ] Handle `http` action: call route handler with `NextRequest` mock (no live port)
- [ ] Handle `tool-call` action: call tool with mocked caller context
- [ ] Handle `db-call` action: execute `fn(db)`, catch throws
- [ ] Handle `webhook` action: call webhook handler function directly (bypass Stripe sig)
- [ ] Implement assertion evaluators for all 5 assertion types
- [ ] Return structured `PolicyEvalResult` (pass/fail/reason)

### T3 — Write seed fixture (30 min)
- [ ] `src/evals/fixtures/policy-seeds.ts`
- [ ] Users, referrals, slots, commissions, role_requests per scenario needs

### T4 — Write 6 policy scenarios (1.5 h)
- [ ] `src/evals/policy-suite.eval.ts`
- [ ] PE-01 self-referral
- [ ] PE-02 double-booking
- [ ] PE-03 apprentice 403
- [ ] PE-04 commission-void webhook
- [ ] PE-05 role-self-approve blocked
- [ ] PE-06 intake unauth 401
- [ ] Run: `npm run evals -- --file policy-suite`

### T5 — If any scenario reveals a real gap
- [ ] Document in a new `project_management/sprints/planning/hotfixes.md` file
- [ ] Do NOT fix in this sprint — create a follow-up task

### T6 — Full test suite + build
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TSC errors

### T7 — Commit
```bash
git add src/evals/types.ts \
        src/evals/runners/policy-runner.ts \
        src/evals/policy-suite.eval.ts \
        src/evals/fixtures/policy-seeds.ts
git commit -m "test(evals): add policy eval runner and 6 enforcement scenarios (PE-01 through PE-06)"
```

## Definition of Done
- [ ] `PolicyEvalScenario` type exported from `src/evals/types.ts`
- [ ] Policy runner can execute all 4 action types
- [ ] PE-01 through PE-06 all pass (or documented gaps in hotfixes.md)
- [ ] No production code changes in this sprint
- [ ] `npm test` 1714+/1715, build clean
