# Sprint Persona-02: Affiliate Link & Commission Tools — Overview

## Status
**NOT STARTED** | Depends on: Maestro-00b complete

## One-Liner
Give affiliates first-class agent tooling: retrieve their referral link, view
earned commissions, and allow admins to approve payouts and void commissions — all
via the ops agent or a future affiliate-persona agent.

## Why This Sprint Exists
The reconciliation report flagged three affiliate gaps:
1. No agent tool to retrieve referral links (affiliates must look up their own links manually)
2. Commission payout approval is a manual DB operation today
3. No programmatic `void_commission` — the Stripe refund webhook fix in Maestro-00b
   writes the void but nothing exposes it in the agent

## Scope Boundaries
| In scope | Out of scope |
|---|---|
| 5 affiliate tools | Stripe payout scheduling |
| 3 evals (P2-01 through P2-03) | New DB migrations |
| Commission void exposed to agent | Affiliate signup flow |
| `commission_rate` bug fix carry (0.25→0.04) | Email commission statements |

## Inputs Required
- Maestro-00b complete (`referral_conversions.conversion_type` enforcement)
- `referrals`, `referral_conversions`, `commissions` tables present
- `commission_rate: 0.04` fix applied (from Maestro-01 spec)

## Outputs Produced
- 5 tools in `src/lib/agent/tools/maestro-persona-affiliate.ts`
- 3 evals: P2-01, P2-02, P2-03
- Total tools: 37 → 42

## Estimated Effort
| Role | Hours |
|---|---|
| Backend | 3 h |
| Evals | 1.5 h |
| Total | 4.5 h |

## Risk
**Low-Medium.** `approve_payout` makes a DB state change; requires ADMIN auth guard
and idempotency (cannot approve already-approved payout).
