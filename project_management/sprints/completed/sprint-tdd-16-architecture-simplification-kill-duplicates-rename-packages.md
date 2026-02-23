# Sprint TDD-16 — Architecture Simplification (Kill Duplicates, Rename Packages)

## Goal
After boundaries + platform + ports are in place, simplify: remove duplicated helper modules, normalize naming, and make the package structure “obvious at a glance.”

## Why (Uncle Bob + Booch)
- **Bob:** readability and small functions/modules reduce defect rate.
- **Booch:** clear package taxonomy enables teams to scale without tribal knowledge.

## Scope
- Remove duplication across `cli/*`, `lib/api/*`, and `core/*` after previous migrations.
- Normalize naming and folder taxonomy:
  - “delivery” vs “adapters” vs “platform” vs “core”
  - ensure tests live near the module they protect
- Introduce a short “Refactoring Map” doc: what moved and why.

## Non-Goals
- No net-new features.
- Avoid churn that doesn’t reduce complexity.

## TDD Process
1. Add characterization tests before moving/deleting code.
2. Move/rename with tests green.
3. Remove dead code with coverage confirming no usage.

## Acceptance Criteria
- Reduced duplication with no behavior regression.
- Folder taxonomy matches the documented architecture map.
- `npm test`, `npm run lint`, `npm run build` all pass.

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
