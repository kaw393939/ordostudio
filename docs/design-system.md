# LMS 219 Design System (Living Doc)

This document is the single source of truth for UI decisions in LMS 219.

## Tokens

### Color tokens

Defined in `src/app/globals.css` as CSS variables and re-exposed as Tailwind tokens.

**Light** (`:root`)
- Canvas: `--bg-canvas` (`#f6f6f4`)
- Surface: `--bg-surface` (`#ffffff`)
- Elevated: `--bg-elevated` (`#ffffff`)
- Text primary: `--text-primary` (`#111111`)
- Text secondary: `--text-secondary` (`#333333`)
- Text muted: `--text-muted` (`#616161`)
- Text inverse: `--text-inverse` (`#f8f8f8`)
- Border subtle/default/strong: `--border-subtle` (`#dddddd`), `--border-default` (`#c8c8c8`), `--border-strong` (`#9f9f9f`)
- Action primary/hover: `--action-primary` (`#1059ff`), `--action-primary-hover` (`#0d47cc`)
- Action secondary/hover: `--action-secondary` (`#f0f0f0`), `--action-secondary-hover` (`#e6e6e6`)
- State success/warning/danger/info: `--state-success` (`#0f7a3f`), `--state-warning` (`#9c6a00`), `--state-danger` (`#b42318`), `--state-info` (`#0b61d8`)
- Focus ring: `--focus-ring` (`#1d4ed8`)

**Dark** (`@media (prefers-color-scheme: dark)`)
- Canvas: `--bg-canvas` (`#111111`)
- Surface: `--bg-surface` (`#181818`)
- Elevated: `--bg-elevated` (`#202020`)
- Text primary: `--text-primary` (`#f1f1f1`)
- Text secondary: `--text-secondary` (`#d6d6d6`)
- Text muted: `--text-muted` (`#a7a7a7`)

Use semantic Tailwind tokens in UI (`bg-surface`, `text-text-primary`, `border-border-subtle`, etc). Do not hard-code new hex colors.

### Typography scale

Use the utility classes defined in CSS (examples):
- Display/headings: `type-display`, `type-h1`, `type-h2`, `type-h3`
- Titles/body: `type-title`, `type-body`, `type-body-sm`
- Labels/meta: `type-label`, `type-meta`

Rules:
- Prefer `type-label` for form labels and button text.
- Prefer `type-body` for paragraphs; use `type-body-sm` for helper text.

### Spacing scale

Prefer the spacing variables/tokens from `globals.css`:
- `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px)
- `--space-6` (24px), `--space-8` (32px), `--space-10` (40px), `--space-12` (48px), `--space-16` (64px)

In Tailwind usage, keep layout consistent with existing patterns (`container-grid`, `gap-3`, `py-6`, etc.).

## Icons

Canonical Lucide icon usage is defined in [docs/icon-map.md](docs/icon-map.md).

## Components

### Inventory (core)

Use the existing shadcn/Radix-based primitives under `src/components/ui/*` and the composed UI in `src/components/*`.

When adding UI:
- Reuse existing primitives before creating new ones.
- Prefer variant-driven styling (CVA) instead of ad-hoc class strings.

### Variant matrix (examples)

Document and test at least these variants when introducing a new component:
- Default / disabled
- Destructive (if applicable)
- Loading state (if applicable)
- Empty state (if applicable)

## Forms

### Field patterns

Rules:
- Always render a visible label.
- Placeholders are optional; they are not a substitute for labels.
- Validation messages must be adjacent to the field and programmatically associated.

React Hook Form is the default. Keep:
- Inline errors short and specific.
- Submit errors rendered via `ProblemDetails` (when available).

## Date/time

### Canonical display modes

Prefer the helpers in `src/lib/calendar-date-ui.ts` for consistent formatting.

Use one of these three canonical modes:
1. **Date only** (lists/tables): e.g. `Jan 15, 2026`
2. **Date + time range** (event detail/cards): e.g. `Jan 15, 2026 · 9:00 AM – 12:00 PM`
3. **Month context** (calendar navigation): e.g. `January 2026`

Avoid raw, one-off formatting scattered across components.

## Motion

Rules:
- Use the existing motion utilities (`motion-base`) and timing tokens (`--motion-fast/base/slow`).
- Respect reduced motion. Motion must never be required to understand state.

## Loading / Empty / Error

Use the trinity pattern:
- **Loading**: skeleton/spinner and stable layout.
- **Empty**: explain what’s missing and provide the next action.
- **Error**: show a user-facing message and (when possible) a structured `ProblemDetails` payload.

## Accessibility checklist

Before shipping a new component:
- Keyboard navigation works end-to-end.
- Focus is visible (uses `--focus-ring`).
- Labels are associated with inputs.
- Icon-only buttons have an accessible name.
- Color is not the only signal for status.
