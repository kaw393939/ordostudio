# Sprint 21 — QA Checklist

Sprint: 21 — Studio Page & Recommended Events Polish  
Date: 2026-02-24  

---

## Gate 1 — Above-Fold Content (AC-01)

- [ ] 1440px: Value proposition ("The Studio Apprenticeship") visible without scrolling
- [ ] 1440px: CTA button ("Book a Technical Consult") visible without scrolling
- [ ] 768px: Value proposition visible without scrolling
- [ ] 375px: Value proposition visible without scrolling
- [ ] No full-bleed 1536×1024 hero banner image in initial viewport
- [ ] Artifact image (studio-artifact.png) renders at smaller size in aside, hidden on mobile

## Gate 2 — HATEOAS Compliance (AC-02)

- [ ] `recommended-events.tsx` calls `getRoot()` instead of hardcoded `/api/v1/events`
- [ ] API link is resolved via `mapRootToEventsHref()` or equivalent HATEOAS pattern
- [ ] Graceful fallback when API root doesn't provide events link
- [ ] No hardcoded API paths in `recommended-events.tsx`

## Gate 3 — Sidebar Event Dates (AC-03)

- [ ] Sidebar shows events with dates in the future (relative to current date Feb 2026)
- [ ] Shows max 3 events
- [ ] Events have status=PUBLISHED filter applied
- [ ] Empty state shows when no upcoming events exist

## Gate 4 — Sidebar Card Simplification (AC-04, AC-05, AC-06)

- [ ] No "Recommended" Badge on individual event cards
- [ ] Primary action text is "View details" (not "Attend")
- [ ] No "Submit report" link on sidebar event cards
- [ ] No delivery mode/location line on sidebar event cards
- [ ] Card structure: date line → title → "View details" link (≤ 3 type roles)

## Gate 5 — Alex's Journey Progressive Disclosure (AC-07)

- [ ] Journey section is collapsed by default (`<details>` without `open` attribute)
- [ ] Summary text visible: "Alex's story" or similar teaser
- [ ] Clicking expands to show full Month 1–Today narrative
- [ ] Matches style of Gate Projects and Role Readiness collapsible sections

## Gate 6 — Component Extraction (AC-08)

- [ ] `page.tsx` ≤ 200 lines
- [ ] `StudioLevels` component exists at `src/components/studio/studio-levels.tsx`
- [ ] `StudioGateProjects` component exists at `src/components/studio/studio-gate-projects.tsx`
- [ ] Both components are imported and used in `page.tsx`
- [ ] No salary_range displayed in StudioLevels cards

## Gate 7 — Test Suite (AC-09)

- [ ] `npx vitest run` — all tests pass (baseline: 1462)
- [ ] ≥ 2 tests for StudioLevels (renders names, no salary)
- [ ] ≥ 2 tests for StudioGateProjects (renders gate numbers, collapsible)
- [ ] ≥ 1 test for RecommendedEvents (loading skeleton or HATEOAS call)
- [ ] ≥ 5 new tests total

## Gate 8 — Build (AC-10)

- [ ] `npm run build` succeeds with zero errors
- [ ] No new TypeScript errors introduced

## Gate 9 — Guardrail Checks

- [ ] `grep -rn "Recommended" src/app/(public)/studio/recommended-events.tsx` → zero Badge references
- [ ] `grep -rn "Submit report" src/app/(public)/studio/recommended-events.tsx` → zero matches
- [ ] `grep -rn "/api/v1/events" src/app/(public)/studio/recommended-events.tsx` → zero matches
- [ ] `grep -rn "salary_range\|salary" src/components/studio/studio-levels.tsx` → zero matches
- [ ] `wc -l src/app/(public)/studio/page.tsx` → ≤ 200

## Gate 10 — Screenshots

- [ ] 375px screenshot captured for `/studio`
- [ ] 768px screenshot captured for `/studio`
- [ ] 1440px screenshot captured for `/studio`
- [ ] Above-fold content verified in all 3 viewports

---

## Sign-off

| Check | Result | Date |
|-------|--------|------|
| All gates pass | | |
| Sprint moved to completed | | |
