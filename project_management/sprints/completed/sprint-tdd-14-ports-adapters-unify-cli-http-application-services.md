# Sprint TDD-14 — Ports + Adapters Unification (CLI + HTTP)

## Goal
Stop duplicating application logic between CLI orchestration and HTTP routes by introducing “application services” (use-case orchestrators) with ports, then having CLI and HTTP both call them.

## Why (Uncle Bob + Booch)
- **Bob:** use-cases are the application; delivery mechanisms call use-cases.
- **Booch:** separate subsystem responsibilities; reuse the same core services from multiple front-ends.

## Scope
- Define application-service modules (thin orchestrators) that:
  - validate inputs
  - call core use-cases
  - translate domain errors to delivery-neutral error types
  - do NOT import Next/Commander
- Add/expand ports in `src/core/ports/*` only where business rules require.
- Update CLI commands and Next route handlers to call the same application services.

## Non-Goals
- No changes to UI copy or page layouts.
- No breaking external API routes unless required by correctness (prefer compatibility).

## TDD Process
1. Add failing tests for application services independent of delivery.
2. Convert one vertical slice end-to-end (ledger approve + payout, or auth flows).
3. Convert additional slices until the pattern is repeatable.

## Acceptance Criteria
- CLI and HTTP share application services for at least one vertical slice.
- No use-case logic lives in Next route handlers beyond auth/serialization.
- `npm test`, `npm run lint`, `npm run build` all pass.

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
