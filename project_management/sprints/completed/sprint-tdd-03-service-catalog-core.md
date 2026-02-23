# Sprint TDD-03 — Service Catalog Core

## Goal
Introduce first-class consulting/training offerings so customers can discover and select services without event-copy workarounds.

## Scope
- Add core entities for service offerings and packages.
- Add admin CRUD for offers/packages.
- Add public offer listing and offer detail pages.
- Add filters by audience and delivery mode.

## TDD Process
1. Write failing domain tests for offering/package invariants.
2. Write failing API contract tests for offer CRUD and validation.
3. Write failing integration tests for listing/filter pipelines.
4. Write failing UI tests for offer list/detail and CTA rendering.
5. Implement and refactor until all tests pass.

## Stories
- As a buyer, I can quickly identify the right service for my needs.
- As an admin, I can manage service offerings without repurposing event fields.

## Acceptance Criteria
- Service offerings/packages exist as first-class records.
- Public catalog supports audience/mode filtering.
- Offer detail presents scope, outcomes, and clear booking CTA paths.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Create/edit/deactivate offerings via admin UI/API.
- Verify public catalog filtering for individual/group and online/in-person.
- Confirm offer detail includes structured package comparison.

Pass condition:
- Offers are discoverable and administrable independent of event entities.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test -- src/lib/__tests__/service-catalog-ui.test.ts src/app/api/v1/offers/__tests__/offers-api.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added first-class service catalog schema migration with `offers` and `offer_packages` tables in `src/cli/db.ts`.
	- Added service catalog API domain module in `src/lib/api/offers.ts` with offer/package CRUD, filtering, and validation.
	- Added offers API routes:
		- `src/app/api/v1/offers/route.ts`
		- `src/app/api/v1/offers/[slug]/route.ts`
		- `src/app/api/v1/offers/[slug]/packages/route.ts`
		- `src/app/api/v1/offers/[slug]/packages/[packageId]/route.ts`
	- Added public catalog UI pages:
		- `src/app/(public)/services/page.tsx`
		- `src/app/(public)/services/[slug]/page.tsx`
	- Added admin catalog management pages:
		- `src/app/(admin)/admin/offers/page.tsx`
		- `src/app/(admin)/admin/offers/[slug]/page.tsx`
	- Added helper and tests:
		- `src/lib/service-catalog-ui.ts`
		- `src/lib/__tests__/service-catalog-ui.test.ts`
		- `src/app/api/v1/offers/__tests__/offers-api.test.ts`
	- Wired navigation and API root affordance updates in:
		- `src/lib/navigation/menu-registry.ts`
		- `src/app/api/v1/route.ts`
		- `src/app/page.tsx`
		- `src/app/(admin)/admin/page.tsx`
	- Verification passed with no build errors and only pre-existing lint warnings.
