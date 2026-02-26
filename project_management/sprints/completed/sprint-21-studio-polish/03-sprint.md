# Sprint 21 — Task Plan

Sprint: 21 — Studio Page & Recommended Events Polish  
Estimate: 10 tasks  
Dependencies: Sprint 20 (Events redesign) complete

---

## Task Dependency Graph

```
T1 (hero removal) ──┐
T2 (sidebar HATEOAS)─┤
T3 (sidebar cards)───┤
T4 (journey collapse)┤── T8 (recompose page.tsx)── T9 (full test suite)── T10 (screenshots + QA)
T5 (extract levels)──┤
T6 (extract gates)───┤
T7 (salary removal)──┘
```

---

## Tasks

### T1 — Remove full-bleed hero banner
**File**: `page.tsx`  
**Action**: Delete the `<section>` containing the 1536×1024 `<Image>` banner (lines 68–79). The Executive Summary `<section>` (lines 82–109) is now the first content after PageShell title — this becomes the above-fold value proposition.  
**AC**: AC-01  
**Estimate**: 5 min

### T2 — Refactor RecommendedEvents to use HATEOAS
**File**: `recommended-events.tsx`  
**Action**: Replace direct `/api/v1/events?...` fetch with `getRoot()` → `mapRootToEventsHref()` → `requestHal()`. Match the pattern in `page-client.tsx`. Import from existing `@/lib/hal-client` and `@/lib/view-models/events`.  
**AC**: AC-02, AC-03  
**Estimate**: 15 min

### T3 — Simplify sidebar event cards
**File**: `recommended-events.tsx`  
**Action**:  
1. Remove "Recommended" `<Badge>` from each card  
2. Change "Attend" link to "View details →"  
3. Remove "Submit report" link entirely  
4. Remove delivery mode / location line  
5. Reorder to: date line → title → "View details" link (matching EventCard's 3 type roles)  
**AC**: AC-04, AC-05, AC-06  
**Estimate**: 10 min

### T4 — Wrap Alex's Journey in `<details>`
**File**: `page.tsx`  
**Action**: Wrap the existing Journey `<section>` content (Month 1–Today cards) inside a `<details>` element with the same pattern used by Gate Projects and Role Readiness sections. Keep the section header visible.  
**AC**: AC-07  
**Estimate**: 5 min

### T5 — Extract StudioLevels component
**Files**: Create `src/components/studio/studio-levels.tsx` + test  
**Action**: Extract the levels grid (lines 196–241) into a presentational component `StudioLevels({ levels })`. Remove salary_range display from card (D5).  
**AC**: AC-08, AC-10  
**Estimate**: 15 min

### T6 — Extract StudioGateProjects component
**Files**: Create `src/components/studio/studio-gate-projects.tsx` + test  
**Action**: Move `gateProjects` array and the collapsible grid into a standalone component. The data stays hardcoded (it's static curriculum content, not DB-driven).  
**AC**: AC-08  
**Estimate**: 15 min

### T7 — Remove salary from level cards, keep in Role Readiness table
**File**: `studio-levels.tsx` (from T5)  
**Action**: Ensure `salary_range` dl item is not rendered in the levels grid. The salary data already exists in the Role Readiness collapsible table — that's where it belongs.  
**AC**: AC-10  
**Estimate**: 5 min (part of T5)

### T8 — Recompose Studio page.tsx as thin shell
**File**: `page.tsx`  
**Action**: Rewrite page to compose extracted components. Target ≤ 200 lines. Keep: metadata, `getLevels()`, Executive Summary, Bottega Model, CEO of Agents, Page CTA. Import: `StudioLevels`, `StudioGateProjects`, `RecommendedEvents`.  
**AC**: AC-08  
**Estimate**: 20 min

### T9 — Run full test suite + write new tests
**Action**:  
1. Run `npx vitest run` — all existing tests must pass  
2. Write tests for `StudioLevels`: renders level names, no salary display  
3. Write tests for `StudioGateProjects`: renders gate numbers, collapsible behavior  
4. Write tests for `RecommendedEvents`: HATEOAS fetch, loading skeleton, card structure  
**AC**: AC-09, AC-10  
**Estimate**: 30 min

### T10 — Screenshots + QA checklist
**Action**: Start dev server, take Playwright screenshots at 375px/768px/1440px for `/studio` page. Verify all acceptance criteria. Fill in QA checklist.  
**AC**: All  
**Estimate**: 15 min

---

## Total Estimate: ~2 hours

## Risk
- `listLevels()` hits SQLite at build time — if DB is empty, levels section won't render (current try/catch handles this gracefully)
- RecommendedEvents HATEOAS refactor must handle case where API root doesn't include events link
