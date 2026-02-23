# Sprint TDD-15 — Adapter Hardening (SQLite/Stripe) + Test Doubles

## Goal
Make infrastructure “details” swappable and easy to test by hardening adapters and providing deterministic doubles.

## Why (Uncle Bob + Booch)
- **Bob:** details should be replaceable; tests should not require external systems.
- **Booch:** stable abstractions; variable implementations.

## Scope
- Standardize adapters:
  - SQLite repository adapters implement ports with predictable transaction boundaries.
  - Stripe adapter exposes a minimal interface used by use-cases.
- Provide deterministic test doubles:
  - in-memory sqlite fixture helpers for adapter/unit tests
  - Stripe fake that simulates connect + transfers + failure modes
- Add contract tests for adapters (what the core expects).

## Non-Goals
- No new Stripe features.
- No new persistence schema unless strictly needed for adapter correctness.

## TDD Process
1. Write failing contract tests for the Stripe port and SQLite repositories.
2. Implement real adapters + fakes until contracts pass.
3. Migrate existing mocks to the standardized fake where useful.

## Acceptance Criteria
- Core/use-case tests can run without hitting real Stripe.
- Adapter contracts are explicit and tested.
- `npm test`, `npm run lint`, `npm run build` all pass.

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
