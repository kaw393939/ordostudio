# Sprint 54 — Training Tracks Conversion UX + Consult Booking

## Goal
Turn “Training” into the primary conversion path for CTO/Eng Managers and individuals by making offers concrete: outcomes, deliverables, audience fit, and a low-friction booking/contact flow.

## Scope

### Training tracks surface
- Implement a Training landing page that lists 3 offers:
  - Workshop (1 day)
  - Team Program (4–6 weeks)
  - Advisory/Enablement

Each offer must show:
- Who it’s for
- Deliverables (templates, rubrics, eval gates)
- What success looks like (measurable outcomes)
- Next step CTA

Offer card layout (Swiss / corporate):
- Title (short)
- One-line promise
- “Best for” chips (CTO/Eng Manager / Individuals)
- Deliverables (3 bullets max)
- Outcomes (2 bullets max)
- Primary CTA (consistent verb)

Content rules:
- No marketing adjectives without proof.
- Replace generic copy with artifacts (templates, rubrics, evaluation harness).
- Use scan-friendly sections: “Who”, “What you get”, “What changes”, “Next step”.

### Track detail pages
- Each offer has a detail page:
  - Agenda / modules
  - Prerequisites
  - What participants produce (artifacts)
  - FAQ (objections handling)

### Consult booking
- Add a single “Book a technical consult” flow:
  - Simple form (role, company size, goals, timeline)
  - Confirmation screen and email acknowledgement (if email infra exists)

Form UX standards:
- Labels are persistent.
- Helper text clarifies expected detail (short, specific).
- Errors are adjacent and specific.
- Submit button communicates progress (loading state).
- Confirmation page provides clear next expectation (timeline, contact).

### Krug checklist
- Ensure page titles and nav labels match.
- Ensure CTAs are consistent and unambiguous.

## Acceptance Criteria
- [x] Training landing + 3 detail pages exist and are coherent.
- [x] Consult booking flow exists and is accessible.
- [x] Each offer communicates outcomes + deliverables clearly.
- [x] Training page and detail pages meet scan test:
  - user can identify the best-fit offer in < 30 seconds.
- [x] CTAs are consistent across the site (same verbs, same intent).
- [x] Tests cover core rendering and form validation.
- [x] Lint/tests/build pass.

## Verification
- 5-minute hallway test with 2–3 people: can they pick the right offer?
- Manual keyboard-only completion of consult form.

Design QA:
- 375/768/1440 widths reviewed.
- Dark mode reviewed.
- All offer cards have consistent spacing and alignment.
