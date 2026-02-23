# Lighthouse Budget Waiver Workflow

## Purpose
Use temporary waivers when a route/category budget miss is known, owned, and time-bound.

## Files
- Budgets: `scripts/lighthouse-route-budgets.json`
- Waivers: `scripts/lighthouse-budget-waivers.json`

## Waiver requirements
Each waiver entry must include:
- `area`
- `path`
- `category`
- `owner`
- `reason`
- `expiresOn` (`YYYY-MM-DD`)

Expired waivers fail the Lighthouse gate. Missing required waiver fields fail the Lighthouse gate.

## Example
```json
{
  "area": "authenticatedAdmin",
  "path": "/admin/events/lighthouse-open/export",
  "category": "performance",
  "owner": "platform",
  "reason": "Large export table render path pending Sprint 44 reductions",
  "expiresOn": "2026-03-15"
}
```
