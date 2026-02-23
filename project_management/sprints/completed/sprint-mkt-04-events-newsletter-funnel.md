# Sprint MKT-04 — Events + Newsletter: Funnel Coherence

## Objective
Make `/events` and `/newsletter` feel like part of the same system: field work → structured reporting → newsletter insights → next actions.

## Problems Addressed (from audit)
- Events page opens with product UI complexity (filters/views) before explaining “why.”
- Newsletter page lacks preview of what you’ll receive.

## In Scope
- `/events`: Add a concise “why events matter” framing and a default recommended path.
- `/newsletter`: Add a lightweight sample issue structure and one excerpt paragraph.
- Tie both pages to Studio reporting where relevant (e.g., `Submit report` / `Studio report`) without adding new workflows.

## Out of Scope
- Publishing newsletter issues on-site.
- New event registration funnel UX.

## Acceptance Criteria
- First-time visitor can understand the role of events/newsletter within 10 seconds.
- Newsletter page shows a sample outline + excerpt before the email capture.

## Files (expected)
- `src/app/(public)/events/page-client.tsx`
- `src/app/(public)/newsletter/page.tsx`
- `src/lib/navigation/menu-registry.ts` (only if menu label tweaks are needed)

## QA
- `npm test`
- `npm run build`
