# UX Review — Events List

- Route: `/events`
- Audience: Unauthenticated and signed-in discovery users
- Overall score: 8.1/10

## What works
- Good control set: search, status filter, sort, and view mode toggles.
- URL-state sync supports shareable state and browser back/forward reliability.
- List/month/agenda views serve different scanning behaviors.
- Skeleton loading and problem-detail surfaces improve perceived resilience.

## Friction points
- Dense control row can feel crowded, especially before first results load.
- Pagination logic tied to fixed page size may feel opaque to users (“why did Next disable?”).
- Month view event chips have weak affordance for keyboard users and low discoverability for “preview panel” behavior.
- Status language (“All statuses”, “Cancelled”) may not match user mental model of “available to register.”

## Recommendations
### Now
- Add inline helper copy under controls: “Use status + sort to narrow results.”
- Replace generic `View` link text with context-rich label (`View details`).
- Improve empty state messaging with actionable next step (“Clear filters” button).
- Add visible result count near list title.

### Next
- Introduce saved filter presets for frequent users.
- Add sticky filter header on long result pages.
- Add explicit keyboard focus styles for calendar day event buttons.

## Success criteria
- Faster time-to-first-click on an event detail.
- Reduced filter-reset churn (fewer rapid toggles).
- Improved conversion from list to detail and detail to registration.
