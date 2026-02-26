# Sprint 24 T4 — HomeHero Audit Findings

**File:** `src/components/experiments/home-hero.tsx`
**Sprint 24 task scope:** Read-only audit. No changes made this sprint.
**For:** Sprint 28 (Homepage Rewrite)

---

## Current HomeHero Structure

`HomeHero` is a `"use client"` component that reads two feature flags to determine which copy and CTA layout to show.

### Feature Flags
- `EXP_HOME_HERO_COPY_V2` → controls `headline` and `subhead` copy
- `EXP_HOME_PRIMARY_CTA_CONSULT` → controls CTA button order (primary/secondary)

### Headline (feature-flagged)
- **copyV2 = true:** `"AI is commoditizing syntax. We train the judgment that remains."`
- **copyV2 = false (current default):** `"Stop writing code. Start directing the machine."`

### Subhead (feature-flagged)
- **copyV2 = true:** `"A 90-day high-intensity transformation for working engineers. Learn to govern the AI that writes the code through a 40/60 split of manual understanding and agentic execution."`
- **copyV2 = false:** `"The 12-week Tech / Liberal Arts Crash Course. We train Product Engineers to be the CEO of agents."`

### Static paragraph (not feature-flagged)
```
"The Double Stripping is here. A human being is for having stakes."
```
**Note:** This phrase will appear on the homepage regardless of feature flags until Sprint 28 removes it.

### Two CTAs
1. **Training CTA** → `href="/studio"`, label `"The 90-Day Transformation"`, data-measure-key `CTA_CLICK_VIEW_TRAINING_TRACKS`
2. **Consult CTA** → `href="/services/request"`, label `"Hire an Associate"`, data-measure-key `CTA_CLICK_BOOK_TECHNICAL_CONSULT`
3. **Text link** → `href="/about"`, label `"Read the Manifesto"`

### Rendering
Button order is controlled by `consultPrimary` flag:
- `consultPrimary = true` → Consult CTA first (primary), Training CTA second (secondary)
- `consultPrimary = false` (default) → Training CTA first (primary), Consult CTA second (secondary)

---

## Sprint 28 Instructions

When implementing Sprint 28, this component needs:
1. Remove feature flag logic entirely — no conditional copy
2. New H1: `"Bring order to AI in software delivery."`
3. New subhead: two sentences (see `01-homepage.md`)
4. Replace both CTAs + text link with two equal-weight tile links:
   - `"Commission a project →"` → `/studio`
   - `"Enroll in Maestro →"` → `/maestro`
5. Remove the static `<p>` with `"The Double Stripping is here."` text
6. Add proof point: `"23 years teaching engineers · 10,000+ students"`
7. Component likely stays `"use client"` for the feature flag provider, or can be converted to a server component once flags are removed

**Note on `data-measure-key` attributes:** Current CTAs use `data-measure-key` for analytics. Sprint 28 should either carry those attributes forward or confirm with product that they are no longer needed.
