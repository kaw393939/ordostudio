# UX Review — Event Detail

- Route: `/events/[slug]`
- Audience: Mixed (guest, user, admin)
- Overall score: 8.3/10

## What works
- Strong primary action model (`register`, `waitlist`, `cancel`, `login`) mapped to state.
- Mobile sticky action bar is excellent for thumb reach and conversion continuity.
- Timezone dual-context formatting reduces scheduling errors.
- Registration feedback toast reinforces action completion.

## Friction points
- Page resolves multiple dependencies sequentially (root, collection, detail, nav context, me, registrations), increasing perceived delay.
- “Your registration” status card and “Next action” card can feel duplicated conceptually.
- Confirmation copy (“Updated just now”) is vague versus explicit status result.
- No clear capacity/availability summary above CTA.

## Recommendations
### Now
- Merge action context into one concise “Your status + next step” block.
- Replace generic confirmation text with explicit outcome (“You’re waitlisted for this event”).
- Surface capacity signal early (spots left/waitlist open).
- Add loading copy by stage for long fetch chains.

### Next
- Introduce optimistic status transition with rollback messaging on failure.
- Add event organizer/support contact affordance for edge-case recovery.

## Success criteria
- Higher registration conversion from detail page.
- Lower abandonment between login redirect and action completion.
- Fewer cancel/re-register oscillations caused by unclear state.
