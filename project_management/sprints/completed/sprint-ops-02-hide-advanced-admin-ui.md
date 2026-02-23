# Sprint OPS-02 — Hide Advanced Admin UI (Make UI Thin)

## Goal
Remove cognitive load by hiding or de-emphasizing advanced/rare operator pages.

## Scope
- Keep primary operator work in a small set of cockpits.
- Move advanced admin to agent/CLI-first.

## In scope
- [ ] Adjust `adminPrimary` menu to remove advanced items by default:
  - measurement/flywheel/entitlements/settings (move behind Cmd+K or strict role gate)
- [ ] If routes must remain, make them:
  - read-only where possible
  - behind `SUPER_ADMIN` role gate
- [ ] Ensure admin quick strip (mobile) remains “top tasks”.

## Out of scope
- Building new UI screens.

## Acceptance Criteria
- [ ] Desktop admin sidebar primarily contains Deals/Intake/Events/Ledger (+ newsletter if confirmed).
- [ ] Advanced pages are not visible to standard operators.
- [ ] No broken links for any role.
- [ ] Lint/tests/build pass.
