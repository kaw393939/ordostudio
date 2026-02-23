# Sprint OPS-01 — Operating Model + Minimal UX Contract

## Goal
Align the product around a clear contract:
- Humans use **role cockpits** + approval screens.
- Agents use **CLI/MCP** for admin/bulk operations.

## Inputs
- `docs/operating-model-humans-agents-2026-02-23.md`
- `docs/ux-plan-minimal-ui-agent-ops-2026-02-23.md`
- `docs/audit-gap-minimal-ui-vs-current-2026-02-23.md`

## Scope
- Confirm which UI surfaces are “must keep” vs “agent-first”.
- Define approval gates (money/publishing/permissions) as an explicit policy.
- Define role-to-cockpit mapping as the primary UX.

## Deliverables
- [ ] Decision log (short) for open items:
  - newsletter: weekly ritual, surfaced via cockpit + operator navigation (not a daily-driver top nav)
  - maestro permissions: Deals + Events + Newsletter; read-only context elsewhere; no payouts/roles
  - which admin pages remain in production: keep high-context approval cockpits; move admin/bulk to CLI/MCP
- [ ] Update navigation registry to reflect the contract (no advanced admin in primary nav).
- [ ] Add a short “Operator handbook” doc for how humans and agents interact.

## Acceptance Criteria
- [ ] Each role has 3–5 primary tasks and a single home base.
- [ ] High-risk actions are explicitly gated by confirmation/approval.
- [ ] Default menus do not surface rare/advanced admin pages.
- [ ] Lint/tests/build pass.
