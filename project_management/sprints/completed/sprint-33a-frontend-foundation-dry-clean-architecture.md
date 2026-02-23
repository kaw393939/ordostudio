# Sprint 33A — Frontend Foundation (DRY + Clean Architecture)

## Goal
Establish a platform-grade frontend foundation that minimizes future refactoring and enables reuse across multiple products/systems through strict boundaries, shared patterns, and token-driven theming.

## Why This Sprint Exists
- We are building long-lived product infrastructure, not one-off screens.
- Architecture quality now is cheaper than large-scale refactors later.
- Future sprints (33–40) should be feature delivery, not foundational rewrites.

## Scope
- Establish semantic token system and theme contract (light/dark ready, future brand-ready).
- Define Swiss International / Bauhaus visual language constraints:
  - strict typographic hierarchy
  - geometric spacing rhythm
  - grid-first layout rules
  - minimal color system with disciplined accent usage
  - utility-first, non-decorative motion
- Scaffold component architecture layers:
  - primitives
  - patterns
  - layout
  - screen composition
- Create view-model adapter boundary between API resources and UI rendering.
- Standardize async UX contracts (loading/empty/error/success) as reusable pattern components.
- Add guardrails for consistency:
  - naming conventions
  - import boundaries
  - no hard-coded color policy
  - shared variant patterns
  - reusable state and feedback conventions
  - typography and spacing token compliance
  - limited-radius and elevation policy
- Document implementation rules in architecture docs and sprint planning artifacts.

## Non-Goals
- No broad feature expansion outside foundation-seeding examples.
- No visual polish work that does not improve architecture reuse.
- No ad hoc per-page abstractions without demonstrated cross-screen reuse value.
- No ornamental gradients, decorative shadows, or stylistic effects that conflict with Swiss/Bauhaus clarity.
- No freeform per-screen typography scale deviations.

## Architecture Decisions (Required)
- UI primitives are built from shadcn/radix and customized via semantic tokens only.
- Business/API response shapes do not render directly in UI; adapters normalize to view models.
- Public/Admin shell divergence is structural (layout/route groups), not conditional styling hacks.
- Shared pattern APIs are stable and documented before wide adoption.
- New UI state surfaces must use standardized loading/empty/error/success components.
- Layout is grid-first with deterministic spacing increments.
- Typography uses a constrained scale with explicit semantic roles (display, title, body, meta, label).
- Color usage follows neutral-first surfaces with one primary accent per context.

## Design Language Foundations (Swiss/Bauhaus)
- Typography:
  - Prefer neutral, highly legible sans-serif with strong hierarchy discipline.
  - Enforce tokenized size/weight/line-height scale; avoid ad hoc text styling.
- Grid and rhythm:
  - Use predictable column grid and spacing increments for all layouts.
  - Align key surfaces to baseline rhythm to reduce visual noise.
- Shape and visual density:
  - Prefer simple geometric forms, restrained radius, and minimal elevation.
  - Treat whitespace as a primary design element, not leftover space.
- Color and emphasis:
  - Neutral surfaces, high contrast text, sparse accent usage for action/state.
  - Never use color as the only meaning carrier; pair with labels/icons.
- Motion:
  - Fast, purposeful transitions supporting orientation only.
  - No decorative animation that does not improve comprehension.

## Recommended Libraries
- Core primitives:
  - shadcn/ui + Radix UI (accessibility-first interaction primitives)
- Variant and class contracts:
  - class-variance-authority (cva)
  - tailwind-merge
- Data-dense admin surfaces:
  - TanStack Table
- Forms and validation:
  - react-hook-form
  - zod
- State utility for server/client boundaries:
  - nuqs (URL state for filters/sort/page)
- Motion (minimal and purposeful only):
  - framer-motion (restricted usage policy)
- Icons:
  - lucide-react (consistent stroke-based icon language)
- Optional typography helpers:
  - next/font with Inter as baseline; evaluate IBM Plex Sans or Manrope for alternates

## TDD Process
1. Write failing tests for token-based theming behavior and theme switching hooks.
2. Write failing tests for shared pattern components (empty/error/loading state surfaces).
3. Write failing tests for view-model adapters to ensure API-to-UI normalization.
4. Write failing tests for boundary rules where practical (lint/config assertions).
5. Implement/refactor with tests green.

## Stories
- As a developer, I can build new screens using reusable patterns instead of ad hoc code.
- As a design/system owner, I can adjust visual themes via tokens without editing feature components.
- As a product team, we can deliver upcoming UX sprints with reduced architecture churn.

## Acceptance Criteria
- Semantic design tokens are defined and used by shared UI primitives.
- Core reusable patterns exist for loading/empty/error/success states.
- A view-model adapter layer exists and is used by at least one representative screen.
- Frontend architecture conventions are documented and discoverable.
- New UI work can proceed without introducing hard-coded style or duplicated flow patterns.

## Architecture Quality Gates
- Reuse gate:
  - At least 3 shared pattern components are used by at least 2 distinct surfaces each.
- Boundary gate:
  - No direct API resource object rendering in representative screens.
- Token gate:
  - No hard-coded color classes in shared primitives/patterns.
- Visual language gate:
  - Shared components conform to typography, spacing, and contrast token rules.
- UX contract gate:
  - Representative surfaces implement loading/empty/error/success using shared patterns.
- Operability gate:
  - Error components support actionable next steps and request/support-id display hook points.

## Deliverables
- Foundation sprint document (this file).
- Updated architecture source of truth in docs.
- Reusable component/pattern baseline ready for Sprints 33–40.
- PR review checklist criteria for enforcing guardrails.
- Swiss/Bauhaus UI spec appendix (type scale, spacing scale, grid, color roles, motion limits).

Primary references:
- `docs/frontend-architecture.md`
- `docs/swiss-bauhaus-ui-spec.md`

## Execution Milestones
1. Theme + token contract baseline
2. Component layer scaffolding
3. Swiss/Bauhaus spec codification (typography/grid/spacing/motion)
4. Shared state pattern components
5. Adapter boundary implementation on representative screen
6. Guardrails + documentation + verification

## Risks and Mitigations
- Risk: over-abstraction too early.
  - Mitigation: only extract patterns validated by at least 2 use cases.
- Risk: foundation sprint slips into feature work.
  - Mitigation: enforce non-goals and keep examples minimal.
- Risk: architecture rules are documented but not enforced.
  - Mitigation: add checklist/lint/test-backed gates before exit.

## End-of-Sprint Verification
```bash
npm run test -- ui-foundation design-system
npm run lint
npm run build
```
Manual checks:
- Verify token changes affect UI consistently without per-screen style edits.
- Verify one representative screen uses adapters + shared patterns end-to-end.
- Verify typography and spacing inspect cleanly against documented token scale.
- Verify accent color usage is restrained and semantically consistent.

Pass condition:
- Sprint 33A tests pass.
- Foundation and guardrail acceptance criteria are validated.
- Architecture quality gates pass with no critical deviations.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- `src/app/globals.css` (semantic tokens, typography roles, spacing rhythm, focus, motion/reduced-motion)
- `src/components/primitives/*` (Button, Input, Card)
- `src/components/patterns/*` (Loading, Empty, Error, Success states)
- `src/components/layout/page-shell.tsx`
- `src/lib/view-models/events.ts` (API-to-UI adapter)
- `scripts/check-ui-guardrails.mjs`
- `docs/frontend-pr-checklist.md`

Verification executed:
```bash
npm run lint
npm run lint:ui-guardrails
npm test -- src/app/__tests__/e2e-ui-hardening.test.ts src/app/api/v1/users/__tests__/users-api.test.ts
npm run build
```

Verification outcome:
- `npm run lint` passed with pre-existing unrelated warnings only.
- `npm run lint:ui-guardrails` passed.
- Targeted tests passed.
- Production build passed.
