# Sprint PRD-10 — Accessibility Hardening

## Severity: MEDIUM

## Goal
Add automated accessibility auditing using axe-core, implement skip-to-content navigation, ensure focus management on route transitions, and expand the a11y test suite from structural string-matching to runtime DOM-based assertions.

## Why This Matters
The current a11y test (`e2e-a11y-ui-regression.test.ts`) checks that `aria-label` strings exist in source code — it does **not** run a real a11y scanner against rendered DOM. There's no skip-to-content link, no focus management on route changes, and no axe-core integration. While the component library has good ARIA attribute coverage, there's no automated guarantee that the rendered pages are actually accessible.

## Current State (Evidence)

| What exists | Where |
|-------------|-------|
| ARIA attributes on components | 15+ components with `aria-label`, `aria-live`, `aria-current`, `aria-expanded`, etc. |
| `focus-visible:ring-2` styles | Button, input, and interactive component primitives |
| `aria-invalid` + `aria-describedby` on forms | `src/components/forms/` with dedicated test file |
| Structural a11y regression test | `src/app/__tests__/e2e-a11y-ui-regression.test.ts` — checks source strings, not rendered DOM |
| No axe-core | Not a direct dependency; only transitive via lighthouse and eslint-plugin-jsx-a11y |
| No skip-to-content | No skip navigation link in any layout |
| No focus management on navigation | No `useEffect` focus calls on route transitions |
| eslint-plugin-jsx-a11y | In eslint config — catches JSX a11y issues at lint time |
| 49 page.tsx files | 24 public + 24 admin + 1 dev |

## Scope

### 1. axe-core Integration (`vitest-axe` or custom)
Add `@axe-core/react` or `axe-core` as a dev dependency and create a test helper:
```ts
import { axe, toHaveNoViolations } from "jest-axe";
// or custom axe-core integration for vitest

expect.extend(toHaveNoViolations);

export async function expectNoA11yViolations(html: string) {
  const results = await axe(html);
  expect(results).toHaveNoViolations();
}
```

### 2. Skip-to-Content Link
Add to the root layout (`src/app/layout.tsx`) and both route group layouts:
```tsx
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
>
  Skip to content
</a>
```

Add `id="main-content"` to the main content area in each layout.

### 3. Focus Management on Route Transitions
Create a `RouteAnnouncer` component:
```tsx
"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function RouteAnnouncer() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Announce page change to screen readers
    ref.current?.focus();
  }, [pathname]);
  
  return (
    <div 
      ref={ref} 
      tabIndex={-1} 
      aria-live="assertive" 
      aria-atomic="true" 
      className="sr-only"
    >
      Navigated to {pathname}
    </div>
  );
}
```

### 4. Automated A11y Audit for All Page Renders
Create tests that render page components and run axe-core against the output:

**Priority pages to audit:**
- Home page
- Events list + detail
- Login + Register
- Account page
- Admin dashboard
- Admin events list
- Admin users
- Service request form

### 5. Color Contrast Verification
- Verify all text/background combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large)
- Check both light and dark themes
- Use axe-core's `color-contrast` rule

### 6. Form Accessibility Hardening
- Every form input has a visible label (not just placeholder)
- Error messages linked via `aria-describedby`
- Required fields marked with `aria-required`
- Form submission feedback announced to screen readers
- Loading states use `aria-busy`

### 7. Table Accessibility
- All data tables have `<caption>` (admin tables already have some)
- Column headers use `scope="col"`
- Row headers use `scope="row"` where applicable
- Sortable columns announced with `aria-sort`

### 8. Keyboard Navigation Audit
- All interactive elements reachable via Tab
- Modal dialogs trap focus
- Escape closes dialogs/dropdowns
- Arrow keys work in menus/selects

## Non-Goals
- WCAG AAA compliance (targeting AA)
- Screen reader testing with real AT (manual activity)
- Mobile accessibility (screen reader gesture support)
- Full keyboard shortcut system
- Axe-core in production bundle (dev/test only)

## TDD Process

### Red Phase
1. **axe-core page audit tests** (`src/app/__tests__/a11y-axe-audit.test.ts`):
   - Render home page → no axe violations
   - Render events page → no axe violations
   - Render login page → no axe violations
   - Render admin dashboard → no axe violations
   - (Parameterized across high-priority pages)

2. **Skip-to-content tests**:
   - Layout renders skip link as first focusable element
   - Skip link is visually hidden until focused
   - Skip link targets `#main-content`
   - `#main-content` exists in page

3. **Route announcer tests**:
   - Component renders with `aria-live="assertive"`
   - On pathname change → content updates
   - Element receives focus on navigation

4. **Form a11y tests** (extend existing):
   - All form fields have associated labels
   - Error states have `aria-invalid="true"`
   - `aria-describedby` points to error message element
   - Submit button has loading state with `aria-busy`

5. **Table a11y tests**:
   - Admin tables have `<caption>`
   - Headers have `scope="col"`
   - Tables have `aria-label` or `aria-describedby`

### Green Phase — Implement all features
### Refactor Phase — Extract shared a11y testing patterns

## E2E Verification Tests

### Test: "home page passes axe-core audit"
```
1. Render home page component
2. Run axe-core against rendered HTML
3. Assert: 0 violations (or only known exceptions with justification)
4. Check: all images have alt text
5. Check: heading hierarchy is correct (h1 before h2)
6. Check: no color contrast failures
```

### Test: "skip-to-content link works"
```
1. Render any page layout
2. Assert: first focusable element is skip link
3. Assert: skip link has href="#main-content"
4. Assert: skip link has sr-only class (hidden visually)
5. Focus skip link → visible
6. Activate skip link → main content area receives focus
```

### Test: "login form is fully accessible"
```
1. Render login page
2. Run axe-core → 0 violations
3. Assert: email input has visible label
4. Assert: password input has visible label
5. Submit with empty fields → error messages appear
6. Assert: invalid fields have aria-invalid="true"
7. Assert: error messages linked via aria-describedby
8. Assert: focus moves to first error field
```

### Test: "admin data table is accessible"
```
1. Render admin events table with data
2. Run axe-core → 0 violations
3. Assert: table has caption
4. Assert: all column headers have scope="col"
5. Assert: table is keyboard navigable
```

## Acceptance Criteria
- [ ] axe-core integrated into test suite
- [ ] No axe violations on 8+ high-priority pages
- [ ] Skip-to-content link in all layouts
- [ ] `RouteAnnouncer` announces page transitions
- [ ] All form inputs have visible labels
- [ ] All forms have error -> aria-describedby wiring
- [ ] All admin tables have captions and scoped headers
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works for all interactive elements
- [ ] All existing tests pass
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
