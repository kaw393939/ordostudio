# Sprint SYS-06 — Framework Pages + Spell Book + Context Pack Interactive Tools

## Goal
Build public-facing pages for the Studio Ordo intellectual frameworks — Human Edge, Spell Book, Context Pack, AI Audit Log, and 40/60 Method — turning proprietary IP into discoverability and SEO assets.

## Prerequisites
- Sprint IP-01 (Frameworks) — all framework documents exist in business folder
- Sprint SYS-03 (Enhanced Public Pages) — base pages updated

## Scope

### Framework Hub (`/frameworks` or `/method`)
Landing page listing all 5 frameworks with:
- One-paragraph description each
- Visual icon or illustration per framework
- Link to individual framework page
- CTA: "These frameworks power every Studio Ordo engagement"

### Human Edge Page (`/frameworks/human-edge`)
- The 8 capabilities in a visual grid/wheel
- Each capability: name, definition, "why AI can't do this", which workshop develops it
- Interactive: click a capability to see detail + recommended workshop/offer
- Self-assessment CTA: "Take the Human Edge Scorecard →" (links to lead magnet)
- SEO: target "human capabilities AI cannot replace", "AI-proof skills"

### Spell Book Page (`/frameworks/spell-book`)
- Searchable/filterable glossary of 40 professional terms
- Organized by theme: Architecture, Reliability, Data, AI Systems, Business
- Each term: name, one-sentence definition, category, which workshop introduces it
- Interactive: hover/click for full definition + historical context
- Download CTA: "Get the full Spell Book PDF →" (lead magnet gate)
- SEO: target "AI engineering vocabulary", "technical leadership terms"

### Context Pack Page (`/frameworks/context-pack`)
- The 4-component model explained with visual diagram
- Beginner / Intermediate / Advanced progression
- Example of a completed Context Pack (real engineering problem)
- Template download CTA (lead magnet gate)
- "The meta-skill of the AI era" positioning
- SEO: target "AI project planning template", "context engineering"

### AI Audit Log Page (`/frameworks/ai-audit-log`)
- What it is, why it matters (accountability, quality, compliance, learning)
- Template preview
- Team adoption guide summary
- Example entries
- Download CTA
- SEO: target "AI accountability", "AI usage tracking"

### 40/60 Method Page (`/frameworks/forty-sixty`)
- The ratio explained with visual
- Why 40% hard-way: builds judgment
- Why 60% agentic: builds velocity
- Practical example: team session breakdown
- "How to adjust the ratio for your team's maturity"
- CTA: "Book an Advisory engagement to calibrate your team's ratio"
- SEO: target "AI coding ratio", "when to hand-code vs use AI"

## Technical Work
- New routes: `/frameworks`, `/frameworks/human-edge`, `/frameworks/spell-book`, `/frameworks/context-pack`, `/frameworks/ai-audit-log`, `/frameworks/forty-sixty`
- Spell Book glossary component (filterable, searchable)
- Human Edge capability grid component (interactive)
- Context Pack visual diagram component
- SEO meta tags and OpenGraph for each page
- JSON-LD structured data for educational content
- Link framework pages from homepage, services, studio, and event detail pages

## Acceptance Criteria
- [ ] Framework hub page exists with links to all 5 frameworks
- [ ] Each framework has its own page with complete content
- [ ] Spell Book is searchable and filterable
- [ ] Human Edge grid is interactive
- [ ] Lead magnet CTAs connect to email capture
- [ ] SEO meta tags on all framework pages
- [ ] Cross-linked from relevant existing pages
- [ ] Responsive and dark mode verified
- [ ] All existing tests pass
- [ ] Lint/build clean

## Design Requirements
- Swiss/corporate aesthetic maintained
- Framework pages are content-rich but scannable
- Each page has one primary CTA
- Visual diagrams use existing design system tokens
- No decorative images — diagrams and structured content only

## End-of-Sprint Verification
```bash
npx vitest run
npx eslint .
npx next build
```

## Exit Gate
Every framework has a public, linkable, SEO-optimized page that showcases Studio Ordo's intellectual property.
