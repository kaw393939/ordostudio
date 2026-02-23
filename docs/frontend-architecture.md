# Frontend Architecture Blueprint

## Vision
Build a product experience that is:
- **Obvious**: users instantly know context, status, and next action.
- **Fast**: responsive interactions, progressive loading, and resilient recovery.
- **Trustworthy**: consistent governance cues, clear error handling, and accessible UX.
- **Themeable**: brand changes are token-driven, not rewrite-driven.
- **Timeless**: visual language follows Swiss International and Bauhaus principles (clarity, hierarchy, geometry, restraint).

Reference specification:
- `docs/swiss-bauhaus-ui-spec.md`

## Product Principles
1. **Clarity before density**
   - Every screen answers: where am I, what happened, what can I do next.
2. **One primary action per task surface**
   - Event detail and critical flows expose one dominant next step.
3. **Progressive disclosure**
   - Show essentials first; advanced controls are discoverable but not noisy.
4. **System feedback in <100ms visual response**
   - Immediate state feedback via optimistic hints, skeletons, or pending affordances.
5. **Accessible by default**
   - Keyboard, focus, semantics, and color contrast are non-negotiable.

## Stack Decision
- **Framework**: Next.js App Router
- **UI Base**: `shadcn/ui` + Radix primitives
- **Styling**: Tailwind + CSS variables (semantic token model)
- **State/Data**: Route-first server components + focused client islands
- **Tables**: TanStack Table for admin-heavy list operations
- **Forms**: react-hook-form + zod
- **URL State**: nuqs for search/filter/sort/page state synchronization
- **Variants**: class-variance-authority (`cva`) + tailwind-merge
- **Icons**: lucide-react (consistent stroke language)
- **Motion**: framer-motion (restricted, utility-only usage)

## Layered Frontend Structure

### 1) App Shell Layer (Routing + Context)
- Route groups:
  - `src/app/(public)/*`
  - `src/app/(admin)/*`
- Layout responsibilities:
  - Navigation, shell chrome, env/role badge, breadcrumb slot
  - Segment-level `loading.tsx` and `error.tsx`

### 2) Screen Composition Layer
- Route-level screen components compose:
  - data fetch
  - domain view-model adapters
  - page sections (hero, table, action panel)
- No low-level styling rules here beyond layout composition.

### 3) Pattern Components Layer
Reusable product patterns with stable APIs:
- `ActionPanel`
- `FilterToolbar`
- `EmptyState`
- `ProblemDetailsCard`
- `StatusChip`
- `ConfirmActionDialog`

### 4) Primitive Components Layer
- Buttons, inputs, menus, popovers, dialogs, tabs, table primitives.
- Based on `shadcn/ui`; customized only through variants and semantic tokens.

### 5) Design Tokens Layer
- Source of truth for color, spacing, radius, typography, elevation, state colors.
- No direct raw color usage in product components.

## Theming Model

### Swiss/Bauhaus Design Rules (Required)
- Typography is hierarchy-first, not decorative.
- Layout is grid-first with deterministic spacing increments.
- Surfaces are neutral-first; accent colors are sparse and semantic.
- Visual language favors geometric simplicity, restrained radius, and minimal elevation.
- Motion supports orientation and feedback only; no ornamental animation.

### Semantic Tokens (Required)
Define semantic variables (examples):
- Surface: `--bg-canvas`, `--bg-surface`, `--bg-elevated`
- Text: `--text-primary`, `--text-secondary`, `--text-inverse`
- Border: `--border-subtle`, `--border-strong`
- State: `--state-success`, `--state-warning`, `--state-danger`, `--state-info`
- Action: `--action-primary`, `--action-primary-hover`, `--action-secondary`

### Theme Strategy
- `:root` = light default
- `[data-theme="dark"]` = dark mode
- Optional future brand themes using `[data-brand="..."]`
- Tailwind classes map to semantic tokens only.

### Variant Strategy
- Use `cva`/variant helpers for intent/size/state.
- Component contracts remain stable while token values evolve.

### Typography Contract
- Define semantic text roles (display, title, body, label, meta) as tokens.
- Enforce explicit font-size/line-height/weight combinations per role.
- Disallow ad hoc text sizing in feature components.

### Spacing + Grid Contract
- Use standardized spacing tokens (for example 4/8-based rhythm).
- Define canonical container widths and breakpoint behavior.
- Align major layout regions to shared grid rules across public and admin shells.

## UX Contracts (Definition of Done for Screens)
Every user-facing screen must implement:
1. **Loading state**
   - skeletons/shimmers in primary content area
2. **Empty state**
   - explain why empty + clear CTA
3. **Error state**
   - human headline, plain-language cause, next actions
4. **Success feedback**
   - inline state confirmation and/or toast
5. **Accessibility pass**
   - focus order, keyboard support, semantic labels

## Data and Interaction Architecture
- HAL link presence determines action availability.
- UI never infers permissions from role alone when affordances are provided.
- View-model adapter layer translates API resources into display-ready state:
  - status labels
  - action labels
  - disabled reasons
  - problem details mapping

## Performance Standards
1. Segment-level streaming via `loading.tsx`
2. Prefetch likely next routes in high-confidence interactions
3. Minimize client JS by preferring server components for read-heavy views
4. Avoid layout shift on key templates (events list/detail, admin tables)
5. Track Web Vitals in CI/release checks where practical

## Accessibility Standards
- WCAG 2.2 AA target
- Keyboard-only completion for core journeys:
  - discover event
  - register/cancel
  - admin check-in
- Dialogs and overlays must trap focus and restore focus on close
- Error messages announced and linked to fields

## Governance and Trust UI Standards
- Admin shell shows role + environment badges.
- Sensitive actions require explicit confirmation and clear rationale text.
- Export screens explain PII implications before action.
- Problem details show support/request IDs in secondary disclosure.

## Suggested Folder Structure
- `src/components/primitives/*`
- `src/components/patterns/*`
- `src/components/layout/*`
- `src/lib/view-models/*`
- `src/lib/theme/*`
- `src/app/(public)/*`
- `src/app/(admin)/*`

## Engineering Guardrails
- No hard-coded colors in product components.
- No direct API response rendering in UI without adapter/view-model mapping.
- No route without `loading.tsx` and `error.tsx` at major segments.
- No new table/list UX without URL-synced state requirements.
- No decorative shadows/gradients that violate Swiss/Bauhaus clarity rules.
- No feature-level typography rules outside tokenized semantic roles.

## Architecture Exit Criteria
Architecture is considered established when:
- Public/Admin shell separation is implemented.
- Token-based theme system is active and documented.
- Core patterns exist and are reused across at least 3 screens.
- UX contracts are enforced in PR review checklists.

PR checklist reference:
- `docs/frontend-pr-checklist.md`
