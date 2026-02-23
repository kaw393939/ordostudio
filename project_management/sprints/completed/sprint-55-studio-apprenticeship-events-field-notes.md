# Sprint 55 — Studio Ordo Apprenticeship UX + Events Field Notes

## Goal
Make the “Studio” experience real: apprentices learn by shipping. Use the existing events capability to support field work and portfolio artifact generation.

## Scope

### Studio public page
- Explain the bottega model:
  - Learn by doing
  - Critique and standards
  - Field work (NYC AI meetups)

### Apprenticeship workflow (MVP)
- A member can:
  - See recommended events
  - Register / attend
  - Submit a structured field report after attending

UX flow must be obvious:
- “Recommended events” → “Attend” → “Submit report” is a straight-line path.
- After submission, user sees confirmation + what happens next (review, featured, newsletter).

Field report format (structured):
- Event
- Key insights
- Models / Money / People
- What I tried
- What I’d advise a client

Field report form standards:
- Use section headers and progressive disclosure (details/summary) only if needed.
- Prefer 5–7 required fields max; keep the rest optional.
- Provide small examples under each field (mentor tone).
- Prevent “blank submission” with clear validation.
- Autosave draft if feasible (optional; if not, keep form short).

### Admin review
- Admin can:
  - Review submissions
  - Mark as “featured”
  - Export

Admin review UI standards:
- List shows: event, submitter, date, 1-line summary.
- Detail view shows structured sections and any flags.
- Export is one click with clear format.

### Krug usability
- Field report flow must be obvious and fast.

## Acceptance Criteria
- [x] Studio page exists and matches brand voice.
- [x] Field report submission exists with validation.
- [x] Admin review list exists.
- [x] Tests cover the field report create + list.
- [x] The flow passes a Krug “first click” test (3/3 users click the right next step).
- [x] Layout and typography are consistent with Training/Home pages.
- [x] Lint/tests/build pass.

## Verification
- Manual: submit a report on mobile and desktop.
- Manual: admin marks featured and exports.
