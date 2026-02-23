# Sprint 53–58 — Studio Ordo Brand + Krug UX + Growth Program

## Status (2026-02-21)
This document is an umbrella program wrapper. The work shipped through the individual sprints below, which are already completed in `project_management/sprints/completed/`:
- Sprint 53 — `sprint-53-studio-ordo-brand-foundation-ia-home.md`
- Sprint 54 — `sprint-54-training-tracks-conversion-consult.md`
- Sprint 55 — `sprint-55-studio-apprenticeship-events-field-notes.md`
- Sprint 56 — `sprint-56-referrals-qr-affiliate-foundation.md`
- Sprint 57 — `sprint-57-agentic-newsletter-intelligence-pipeline.md`
- Sprint 58 — `sprint-58-measurement-experiments-krug-usability-loop.md`

## Goal
Elevate LMS 219 into a **Studio Ordo** branded, Fortune-100-grade marketing + training platform that converts:
- **CTOs / Engineering Managers** seeking reliable AI training outcomes
- **Individuals** seeking capability and apprenticeship

…and does so with **Steven Krug-style usability** (obvious, scannable, low-friction) and measurable conversion signals.

## Principles (Krug + Swiss)
- **Don’t make me think**: every page answers “What is this?”, “What can I do here?”, “Where am I?” in < 5 seconds.
- **Visual hierarchy**: clear page title, clear next action, proof near decisions.
- **Self-evident navigation**: consistent, predictable IA; remove mystery-meat nav.
- **Scan-first writing**: headings, bullets, short paragraphs; remove happy talk.
- **Strong information scent**: links look like links; CTAs describe outcomes.
- **Swiss system**: strict grid, whitespace, disciplined typography and tokens.

## Design System Alignment (non-negotiable)
This program must look and feel like one coherent product.

Source of truth:
- Tokens: `src/app/globals.css`
- UI rules: `docs/design-system.md`
- Icons: `docs/icon-map.md`
- Brand system: `business/studio-ordo/*`

Hard constraints:
- No new colors, fonts, or shadows without updating tokens + design docs.
- Use existing primitives and patterns; do not create one-off styling islands.
- Accessibility is part of aesthetics: focus, spacing, and readable hierarchy.

## “Fortune 100 UI” bar (what “good” means here)

### A) Layout and hierarchy
- Page title + purpose statement visible without scrolling.
- One primary CTA per viewport.
- Proof (numbers/artifacts) appears near every decision point.

### B) Content and copy
- Headlines are declarative and specific.
- Paragraphs are short; lists used for scanning.
- Avoid hype language; prefer artifacts + proof.

### C) Interaction
- Every interactive element looks interactive.
- States are complete: default/hover/focus/disabled/loading/empty/error.

## Design QA checklist (applies to every sprint)
- **5-second test**: user can answer “What is this?”, “What can I do here?”, “Why trust it?”
- **First-click test**: first click goes to the correct next step.
- **Responsive**: mobile/tablet/desktop layouts are intentional (not collapsed desktop).
- **Dark mode**: no illegible text, no low-contrast borders.
- **Motion**: reduced-motion safe; no motion-only meaning.
- **Touch targets**: ≥ 44×44px.
- **Typography**: one H1, no skipped heading levels.
- **Icons**: from canonical map; never used as the only label.

## Program Outcomes
- Studio Ordo identity implemented consistently across public surfaces.
- Homepage becomes a conversion + trust engine for both audiences.
- Services/training tracks become the primary product surface.
- Studio apprenticeship surfaces support the “bottega” model.
- Referral and newsletter foundations planned as opt-in later phases.

## Planned Sprint Sequence
- **Sprint 53** — Brand implementation foundation + IA + homepage system
- **Sprint 54** — Training tracks (services) conversion UX + consult booking
- **Sprint 55** — Studio Ordo apprenticeship UX + events field reporting
- **Sprint 56** — Referral/affiliate tracking foundation (QR + cards) + admin reporting
- **Sprint 57** — Agentic newsletter + intelligence pipeline (editorial workflow)
- **Sprint 58** — Measurement, experiments, and usability test loop (Krug)

## Cross-sprint invariants
- Use existing tokens/components (`src/app/globals.css`, `docs/design-system.md`).
- Accessibility and action safety remain non-negotiable (skip-nav, dialogs, undo pattern).
- Every major UX change includes:
  - A short usability checklist
  - At least one focused unit/integration test
  - A manual “trunk test” pass

## Documentation deliverables
- Update `business/studio-ordo/web-homepage-system.md` when homepage modules change.
- Keep “voice” consistent (see `business/studio-ordo/voice-tone.md`).
- Keep claim/proof policy intact (see `business/studio-ordo/brand-guide.md`).

## Exit Gate (Program)
- New brand surfaces are coherent and consistent.
- Usability issues are reduced (5-user tests identify no “blockers” on top flows).
- Lint/tests/build pass.
