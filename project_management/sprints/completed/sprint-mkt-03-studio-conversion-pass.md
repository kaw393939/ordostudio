# Sprint MKT-03 — Studio Page: Conversion-First Restructure (No New Features)

## Objective
Refactor `/studio` from “everything we believe” into a conversion tool: reduce reading load, define terms quickly, and make the next step obvious.

## Problems Addressed (from audit)
- Page reads like a handbook (too much uninterrupted content).
- Multiple heavy sections at equal weight (no clear priority).
- Jargon without fast definitions.

## In Scope
- Keep all existing information, but restructure with progressive disclosure:
  - Move long lists/tables into `<details>` blocks.
  - Add a short “What you’ll do / what you’ll have” summary near the top.
  - Make the primary CTA consistent (consult) and secondary CTA resource-driven (Context Pack kit).
- Keep the existing recommended events section but reduce its prominence vs conversion.

## Out of Scope
- New application flow, forms, or multi-step onboarding.
- Changing database schema or apprentice progression logic.

## Acceptance Criteria
- Top of `/studio` answers in <10 seconds:
  - What it is
  - Who it’s for
  - What happens next
- Gate projects and readiness tables are accessible but not required reading.
- Primary CTA appears above the fold on desktop.

## Files (expected)
- `src/app/(public)/studio/page.tsx`
- `src/app/(public)/studio/recommended-events.tsx` (only if needed for layout stability)

## QA
- `npm test`
- `npm run build`
