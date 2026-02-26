# Sprint 22: Studio Visual Polish Sprint Plan

## 1. Tasks

### T1: Remove Redundant PageShell Header
- **File**: `src/app/(public)/studio/page.tsx`
- **Action**: Remove `title` and `subtitle` props from `<PageShell>`.
- **Why**: Eliminates the double header at the top of the page.

### T2: Wrap StudioLevels in Surface Card
- **File**: `src/components/studio/studio-levels.tsx`
- **Action**: Change the outer `<section>` to `<section className="surface p-6 rounded-lg border border-border-subtle">`.
- **Why**: Matches the visual rhythm of the other sections.

### T3: Unify Level Badges and Typography
- **File**: `src/components/studio/studio-levels.tsx`
- **Action**: Change `<Badge variant={index === 0 ? "default" : "outline"}>` to `<Badge variant="secondary">`. Change the number circle class from `type-label` to `type-meta`.
- **Why**: Removes the false "selected" state implication and adheres to the "≤3 type roles per card" rule.

### T4: Add Hover States to Collapsibles
- **Files**: `src/components/studio/studio-journey.tsx`, `src/components/studio/studio-gate-projects.tsx`, `src/components/studio/studio-role-readiness.tsx`
- **Action**: Add `hover:bg-surface-muted` to the `<summary>` elements.
- **Why**: Provides a clearer interactive affordance.

### T5: Refactor Layout to Single Column
- **File**: `src/app/(public)/studio/page.tsx`
- **Action**: Remove the `lg:grid-cols-[1fr_300px]` grid layout. Move the `<aside>` containing `RecommendedEvents` to the bottom of the main content, above the final CTA.
- **Why**: Eliminates the massive empty space on desktop and simplifies the reading flow.

### T6: Update Tests
- **Files**: `src/components/studio/__tests__/*.test.tsx`
- **Action**: Update any tests that might fail due to class changes or layout shifts (though most should pass since they test content, not classes).
- **Why**: Ensures the test suite remains green.

### T7: Full Verification
- **Action**: Run `npx vitest run` and `npm run build`.
- **Why**: Final check before completion.

## 2. Dependency Graph
- T1, T2, T3, T4, T5 can be done in parallel.
- T6 depends on T1-T5.
- T7 depends on T6.
