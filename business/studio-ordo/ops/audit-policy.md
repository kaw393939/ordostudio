# Studio Ordo — Audit Policy

## Principle
If it changes state, it must be auditable.

## Minimum requirements
- Each mutation records:
  - actor id (user or token)
  - action name
  - request id
  - timestamp
  - metadata (ids, amounts)

## Money operations
- Payment capture, refunds, ledger approvals, payout execution are high-severity audit events.

## Review
- Weekly review of high/critical audit events.

