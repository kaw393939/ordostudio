# Studio Ordo — Style Guide (Mapped to LMS 219 Implementation)

This style guide documents the **visual identity rules** for Studio Ordo and maps them to the existing design tokens and components already implemented in this repo.

If a rule here conflicts with implementation, implementation wins and this doc should be updated.

## 1) Design principles

- **International Typographic Style (Swiss)**: grid, hierarchy, whitespace, alignment.
- **Corporate clarity**: high signal, low ornament.
- **Accessible by default**: focus visible, touch targets ≥ 44px, reduced motion respected.

## 2) Color system (do not invent new colors)

Source of truth: `src/app/globals.css` and `docs/design-system.md`.

### Semantic usage
- Backgrounds: `--bg-canvas`, `--bg-surface`, `--bg-elevated`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
- Borders: `--border-subtle`, `--border-default`, `--border-strong`
- Primary action: `--action-primary` (+ hover)
- States: `--state-success`, `--state-warning`, `--state-danger`, `--state-info`
- Focus: `--focus-ring`

Rules:
- Prefer semantic Tailwind tokens (`bg-surface`, `text-text-primary`, `border-border`, etc).
- Never hard-code new hex values in components.

## 3) Typography

Source of truth: typography utility classes (`type-*`).

Hierarchy rules:
- One `h1` per page.
- Use `type-h2` for page titles, `type-title` for section headers.
- Use `type-body` for paragraphs; `type-meta` for proof lines, captions.

## 4) Layout & grid

- Use existing layout patterns: `container-grid`, `max-w-*`, consistent spacing.
- Prefer left alignment.
- Use numbered sections for long-form pages (01/02/03) to reinforce structure.

## 5) Components

Source of truth:
- `src/components/ui/*` (shadcn/Radix primitives)
- `src/components/*` (composed patterns)

Rules:
- Reuse before creating.
- Use variants for styling, not ad-hoc classes.
- All destructive actions must be undoable or clearly confirmed.

## 6) Icons

Source of truth: `docs/icon-map.md`.

Rules:
- Use Lucide.
- Icons support text; they do not replace it.

## 7) Motion

- Use motion tokens: `--motion-fast/base/slow`.
- Reduced motion is globally respected (`prefers-reduced-motion: reduce`).
- Motion must never carry meaning alone.

## 8) Accessibility

- Focus ring must be visible (`--focus-ring`).
- All buttons and interactive icons must meet 44×44px.
- Do not rely on color alone for status.

## 9) Web brand “look”

Studio Ordo pages should feel like:
- A technical report meets a workshop syllabus.
- Clear headings, proof strips, checklists, artifacts.

Anti-patterns:
- Busy hero graphics.
- Marketing gradients.
- Unverifiable claims.
