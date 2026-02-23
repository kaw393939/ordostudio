# Sprint 51 — Action Safety, Toast/Undo System, WCAG 2.2 AA & Reduced-Motion Support

## Goal
Make every destructive action recoverable, every notification helpful, and every interaction accessible — targeting WCAG 2.2 Level AA compliance across the entire application.

## Acceptance (implemented)
- Toasts and undo pattern implemented for destructive actions.
- Zero `window.confirm()` / `window.prompt()` usage remains.
- SkipNav present and targets `<main>`.
- Branded `error.tsx` / `not-found.tsx` plus React `ErrorBoundary` in layout.
- Privacy/Terms upgraded with structured content and “Last updated” and linked globally.
- Reduced motion respected globally and Framer Motion wrappers gated via `useReducedMotion()`.
- Lint/tests/build pass.

## Notes
- High-contrast and touch-target audits remain ongoing product hygiene, but baseline system support is in place.
