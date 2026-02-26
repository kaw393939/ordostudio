# Sprint 24: Bottega Model Public Content Update - Sprint Plan

## 1. Overview
This sprint focuses on updating the public-facing website (About and Studio pages) to reflect the "Modern Software Bottega" model. This includes introducing John as the Journeyman/Partner, clarifying Keith's role as the Maestro, and defining the four roles of the Bottega model (Maestro, Journeyman, Apprentice, Affiliate).

## 2. Epics & Tasks

### Epic 1: About Page Updates (`src/app/(public)/about/page.tsx`)
- **Task 1.1**: Update Keith Williams' bio to reflect the "Maestro" role.
- **Task 1.2**: Add John's bio as the "Journeyman" and operational bridge.
- **Task 1.3**: Frame the company explicitly as a "Modern Software Bottega."

### Epic 2: Studio Page Updates (`src/app/(public)/studio/page.tsx`)
- **Task 2.1**: Replace the "Four Levels" with the Bottega Hierarchy: Maestro, Journeyman, Apprentice, Affiliate.
- **Task 2.2**: Define the Affiliate role and the high-commission structure (15-20%).
- **Task 2.3**: Define the Apprentice role as an independent contractor.
- **Task 2.4**: Explicitly state the "zero obligation" policy.

## 3. Timeline
- **Day 1**: Update the About page with Keith and John's bios and the Bottega framing.
- **Day 2**: Update the Studio page with the Bottega Hierarchy and commission structure.
- **Day 3**: Review and refine the content to ensure consistency with the Swiss/Bauhaus design system.
- **Day 4**: Final QA and deployment.

## 4. Dependencies
- The `business/studio-ordo/handbook.md` and `business/studio-ordo/governance.md` documents have been updated to reflect the Bottega model.
- The `project_management/sprints/active/sprint-22-studio-visual-polish/01-spec.md` has been updated to reflect the Bottega model instead of just "Four levels".

## 5. Risks & Mitigations
- **Risk**: The new content may not fit well within the existing layout.
- **Mitigation**: Ensure all new content adheres to the Swiss/Bauhaus design system and typography rules. Use `.surface` and `.surface-elevated` cards to structure the content logically.
