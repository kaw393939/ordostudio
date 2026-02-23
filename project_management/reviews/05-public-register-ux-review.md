# UX Review — Register

- Route: `/register`
- Audience: First-time account creators
- Overall score: 7.9/10

## What works
- Core fields are complete and validation-backed.
- Terms/Privacy consent is explicit and legally visible.
- Existing-account escape hatch (`Login`) is clear.

## Friction points
- Password requirements are implicit; users discover constraints only after failure.
- Terms checkbox sentence is long and cognitively dense.
- No progress reassurance after successful registration (redirect feels abrupt).
- No anti-error guidance for email typos.

## Recommendations
### Now
- Add visible password requirements beneath the password field.
- Break consent text into clearer phrase + legal links.
- Add a brief success interstitial (“Account created, now sign in”).

### Next
- Suggest common email domain corrections when typo patterns are detected.
- Add lightweight trust cue (“We’ll never share your email”).

## Success criteria
- Reduced validation failure loops on registration.
- Higher register→login completion rate.
- Lower drop-off on terms acceptance step.
