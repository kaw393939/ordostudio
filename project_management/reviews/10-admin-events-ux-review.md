# UX Review — Admin Events

- Route: `/admin/events`
- Audience: Admin operators
- Overall score: 8.0/10

## What works
- Combines create + discovery + view modes in a powerful operations page.
- URL-synced filters support repeatable admin workflows.
- Calendar/agenda/list views support planning and execution contexts.

## Friction points
- “Create event” and “Find events” on same page increase context switching cost.
- ISO date entry fields are error-prone for non-technical admins.
- Pending state can block unrelated actions globally.
- Lacks inline field-level helper text for create flow.

## Recommendations
### Now
- Introduce guided date-time inputs with timezone helper and validation preview.
- Split visual sections more strongly with hierarchy and spacing.
- Add separate pending indicators for create vs list actions.
- Add post-create success path (`Open new event`, `Create another`).

### Next
- Add reusable templates for common event types.
- Add inline duplicate-slug detection before submit.

## Success criteria
- Reduced event creation errors.
- Faster event findability for admins.
- Lower correction churn after initial event creation.
