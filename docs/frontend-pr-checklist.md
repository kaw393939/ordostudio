# Frontend PR Checklist (Sprint 33A+)

Use this checklist for all UI work after Sprint 33A.

## Architecture
- [ ] Feature screen composes existing primitives/patterns before adding new ones.
- [ ] New shared components are placed in correct layer (`primitives`, `patterns`, `layout`, `view-models`).
- [ ] No direct API payload rendering in screens; view-model adapter used when shaping display state.

## Visual System
- [ ] Typography uses semantic roles (`type-*`) instead of ad hoc text sizing.
- [ ] Spacing follows tokenized rhythm scale.
- [ ] Colors are semantic token classes/variables (no raw color utilities).
- [ ] Radius/elevation choices remain restrained and consistent with Swiss/Bauhaus spec.

## UX Contracts
- [ ] Async surfaces include loading, empty, error, and success feedback paths.
- [ ] Errors provide clear user action and optional support context.
- [ ] Core interactions provide visible confirmation feedback.

## Accessibility
- [ ] Keyboard-only flow is functional for new interactions.
- [ ] Focus-visible states are obvious and preserved.
- [ ] Form errors are clearly associated and readable.

## Verification
- [ ] `npm run lint`
- [ ] `npm run lint:ui-guardrails`
- [ ] `npm run build`

## Sprint 40 Additions
- [ ] Key read-heavy routes include route-level loading/skeleton coverage.
- [ ] Read-heavy navigation links use predictable prefetch behavior.
- [ ] Read-heavy API responses set explicit cache-control policy.
- [ ] Tables include accessible captions, column headers, and keyboard-reachable controls.
- [ ] Focus-visible states are clearly visible on all interactive controls.
