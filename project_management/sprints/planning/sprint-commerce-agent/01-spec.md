# Sprint Commerce-Agent — Specification

---

## Scope

### In scope

- `src/lib/api/maestro-tools.ts` — 4 new tools appended
- `src/evals/scenarios/commerce.ts` — 3 eval scenarios

### Out of scope
- New DB migrations
- Changes to existing MCP server implementation
- Stripe payment initiation from agent

---

## Success Criteria

| Check | Pass condition |
|-------|----------------|
| `list_deals` | Returns deals from DB with optional status filter |
| `advance_deal_stage` auth | Called by USER role → `{ error: 'FORBIDDEN' }` |
| MAESTRO_APPROVED gate | Stage above QUALIFIED requires deal.maestro_approved = 1 |
| `get_customer_timeline` | Returns ordered events for known user; empty array for unknown user |
| Tool validation | Each tool rejects invalid args with `{ error }` — never throws |
| Evals | `npm run evals:commerce` → 3/3 PASS |
| Build | `npm run build` clean |
