# Sprint 53 — Studio Ordo Brand Foundation + IA + Homepage System (Krug)

## Goal
Implement Studio Ordo as the primary brand identity across public surfaces and rebuild the homepage as a **Swiss / corporate** conversion hub that passes a Steven Krug “trunk test”.

## Scope

### Brand identity integration
- Replace public-facing brand name and header identity with **Studio Ordo**.
- Add consistent tagline usage: “Bring order to AI in software delivery.”
- Ensure footer includes:
  - Studio Ordo identity
  - Terms/Privacy
  - Primary contact path

### Information architecture (IA)
- Define and implement a public nav that matches buyer intent:
  - Home
  - Training (services/tracks)
  - Studio (apprenticeship)
  - Insights (newsletter/blog)
  - About
  - Contact / Book consult

### Homepage (system)
Homepage modules (Swiss + Krug):
- Hero: promise + proof + 2 CTAs (Teams / Individuals)
- 01 Method (Ordo): Spec → Tests → Build → Evaluate/Audit
- 02 Outcomes (leaders / individuals)
- 03 Offers (workshop / team program / advisory)
- 04 Studio (bottega)
- 05 Proof: 20+ years, 10,000+ students + artifact previews (templates)

### Visual system requirements (Fortune 100 bar)
- **Grid**: strict alignment; consistent left edge for headlines and body.
- **Hierarchy**: one `h1`; sections use `h2`; CTAs are visually distinct.
- **Whitespace**: generous spacing between modules; avoid dense “wall of text”.
- **Proof strip**: numeric proof appears above the fold and near offers.
- **Artifact previews**: show at least one real deliverable preview (template/rubric), not decorative imagery.

### Copy system requirements
- Hero headline is a *promise*, not a slogan: “Bring order to AI in software delivery.”
- Subhead clarifies audience and method (specs/tests/evals).
- CTAs are action verbs (no “Learn more” as primary).
- Remove “happy talk”; every sentence supports understanding or decision.

### Krug usability pass
- Apply trunk test to top public pages:
  - Can a user tell what the page is, what it offers, and the next step?
- Reduce “happy talk” and long paragraphs; enforce scanability.
- Ensure:
  - All CTAs are specific verbs.
  - Links look like links.
  - Page titles match nav labels.

Trunk test checklist (run on Home/Training/Contact):
- Clear identity: “Studio Ordo” visible immediately.
- Clear purpose: “AI training for engineers/teams” visible immediately.
- Clear next step: one primary CTA stands out.
- Proof present: “20+ years / 10,000+ students” visible without searching.
- Navigation: can tell what’s clickable and where it goes.

## Acceptance Criteria
- [x] Public header/footer reflect Studio Ordo identity.
- [x] Homepage implements the module system and is fully scannable.
- [x] No new colors/fonts/shadows introduced; tokens only.
- [x] Lint/tests/build pass.

## Notes
- Manual trunk test is intended to be run during release validation.
