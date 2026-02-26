# Sprint Persona-01: Membership & Apprenticeship Tools — Overview

## Status
**NOT STARTED** | Depends on: Maestro-00b complete (roles 044 migration)

## One-Liner
Build the apprentice/membership persona tools so users can apply for apprenticeship,
operators can review and promote applicants, and gate-based progression is enforceable
through the agent.

## Why This Sprint Exists
The reconciliation report (see `archive/sprint-maestro-00-discovery/`) identified that
the ASSOCIATE → APPRENTICE → CERTIFIED_CONSULTANT progression path has:
- No tools for operators to review gate submissions
- No tools for users to check their rank requirements
- No programmatic role promotion (done manually in the DB today)

This sprint closes those gaps and gives the membership persona complete coverage.

## Scope Boundaries
| In scope | Out of scope |
|---|---|
| 8 membership/apprentice tools | UI pages for rank progression |
| 5 evals (P1-01 through P1-05) | Payment gating for membership tiers |
| Role promotion via agent | Email notifications on role change |
| ASSOCIATE/CERTIFIED gate checks | Stripe integration changes |

## Inputs Required
- Maestro-00b complete: `ASSOCIATE`, `CERTIFIED_CONSULTANT`, `STAFF` roles
  exist in DB (migration 044)
- `users`, `intake_requests`, `role_requests` tables present

## Outputs Produced
- 8 new tools in `src/lib/agent/tools/maestro-persona-membership.ts`
- 5 evals: P1-01 through P1-05
- Total tool count: 29 → 37

## Estimated Effort
| Role | Hours |
|---|---|
| Backend | 5 h |
| Evals | 2.5 h |
| Total | 7.5 h |

## Risk
**Medium.** Role promotion modifies user records — must verify only ADMIN/STAFF
callers can invoke `promote_user_role`. Test with unauthorized caller eval.
