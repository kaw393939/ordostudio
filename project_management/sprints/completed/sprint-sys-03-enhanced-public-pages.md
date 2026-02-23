# Sprint SYS-03 — Enhanced Public Pages (Homepage, Services, Studio, About)

## Goal
Implement the marketing copy from IP-06 across Studio Ordo's public-facing pages — homepage, services, studio, and about — replacing placeholder content with the full IP-backed messaging.

## Prerequisites
- Sprint IP-06 (Marketing) — provides all copy specifications
- Sprint IP-01 (Frameworks) — Human Edge, Spell Book references
- Sprint IP-02 (Maestro Profile) — Keith Williams bio for about page

## Scope

### Homepage Updates
Implement the homepage-content-v2.md specification:
- Updated hero: "We train what AI can't automate." + enhanced proof strip
- New Section 01: The Human Edge — 8 capability grid/wheel with one-line descriptions
- Enhanced Section 02: Method — 40/60 principle integrated
- Enhanced Section 03: Outcomes — salary data, MIT RCT data, "48% reach production" stat
- Enhanced Section 04: Offers — Spell Book terms per offer, Context Pack mention
- Enhanced Section 05: Studio — brief "Alex" narrative, 4 levels
- Enhanced Section 06: Proof — Keith profile, acceleration data, testimonial placeholders

### Services Page Updates
Implement services-page-content.md:
- Each track page shows: Human Edge capabilities, Spell Book terms, specific artifacts
- FAQ sections with objection handling
- "Who this is for" personas
- Salary context integrated

### Studio Page Updates
Implement studio-page-content.md:
- Full "Alex" journey narrative
- 4-level path visualization
- Role readiness map (Level → eligible roles → salary range)
- "CEO of agents" positioning
- Field report examples
- "Not a certificate. A portfolio of shipped work."

### About Page Updates
Implement about-page-content.md:
- Keith Williams full profile (third-person)
- Origin story arc: TRS-80 → NJIT → Studio Ordo
- EverydayAI Newark bridge
- Professional proof points (23 years, 10K students, Fortune companies)

### Insights Page
- Add a "Frameworks" section linking to public descriptions of Human Edge, Context Pack, Spell Book
- This becomes the content hub for lead magnets and thought leadership

## Technical Work
- Update page.tsx files with new content
- New components as needed (capability grid, level path visualization, salary data cards)
- Responsive design for all new sections
- Dark mode verification
- SEO meta tags updated with new messaging
- Structured data (JSON-LD) for courses/events if applicable

## Acceptance Criteria
- [ ] Homepage updated with all 6+ sections from the spec
- [ ] Services pages enhanced with Human Edge + Spell Book content
- [ ] Studio page shows 4-level learning path with journey narrative
- [ ] About page has full maestro profile
- [ ] All pages pass Krug trunk test (identity, purpose, next step visible in 5 seconds)
- [ ] Responsive: 375/768/1440 all reviewed
- [ ] Dark mode verified
- [ ] All existing tests pass
- [ ] Lint/build clean

## Design Requirements
- Maintain Swiss/corporate aesthetic
- Proof strip visible above the fold
- One primary CTA per viewport
- Generous whitespace
- Scan-friendly: headings, bullets, short paragraphs
- No "happy talk"

## End-of-Sprint Verification
```bash
npx vitest run
npx eslint .
npx next build
```

## Exit Gate
A visitor can understand what Studio Ordo offers, who runs it, and how to engage — all in under 60 seconds.
