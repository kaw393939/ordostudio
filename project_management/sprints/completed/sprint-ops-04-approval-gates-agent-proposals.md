# Sprint OPS-04 — Approval Gates (Agent Proposals → Human Confirm)

## Goal
Make the human/agent boundary enforceable:
- agents can propose
- humans approve
- the system audits everything

## Scope
- Money: payouts/refunds/ledger adjustments
- Publishing: newsletter send, event publish/close
- Permissions: role/entitlements escalation

## Deliverables
- [ ] A consistent “proposal” model:
  - proposed action
  - preconditions
  - risk level
  - required approvals
  - audit trail
- [ ] UI screens that are *approval-only* (no complex admin panels):
  - review proposal
  - accept/deny
  - record rationale

## Acceptance Criteria
- [ ] Agents cannot execute gated actions without approval.
- [ ] Approval screens show preconditions and provenance.
- [ ] All approvals emit audit entries with rationale.
- [ ] Lint/tests/build pass.
