# UX Review — Admin Event Detail

- Route: `/admin/events/[slug]`
- Audience: Admin operators editing one event
- Overall score: 8.1/10

## What works
- Clear task grouping: edit fields, lifecycle actions, related tools.
- Breadcrumbs provide good spatial orientation.
- Lifecycle actions are contextual and state-aware.

## Friction points
- Duplicate fetch/load logic increases risk of inconsistent UI timing.
- Uses raw ISO inputs, creating high formatting burden.
- “Save changes” lacks per-field dirty-state cues.
- Action consequences (publish/cancel) are not previewed.

## Recommendations
### Now
- Add confirmation modal for lifecycle actions with impact summary.
- Add “unsaved changes” visual indicator and disable save when unchanged.
- Replace raw ISO fields with date-time controls and timezone display.

### Next
- Add side-by-side “current vs pending edits” preview.
- Add event health checklist (status, capacity, registration readiness).

## Success criteria
- Fewer bad lifecycle transitions.
- Reduced formatting errors in date fields.
- Faster completion time for event maintenance tasks.
