# Sprint 21 — Studio Page & Recommended Events Polish

Sprint: 21  
Focus: `/studio` page redesign + `RecommendedEvents` sidebar refactor  
Date: 2026-02-24  
Status: **Active**

---

## Scope

The Studio page (`/studio`, 369 lines) and the Recommended Events sidebar (`recommended-events.tsx`, 155 lines) have accumulated UX debt. This sprint applies the same aggressive UI redesign pattern used in Sprint 20 (Events).

---

## Screenshot Problems Observed

### P0 — Critical (blocks conversion)

| # | Problem | Location | Evidence |
|---|---------|----------|----------|
| 1 | **Hero banner consumes ~70% of viewport** — no value prop, no CTA visible above fold on desktop or mobile | `page.tsx` lines 68–79 | Screenshot 1: user sees only "Studio" title + giant notebook image; must scroll to see any content |
| 2 | **Recommended Events sidebar bypasses HATEOAS** — hits `/api/v1/events` directly instead of `getRoot()` → follow link; violates HAL contract used everywhere else | `recommended-events.tsx` line 53 | Hardcoded URL coupling will break when API versioning changes |
| 3 | **Stale/test event dates visible** — sidebar shows Aug 12, Aug 14, Sep 15 dates (7+ months old or from seed data) for a page viewed Feb 2026 | Screenshot 2 sidebar | User sees obviously wrong dates, destroys credibility |

### P1 — High (degrades user experience)

| # | Problem | Location | Evidence |
|---|---------|----------|----------|
| 4 | **"Recommended" badge on every card is redundant** — the section header already says "Recommended events" | `recommended-events.tsx` line 131 | Screenshot 2: three cards, all say "Recommended" badge — zero information gain |
| 5 | **"Attend" link is misleading** — navigates to event detail page, not sign-up/registration | `recommended-events.tsx` line 137 | Users expect "Attend" to start registration |
| 6 | **"Submit report" link on every sidebar event is premature** — only APPRENTICE-role users need this; for anonymous visitors it's noise | `recommended-events.tsx` line 140 | Screenshot 2: Submit report appears 3 times |
| 7 | **Alex's Journey section is a wall of text** — 7 timeline entries × 3–5 lines each with no visual anchors | `page.tsx` lines 135–189 | No progressive disclosure; overwhelms skimmers |
| 8 | **Studio page is a 369-line monolith** — hardcoded arrays (`gateProjects`, `roleReadiness`), inline sections, impossible to test in isolation | `page.tsx` entirety | Violates DRY rules and component extraction patterns from design system spec |

### P2 — Medium (polish)

| # | Problem | Location | Evidence |
|---|---------|----------|----------|
| 9 | **Two redundant CTA blocks** — top "Executive Summary" and bottom "Page CTA" both push "Book a Technical Consult" | `page.tsx` lines 82–109, 348–366 | Creates decision paralysis; bottom CTA is fine, top block should be leaner |
| 10 | **Salary info on level cards may deter** — showing "$60K–$80K" for Level 1 on a marketing page sets anchoring expectations that may hurt conversion | `page.tsx` level cards | Salary data belongs in a deeper layer (gate projects table) |
| 11 | **Sidebar event cards show delivery mode + location on every card** — 3 all say "Online"; redundant when all events are same mode | `recommended-events.tsx` line 134 | Low-value info consuming card real estate |

---

## Acceptance Criteria

1. **AC-01**: Studio page loads with value proposition visible above fold on 1440px, 768px, and 375px viewports — no full-bleed banner image.
2. **AC-02**: `RecommendedEvents` component fetches events via `getRoot()` → follow `events` link (HATEOAS compliant).
3. **AC-03**: Sidebar event cards show max 3 upcoming published events with correct future dates (relative to `now`).
4. **AC-04**: No "Recommended" badge on individual sidebar event cards (section header is sufficient).
5. **AC-05**: Sidebar event card primary action is "View details" (navigates to event detail), not "Attend".
6. **AC-06**: "Submit report" link only visible when user has APPRENTICE role (or removed from sidebar entirely).
7. **AC-07**: Alex's Journey section uses progressive disclosure (collapsed by default, expandable).
8. **AC-08**: Studio `page.tsx` ≤ 200 lines via component extraction.
9. **AC-09**: All existing tests pass; ≥ 5 new tests for extracted/refactored components.
10. **AC-10**: `npm run build` succeeds with zero errors.

---

## Key Decisions

| # | Decision | Recommended | Status |
|---|----------|-------------|--------|
| D1 | Remove full-bleed hero banner; replace with compact intro section | Replace with text-first intro + small aside image | **Approved** |
| D2 | Sidebar event card: remove "Submit report" link entirely (keep in nav for apprentices) | Remove from sidebar | **Approved** |
| D3 | RecommendedEvents: refactor to use HATEOAS (getRoot → follow link) | Yes — consistency with all other API consumers | **Approved** |
| D4 | Alex's Journey: collapse into `<details>` like Gate Projects section | Yes — matches existing pattern | **Approved** |
| D5 | Remove salary ranges from level cards on public page | Move to Gate Projects collapsible section only | **Approved** |
