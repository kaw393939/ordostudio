# Sprint MKT-01 — Public Pages: Clarity + CTA Ladder

## Objective
Make the main public pages feel like a designed funnel: one clear audience promise, one clear primary action, and reduced cognitive load above-the-fold.

## Problems Addressed (from audit)
- Audience blur (teams vs individuals vs leaders vs apprentices) on the same page.
- Too many equal-weight sections; weak visual priority.
- CTA inconsistency (multiple competing next steps).

## In Scope
- Tighten CTA hierarchy on:
  - `/services`
  - `/events`
  - `/newsletter`
  - `/apprentices`
  - `/about`
- Add a single, explicit “Start here” hint on `/events` before filters.
- Ensure each page has:
  - Exactly **one** primary CTA (button styling).
  - At most **one** secondary CTA (outline / secondary button or a single emphasized link).
  - Any other links are de-emphasized (plain underline).

## Out of Scope
- New routes/pages.
- New UI patterns (tabs, multi-step funnels, modals).
- New backend endpoints.

## Acceptance Criteria
- Each page above has a clear primary CTA visible without scrolling on desktop.
- `/services` includes an explicit consult CTA in-page (not just in nav).
- `/newsletter` includes a short “what you’ll get” explanation before the email field.
- `/events` presents “Upcoming” as the default recommended path for first-time visitors.

## Files (expected)
- `src/app/(public)/services/page.tsx`
- `src/app/(public)/events/page-client.tsx`
- `src/app/(public)/newsletter/page.tsx`
- `src/app/(public)/apprentices/page.tsx`
- `src/app/(public)/about/page.tsx`

## QA
- `npm test`
- `npm run build`
