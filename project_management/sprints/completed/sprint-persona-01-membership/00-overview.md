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
| 6 membership/apprentice tools | UI pages for rank progression |
| 4 evals (P1-01 through P1-04) | Payment gating for membership tiers |
| Role promotion deferred to UI | Email notifications on role change |
| ASSOCIATE/CERTIFIED gate checks | Stripe integration changes |

## Inputs Required
- Maestro-00b complete: `ASSOCIATE`, `CERTIFIED_CONSULTANT`, `STAFF` roles
  exist in DB (migration 044)
- `users`, `intake_requests`, `role_requests` tables present

## Outputs Produced
- 8 new tools in `src/lib/agent/tools/maestro-persona-membership.ts`
- 4 evals: P1-01 through P1-04
- Total tool count: 29 → 37

## Estimated Effort
| Role | Hours |
|---|---|
| Backend | 5 h |
| Evals | 2.5 h |
| Total | 7.5 h |

## Risk
**Medium.** Role promotion modifies user records — must verify only ADMIN/STAFF
callers cannot invoke admin-only tools. ADMIN auth enforced at route level.

## What Was Removed vs Original Spec

**`promote_user_role` (Tool 6):** Removed from agent. An LLM confirming role promotion
via a text response is a dangerous pattern — the LLM could misread intent and promote the
wrong user, or an admin could be socially engineered. This belongs in a dedicated
confirmation UI with an explicit button press, not a conversational agent. Add to a
future `sprint-admin-role-ui` sprint.

**`review_gate_submission` (Tool 7):** Removed from agent. Gate submission review is an
admin workflow that requires context-rich UI (attachments, notes, history). A conversational
interface is the wrong medium for a formal review decision.

**Eval P1-04 (`promote-user-role`):** Removed with `promote_user_role`.

**Tool count:** 8 → 6. **Eval count:** 5 → 4.
