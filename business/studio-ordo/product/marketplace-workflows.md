# Studio Ordo — Marketplace Workflows (MVP)

## Workflow A — Referral card / QR → Intake
1) Prospect scans QR (contains affiliate/referrer code)
2) System logs click + stores attribution cookie
3) Prospect submits intake form
4) Intake record stores:
   - referrer
   - source channel
   - requested provider (optional)

## Workflow B — Intake queue → Deal
1) Maestro reviews intake
2) Risk flags set (complexity, security sensitivity, timeline risk)
3) Offer selected (standardized catalog)
4) Provider assigned (may or may not be referrer)
5) Maestro approval required

## Workflow C — Payment (upfront)
- Payment is required before work begins.
- After payment:
  - deal transitions to PAID
  - kickoff scheduling can proceed

## Workflow D — Delivery
- Provider updates status and artifacts.
- Maestro supervises; escalation path exists.

## Workflow E — Completion → Ledger
- After delivery marked DELIVERED:
  - create ledger rows:
    - provider payout
    - referrer commission (if any)
    - platform remainder
- Ledger rows require approval before payout.

## Workflow F — Refunds
- Platform controls refunds.
- Refund decisions create audit entries and update ledgers as needed.

## Required safety checks
- No deal can enter IN_PROGRESS unless:
  - MAESTRO_APPROVED, and
  - PAID.

