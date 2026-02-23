# Swiss / Bauhaus UI Spec Appendix

## Purpose
Define a concrete, reusable visual system for this product and future systems based on Swiss International and Bauhaus principles: clarity, hierarchy, geometric order, and restraint.

This appendix is the implementation companion to:
- `docs/frontend-architecture.md`
- `project_management/sprints/planning/sprint-33a-frontend-foundation-dry-clean-architecture.md`

## Core Principles
1. Clarity over decoration.
2. Hierarchy over density.
3. Geometry over improvisation.
4. Systems over one-off styling.
5. Accessibility over aesthetic novelty.

## 1) Typography System

### 1.1 Font stack
- Primary: `Inter` (via `next/font`)
- Fallback: system sans stack
- Optional alternates for future brand validation:
  - `IBM Plex Sans`
  - `Manrope`

### 1.2 Type roles (semantic, required)
Use semantic role classes/tokens only, never ad hoc sizing in feature components.

- `display`
  - size: 48
  - line-height: 56
  - weight: 600
  - tracking: -0.02em
- `h1`
  - size: 36
  - line-height: 44
  - weight: 600
  - tracking: -0.015em
- `h2`
  - size: 30
  - line-height: 38
  - weight: 600
  - tracking: -0.01em
- `h3`
  - size: 24
  - line-height: 32
  - weight: 600
  - tracking: -0.005em
- `title`
  - size: 20
  - line-height: 28
  - weight: 600
- `body-lg`
  - size: 18
  - line-height: 28
  - weight: 400
- `body`
  - size: 16
  - line-height: 24
  - weight: 400
- `body-sm`
  - size: 14
  - line-height: 20
  - weight: 400
- `label`
  - size: 14
  - line-height: 20
  - weight: 500
- `meta`
  - size: 12
  - line-height: 16
  - weight: 500
  - tracking: 0.01em

### 1.3 Typographic rules
- Body text defaults to 16/24.
- Avoid center-aligned body paragraphs; left-align for scanability.
- Keep line length between 45–75 characters where practical.
- Use no more than 3 type roles in a single card/surface.

## 2) Spacing + Grid System

### 2.1 Base unit
- Base spacing unit: 4px.
- Preferred rhythm increments: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96.

### 2.2 Layout grid
- Desktop content grid: 12 columns.
- Tablet content grid: 8 columns.
- Mobile content grid: 4 columns.
- Gutters:
  - mobile: 16
  - tablet: 24
  - desktop: 32
- Max content width: 1200.

### 2.3 Spatial rules
- Minimum section vertical spacing: 32.
- Minimum card padding: 16.
- Use 24+ spacing between major semantic groups.
- Avoid arbitrary spacing values not in token scale.

## 3) Shape + Elevation

### 3.1 Radius policy
- `radius-xs`: 2
- `radius-sm`: 4
- `radius-md`: 8
- `radius-lg`: 12
- Maximum default radius in enterprise/admin surfaces: 8.

### 3.2 Elevation policy
Swiss/Bauhaus style uses restrained elevation.

- `elevation-0`: none
- `elevation-1`: subtle border + minimal shadow
- `elevation-2`: stronger border contrast, optional soft shadow for overlays
- Avoid layered/glassy/decorative shadows.

## 4) Color System (Semantic)

### 4.1 Color strategy
- Neutral-first surfaces and typography.
- One primary accent family for actions.
- State colors reserved for semantic state and alerts.
- Color never conveys meaning alone; pair with icon/label.

### 4.2 Semantic token set (required)
Surfaces:
- `--bg-canvas`
- `--bg-surface`
- `--bg-elevated`

Text:
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--text-inverse`

Borders:
- `--border-subtle`
- `--border-default`
- `--border-strong`

Actions:
- `--action-primary`
- `--action-primary-hover`
- `--action-secondary`
- `--action-secondary-hover`

States:
- `--state-success`
- `--state-warning`
- `--state-danger`
- `--state-info`

Focus:
- `--focus-ring`

### 4.3 Contrast requirements
- Body text contrast target: WCAG AA minimum 4.5:1.
- Large text contrast target: minimum 3:1.
- Interactive controls and focus indicators must be visible in both light and dark themes.

## 5) Motion System

### 5.1 Motion intent
Motion exists for orientation and feedback only.

### 5.2 Duration/easing tokens
- `motion-fast`: 120ms
- `motion-base`: 180ms
- `motion-slow`: 240ms
- Easing defaults:
  - enter: `cubic-bezier(0.2, 0.8, 0.2, 1)`
  - exit: `cubic-bezier(0.4, 0, 1, 1)`

### 5.3 Motion rules
- No looping decorative motion in core workflows.
- Respect reduced motion preferences.
- Keep transform distances subtle and purposeful.

## 6) Component Architecture Contracts

### 6.1 Layer boundaries
- `primitives`: low-level controls, tokenized styling only.
- `patterns`: reusable product blocks (empty/error/loading/action panels).
- `layout`: shell and page frame composition.
- `screens`: route-level composition only.

### 6.2 DRY rules
- If repeated UI appears in 2+ surfaces, extract to pattern.
- If repeated styling appears in 2+ primitives, extract to variant/token.
- No direct API payload shaping inside screen components; use adapters.

## 7) State UX Contracts (Required)
Every async surface must provide:
1. loading state
2. empty state
3. error state with next action
4. success confirmation (inline or toast)

Error surfaces should support a hidden/secondary request-id support detail.

## 8) Accessibility Contracts
- WCAG 2.2 AA baseline.
- Full keyboard support for primary workflows.
- Visible focus states on all interactive controls.
- Dialogs trap focus and restore focus to trigger.
- Form errors are linked and announced.

## 9) Library Baseline
- Core UI: `shadcn/ui` + Radix UI
- Variants: `class-variance-authority` + `tailwind-merge`
- Forms: `react-hook-form` + `zod`
- Data tables: `@tanstack/react-table`
- URL state: `nuqs`
- Icons: `lucide-react`
- Motion (restricted): `framer-motion`

## 10) Implementation Checklist for Sprint 33A
- Define token maps in theme layer.
- Implement semantic typography utilities.
- Implement spacing and layout utilities aligned to grid rules.
- Create shared state pattern components (loading/empty/error/success).
- Create adapter examples on at least one representative screen.
- Add PR checklist enforcing this appendix.

## 11) PR Review Gate (Copy/Paste)
- [ ] No hard-coded colors in feature components.
- [ ] Typography uses semantic roles only.
- [ ] Spacing uses tokenized rhythm values.
- [ ] Async surfaces implement loading/empty/error/success patterns.
- [ ] API payloads mapped through adapters before rendering.
- [ ] Keyboard/focus behavior validated for new interactions.
- [ ] Motion is purposeful and respects reduced-motion.
