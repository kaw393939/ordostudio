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
| 4 affiliate tools | Stripe payout scheduling |
| 2 evals (P2-01, P2-02) | New DB migrations |
| `void_commission` exposed to agent | Affiliate signup flow |
| `commission_rate` bug fix carry (0.25→0.04) | Email commission statements |

## Inputs Required
- Maestro-00b complete (`referral_conversions.conversion_type` enforcement)
- `referrals`, `referral_conversions`, `commissions` tables present
- `commission_rate: 0.04` fix applied (from Maestro-01 spec)

## Outputs Produced
- 5 tools in `src/lib/agent/tools/maestro-persona-affiliate.ts`
- 2 evals: P2-01, P2-02
- Total tools: 37 → 42

## Estimated Effort
| Role | Hours |
|---|---|
| Backend | 3 h |
| Evals | 1.5 h |
| Total | 4.5 h |

## Risk
**Low.** All tools are read-only except `void_commission` (reversible). `approve_payout` removed — financial state change via chat is a risk pattern
and idempotency (cannot approve already-approved payout).

## What Was Removed vs Original Spec

**`approve_payout` (Tool 4):** Removed from agent. Approving financial payouts via a
conversational interface risks LLM misread (wrong commission ID, ambiguous confirmation text)
and socially-engineered approvals ("approve the $3,000 commission"). This belongs in a
dedicated payout management UI with the commission details and an explicit confirm button.

Note: `void_commission` is kept because voiding is reversible (the commission can be un-voided
if it was an error), and the risk surface is smaller (no money moves — the payment just doesn't
happen). `approve_payout` is not reversible once actioned in Stripe.

**Eval P2-03 (`payout-approve`):** Removed with `approve_payout`.

**Tool count:** 5 → 4. **Eval count:** 3 → 2.
