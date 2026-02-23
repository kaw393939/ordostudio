# Sprint TDD-08 — Commercial Operations Core

## Goal
Enable core revenue operations from proposal through payment tracking.

## Scope
- Add proposal lifecycle (`draft`, `sent`, `accepted`, `declined`, `expired`).
- Add invoice creation and payment status tracking.
- Link commercial artifacts to engagements/sessions.
- Add admin visibility for billing state and revenue primitives.

## TDD Process
1. Write failing domain tests for proposal/invoice/payment state transitions.
2. Write failing API tests for commercial object validation and links.
3. Write failing integration tests for intake-to-billing lifecycle continuity.
4. Write failing UI tests for proposal/invoice state visibility.
5. Implement and refactor until all tests pass.

## Stories
- As operations and finance, I can track billable lifecycle in-product.
- As account owners, I can see payment status per engagement.

## Acceptance Criteria
- Proposals, invoices, and payments are first-class entities.
- State transitions are valid and auditable.
- Engagements can be tracked from booking to paid status.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Create and advance proposals through lifecycle states.
- Issue invoice and record payment transitions.
- Validate reporting slices by offer/client segment.

Pass condition:
- Commercial lifecycle is reliable enough for day-to-day revenue operations.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test -- src/core/use-cases/__tests__/commercial-lifecycle.test.ts src/app/api/v1/commercial/__tests__/commercial-api.test.ts src/lib/__tests__/admin-events-view.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added commercial schema migration `007_commercial_operations_core` in `src/cli/db.ts` with first-class entities:
		- `proposals`
		- `invoices`
		- `payments`
		- proposal/invoice status history tables
	- Added lifecycle transition domain logic and tests:
		- `src/core/use-cases/commercial-lifecycle.ts`
		- `src/core/use-cases/__tests__/commercial-lifecycle.test.ts`
	- Added commercial API module for proposal/invoice/payment creation, transitions, linkage validation, payment-derived status updates, audit logging, and overview metrics:
		- `src/lib/api/commercial.ts`
	- Added admin-protected commercial APIs:
		- `src/app/api/v1/commercial/route.ts`
		- `src/app/api/v1/commercial/proposals/route.ts`
		- `src/app/api/v1/commercial/proposals/[id]/route.ts`
		- `src/app/api/v1/commercial/invoices/route.ts`
		- `src/app/api/v1/commercial/invoices/[id]/route.ts`
		- `src/app/api/v1/commercial/invoices/[id]/payments/route.ts`
	- Added admin visibility surface for billing state and revenue primitives:
		- `src/app/(admin)/admin/commercial/page.tsx`
		- linked from `src/app/(admin)/admin/page.tsx`
		- discoverable via `src/lib/navigation/menu-registry.ts` and `src/app/api/v1/route.ts`
	- Added focused commercial API tests including intake-to-billing continuity and payment tracking transitions:
		- `src/app/api/v1/commercial/__tests__/commercial-api.test.ts`
	- Verification passed; lint reported only pre-existing warnings.
