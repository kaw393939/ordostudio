# Studio Ordo — Deal Lifecycle (Reference)

## Purpose
Provide one canonical set of states and transitions for the managed marketplace.

## Entities
- Intake (lead)
- Deal (work unit)
- Payment (Stripe)
- Ledger rows (provider payout, referrer commission, platform remainder)

## Deal statuses (MVP)
- QUEUED: created from intake; awaiting triage/assignment
- ASSIGNED: provider selected; not yet approved
- MAESTRO_APPROVED: maestro has approved the match and scope
- PAID: upfront payment captured
- IN_PROGRESS: delivery started (requires MAESTRO_APPROVED + PAID)
- DELIVERED: deliverables produced; completion note exists
- CLOSED: finalized (post-delivery admin close)
- REFUNDED: terminal

## Required gates
- IN_PROGRESS requires:
  - MAESTRO_APPROVED
  - PAID

## Ledger timing
- Ledger rows are created at DELIVERED by default.
- Ledger rows must go through:
  - EARNED → APPROVED → PAID

## Refund effects
- Refunds freeze payout eligibility.
- Partial refunds reduce commission basis.

