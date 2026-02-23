# Missing Feature Review — Commercial Operations (Pricing, Proposals, Invoicing)

## Problem
There is no commercial layer to convert service delivery into business revenue operations.

## What is missing
- Quote/proposal artifacts
- Contract/terms acceptance tracking
- Invoice generation and payment state tracking
- Payment terms logic (deposit, net terms, refunds)
- Revenue attribution by offering, instructor, and client segment

## UX implications
- Teams rely on external spreadsheets and manual process joins.
- Sales-to-delivery handoff is brittle and context is lost.
- Financial visibility and forecasting remain weak.

## Required fundamentals
1. Proposal builder tied to selected offering/package.
2. Proposal status tracking (`draft`, `sent`, `accepted`, `declined`, `expired`).
3. Invoice records linked to engagements and sessions.
4. Payment status UI in admin and client portal.

## Data model additions
- `proposals`: client_id, engagement_id, price_model, terms, status
- `invoices`: proposal_id/engagement_id, amount, currency, due_date, status
- `payments`: invoice_id, amount, method, received_at, reference

## Acceptance criteria
- Engagements move from inquiry to billable work without leaving the system.
- Finance status is visible to both operations and account owners.
- Revenue reporting is reliable at offer and engagement level.
