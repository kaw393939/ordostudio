# Sprint 22: Studio Visual Polish Spec

## 1. Problem Statement
Following the structural refactor in Sprint 21, the Studio page has several visual inconsistencies and design system violations that degrade the user experience.

### P0: Structural Inconsistencies
1. **Redundant Page Header**: `PageShell` renders a "Studio" title and subtitle, but immediately below it is the "The Studio Apprenticeship" hero card. This creates a confusing double header.
2. **Inconsistent Surface Wrapping**: "The Model", "The Journey", "Gate Projects", "Role Readiness", and "The Destination" are all wrapped in `.surface` cards. However, the "Bottega Model" (Maestro, Journeyman, Apprentice, Affiliate) section is NOT wrapped in a surface card, breaking the visual rhythm of the page.

### P1: Affordance & State Issues
3. **Weak Collapsible Affordance**: The `<details>` elements for Journey, Gate Projects, and Role Readiness look exactly like static cards. The only affordance is a tiny `↓` arrow on the far right. It is not obvious they are interactive.
4. **Misleading Badge State**: The "Apprentice" badge is blue (`variant="default"`), while the others are gray (`variant="outline"`). This falsely implies "Apprentice" is a selected or active state.
5. **Sidebar Empty Space**: The "Recommended events" sidebar is sticky but very short. On desktop, this leaves a massive empty column next to the rest of the content.

### P2: Design System Violations
6. **Typography Density**: The "Bottega Model" cards use 4 type roles (`type-label` for number, `type-body-sm` for description, `type-meta` for dt, `type-label` for dd). This violates the "≤3 type roles per card" rule from the Swiss/Bauhaus spec.

## 2. Acceptance Criteria
1. The redundant `PageShell` title/subtitle are removed; the hero card serves as the page header.
2. The "Bottega Model" section is wrapped in a `.surface` card to match the other sections.
3. Collapsible `<details>` elements have a clearer interactive affordance (e.g., a hover state or a more prominent chevron).
4. All level badges use the same variant (`outline` or `secondary`) to avoid implying selection.
5. The layout is adjusted so the sidebar doesn't leave a massive empty column (e.g., move the sidebar to the top or bottom, or make the main content single-column).
6. The "Bottega Model" cards are simplified to use ≤3 type roles.

## 3. Decisions
1. **Hero Header**: We will remove the `title` and `subtitle` props from `PageShell` for this page, allowing the "The Studio Apprenticeship" card to act as the true hero.
2. **Surface Consistency**: We will wrap the `StudioLevels` component in a `.surface` card.
3. **Collapsible Styling**: We will add a hover state to the `<summary>` elements (`hover:bg-surface-muted`) to indicate interactivity.
4. **Badge Variant**: We will change all level badges to `variant="secondary"`.
5. **Layout**: We will remove the right sidebar column entirely. The "Recommended events" will be moved to a horizontal section at the bottom of the page, above the final CTA. This fixes the empty space issue and simplifies the layout to a single column.
6. **Typography**: We will remove the `type-label` from the number circle in the level cards, using `type-meta` instead, reducing the type roles to 3.

---

## 4. Closure Note

**Closed: Feb 24, 2026.** All P0–P2 issues resolved — not via the T1–T5 targeted fixes planned here, but through a full page rebuild in subsequent sessions. The original components (`studio-levels.tsx`, `studio-journey.tsx`, `studio-gate-projects.tsx`, `studio-role-readiness.tsx`) were replaced by `studio-bottega-model.tsx`. PageShell removed, single-column layout established, badges unified, sidebar eliminated. No further work required against this sprint.
