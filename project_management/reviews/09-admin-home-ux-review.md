# UX Review — Admin Home

- Route: `/admin`
- Audience: Authenticated admins
- Overall score: 6.9/10

## What works
- Clear “Admin Console” heading and protected context.
- Link to audit viewer provides immediate operational entry point.

## Friction points
- Extremely sparse IA: lacks dashboard orientation and task priorities.
- No at-a-glance operational metrics (pending tasks, events needing action).
- Reliance on plain anchor links reduces consistency with app-level nav patterns.

## Recommendations
### Now
- Add role-specific quick actions: `Manage Events`, `Manage Users`, `Review Audit`.
- Add concise “today” summary panel with top 3 operational signals.
- Replace scaffolding copy with production-ready orientation text.

### Next
- Add recent activity stream and unresolved operational alerts.
- Add keyboard-first shortcuts for frequent admin tasks.

## Success criteria
- Faster time-to-first-admin-action.
- Reduced back-and-forth navigation from admin home.
- Improved discoverability of non-audit admin tools.
