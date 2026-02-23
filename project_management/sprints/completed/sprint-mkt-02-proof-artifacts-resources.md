# Sprint MKT-02 — Proof: Artifacts + Resources Integration

## Objective
Replace “trust me” marketing with inspectable proof by integrating the existing `/resources` lead magnets into the core public pages.

## Problems Addressed (from audit)
- Proof is asserted, not shown.
- Jargon appears before orientation (Spell Book, Context Pack, Audit Log).
- Inconsistencies where pages say “coming soon” while `/resources` is live.

## In Scope
- Add small, low-cognitive-load pointers to existing resources:
  - Spell Book (`/resources/spell-book`)
  - Context Pack Template Kit (`/resources/context-pack`)
  - Human Edge Scorecard (`/resources/assessment`)
- Update `/insights` “Lead Magnets Preview” to link to the live resources (remove “coming soon”).
- Add micro-definitions (1 line) where jargon appears, pointing to the relevant resource.

## Out of Scope
- New PDFs/templates/content generation.
- External citation system or link verification.
- New “case study” pages.

## Acceptance Criteria
- `/insights` has working links to the 3 live resources.
- At least two main pages link to resources in a way that supports the page’s primary CTA (not competing with it).
- No page claims a resource is “coming soon” if it already exists.

## Files (expected)
- `src/app/(public)/insights/page.tsx`
- `src/app/(public)/page.tsx`
- `src/app/(public)/studio/page.tsx` (light touch only; conversion rewrite is Sprint MKT-03)

## QA
- `npm test`
- `npm run build`
