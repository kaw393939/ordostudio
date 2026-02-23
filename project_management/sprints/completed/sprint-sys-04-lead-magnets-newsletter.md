# Sprint SYS-04 — Lead Magnets + Email Capture + Newsletter Pipeline

## Goal
Implement the 3 lead magnets from IP-06, connect them to the email capture pipeline, and pre-load the newsletter system with the first 4 issues from IP-05.

## Prerequisites
- Sprint IP-05 (Newsletter Content) — 12 issues pre-written
- Sprint IP-06 (Lead Magnets) — 3 lead magnets specified
- Sprint IP-01 (Frameworks) — Spell Book, Context Pack, Human Edge content

## Scope

### Lead Magnet Implementation

**1. "The Spell Book — 40 Terms Every AI Engineer Should Know"**
- Generate as downloadable PDF (or Markdown → PDF pipeline)
- Content from `business/studio-ordo/ip/spell-book-professional.md`
- Gate: email capture form on `/resources/spell-book` or modal on workshop pages
- After capture: deliver PDF + add to newsletter subscriber list
- Track download as measurement event

**2. "Context Pack Template Kit"**
- 4 templates (Project Brief, Domain Context, Evaluation Criteria, Prior Context)
- 3 difficulty levels (Beginner, Intermediate, Advanced)
- Downloadable as PDF or editable templates
- Gate: email capture on `/resources/context-pack`
- After capture: deliver kit + add to newsletter subscriber list

**3. "AI Readiness Assessment — Human Edge Scorecard"**
- Interactive assessment (8 questions, one per capability)
- Self-scoring rubric (Exemplary/Proficient/Developing/Beginning)
- Results page with personalized offer recommendations
- Gate: email capture to see detailed results
- After: send results summary email + add to newsletter subscriber list

### Resources Section
- New `/resources` page listing all 3 lead magnets
- Clean cards with title, description, "Get it free" CTA
- Each resource page: description + email gate + delivery

### Email Capture Flow
- Reuse existing newsletter subscriber system
- Add `source` tag to subscriber record (which lead magnet they downloaded)
- Confirmation email with download link
- Double opt-in if required by newsletter policy

### Newsletter Pre-Load
- Insert the first 4 newsletter issues (from IP-05) into the `newsletter_issues` table
- Each issue has 5 blocks (Models, Money, People, From the Field, Next Steps)
- Status: DRAFT (ready for review before sending)
- Issues 1–4: "The Acceleration Is Real", "The Salary Premium Is Now", "What AI Strips Away", "The CEO of Agents"

### Measurement
- Track: lead magnet downloads, email captures, newsletter subscribes
- Use existing `measurement_events` table
- Event types: `lead_magnet_download`, `email_capture`, `newsletter_subscribe`

## Technical Work
- New page routes: `/resources`, `/resources/spell-book`, `/resources/context-pack`, `/resources/assessment`
- Email capture form component (reusable)
- PDF generation or static PDF hosting
- Interactive assessment component (for Human Edge Scorecard)
- Newsletter issue seeding (CLI command or migration)
- Measurement event instrumentation
- Subscriber source tagging

## Acceptance Criteria
- [ ] 3 lead magnets accessible with email gate
- [ ] `/resources` page lists all offerings
- [ ] Email capture adds subscriber with source tag
- [ ] PDF/template delivery works after capture
- [ ] Human Edge Scorecard is interactive with results
- [ ] 4 newsletter issues pre-loaded as drafts
- [ ] Measurement events tracked
- [ ] All existing tests pass + new tests for capture flow
- [ ] Lint/build clean

## End-of-Sprint Verification
```bash
npx vitest run
npx eslint .
npx next build
```

## Exit Gate
A visitor can download a lead magnet, get added to the newsletter, and the first 4 issues are ready to send.
