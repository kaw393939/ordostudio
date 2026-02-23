# Sprint TDD-11 — Architecture Boundaries + Dependency Rule (Booch/Bob)

## Goal
Make the dependency direction explicit and enforceable so “delivery” (CLI/HTTP/Next) cannot leak into “policy” (core/business rules).

## Why (Uncle Bob + Booch)
- **Bob (Clean Architecture):** dependencies point inward; frameworks are details; business rules are independent.
- **Booch:** stable package structure with high cohesion, low coupling; clear subsystem boundaries.

## Scope
- Define and document the canonical layers for this codebase:
  - `core/` (entities, value objects, use-cases, ports)
  - `platform/` (cross-cutting runtime: config, db, time, ids, audit plumbing)
  - `adapters/` (sqlite, stripe, email providers)
  - `delivery/` (cli commands, next route handlers)
- Add enforceable import boundaries (eslint rules or lightweight test) so:
  - `core/**` does not import from `delivery/**` or `adapters/**`
  - `delivery/**` may import `core/**` and compose `adapters/**`
  - `platform/**` must not depend on `delivery/**`
- Add one short “Architecture Map” doc that becomes the source of truth.

## Non-Goals
- No functional behavior changes.
- No mass refactor of existing files beyond what’s needed to establish boundaries.

## TDD Process
1. Write failing “boundary tests” (lint/test) demonstrating current violations.
2. Introduce minimal boundary tooling (eslint import rules and/or a vitest rule test).
3. Refactor imports/paths until boundary tests are green.
4. Keep existing unit/e2e tests green throughout.

## Acceptance Criteria
- Boundary rules exist and fail fast on violations.
- A short architecture doc exists and matches the enforced rule set.
- `npm test`, `npm run lint`, `npm run build` all pass.

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- **Date:** 2026-02-21
- **Tests:** 471 passed (105 files), including 4 architecture boundary tests
- **Lint:** Clean (0 errors, 0 warnings) — with `no-restricted-imports` enforcement
- **Build:** Passes

### Changes Made
1. **Created `src/platform/` layer** (6 files):
   - `types.ts` — canonical `AppConfig`, `RuntimeEnv`, `DbConfig`, etc.
   - `config.ts` — `resolveConfig`, `loadConfigFromDisk`, `defaultConfig`
   - `db.ts` — `openDb` (renamed from `openCliDb`, alias preserved)
   - `audit.ts` — `appendAuditLog`, `appendServiceAudit`
   - `date-time.ts` — `parseISO`, `nowISO`, `isValidISO`
   - `runtime.ts` — convenience barrel re-exporting db + audit

2. **Moved `core/infrastructure/sqlite/` → `src/adapters/sqlite/`** (5 files)
   - Concrete repository implementations now live outside core
   - Updated all imports to use `@/adapters/sqlite/` (28 import lines, 14 files)

3. **Fixed 56 import violations** across 28 files:
   - Category A: `core/use-cases/` → `@/lib/date-time` changed to `@/platform/date-time`
   - Category B: `core/infrastructure/sqlite/` → `cli/*` eliminated (files moved to adapters/)
   - Category D: 21 `lib/api/` files updated from `cli/config` → `@/platform/config`, `cli/repository-helpers` → `@/platform/runtime`, `cli/types` → `@/platform/types`
   - 10 `app/` route files updated similarly

4. **Thin re-export wrappers** for backward compatibility:
   - `cli/types.ts` — re-exports shared types from `@/platform/types`, keeps CLI-specific types
   - `cli/config.ts` — delegates to `@/platform/config`, adds CLI flag overrides
   - `cli/repository-helpers.ts` — re-exports from `@/platform/db` + `@/platform/audit`
   - `lib/date-time.ts` — re-exports core parsing from `@/platform/date-time`, keeps display utils

5. **Boundary enforcement** (two mechanisms):
   - `src/__tests__/architecture-boundaries.test.ts` — 4 vitest assertions scanning source files
   - `eslint.config.mjs` — `no-restricted-imports` rules for core/, platform/, adapters/

6. **Architecture map doc** — `docs/architecture-map.md`
