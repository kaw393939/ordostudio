# Sprint Eval-01: Policy Enforcement Eval Suite — Overview

## Status
**NOT STARTED** | Depends on: Maestro-00b, Persona-01 complete

## One-Liner
Build a dedicated `policy` eval type and 6 scenario-based tests that verify
the system correctly blocks policy violations at the HTTP/DB layer — not via
LLM reasoning, but via hard code guards.

## Why This Sprint Exists
Existing evals test that the *agent says the right thing*. This sprint tests that
the *system enforces the right thing* regardless of what any LLM says. Examples:
- Self-referral: the referral API must block even if the agent wanted to call it
- Double-booking: the booking DB layer must block even if a tool is called twice
- Unauthorized role approval: must return 403 at route level, not just in the agent

These are "defence in depth" tests that catch regressions when any code in the
enforcement path is modified.

## Scope Boundaries
| In scope | Out of scope |
|---|---|
| New `policy` eval type in `src/evals/` | New features |
| 6 policy scenarios (PE-01 through PE-06) | Performance/load testing |
| HTTP-level + DB-level assertion helpers | UI-level policy tests |

## Inputs Required
- Maestro-00b complete (self-referral block, double-booking guard)
- Persona-01 complete (role-approval route with auth guard)
- Vec-01 complete (RBAC visibility layer)

## Outputs Produced
- New eval type: `policy` in `src/evals/types.ts`
- New eval runner: `src/evals/runners/policy-runner.ts`
- 6 policy evals: PE-01 through PE-06

## Estimated Effort
| Role | Hours |
|---|---|
| Eval infra | 2 h |
| 6 policy scenarios | 3 h |
| Total | 5 h |

## Risk
**Low.** Pure test code. No production changes. Worst case: reveals an enforcement
gap that needs a follow-up fix — which is the whole point.
