# UX Review — Login

- Route: `/login`
- Audience: Returning users
- Overall score: 7.8/10

## What works
- Form is short and focused with clear field labels.
- Inline validation and disabled submit state reduce accidental failures.
- Recovery path to registration is always visible.

## Friction points
- Visual language diverges from stronger design system used elsewhere (plain borders/typography).
- Error state is technically informative but not emotionally reassuring.
- No “forgot password” path from the login form.
- Missing “show password” toggle increases entry errors on mobile.

## Recommendations
### Now
- Add `Forgot password` link directly under password field.
- Improve error copy hierarchy: plain-language headline + optional technical detail.
- Match button/input styling to design-system primitives used in app shells.

### Next
- Add inline caps-lock hint and password visibility toggle.
- Add return-to-intent support (after login, redirect back to prior page).

## Success criteria
- Reduced failed login retries per session.
- Increased completion rate for existing users.
- Lower support volume around credential recovery.
