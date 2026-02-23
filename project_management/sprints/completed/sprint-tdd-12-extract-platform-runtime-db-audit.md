# Sprint TDD-12 — Extract Platform Runtime (DB/Config/Audit)

## Goal
Create a shared “platform runtime” layer so both CLI and HTTP routes can open DB connections, run transactions, and record audit without importing through CLI modules.

## Why (Uncle Bob + Booch)
- **Bob:** frameworks are details; don’t let delivery code become your dependency magnet.
- **Booch:** common services belong to a stable subsystem (platform services), not duplicated across subsystems.

## Scope
- Create a `src/platform/*` (or equivalent) module that owns:
  - config resolution primitives (pure functions + typed config)
  - DB open/close helpers (sqlite) and transaction helpers
  - clock + id generation wrappers (injectable seams)
  - audit sink wiring primitives (without binding to CLI)
- Migrate existing shared code so `src/lib/api/*` and Next route handlers no longer import from `src/cli/*` for runtime plumbing.
- Preserve behavior and external API contracts.

## Non-Goals
- No schema changes.
- No endpoint shape changes.

## TDD Process
1. Add tests for `platform` services (config merge, db open, audit write shape, request-id plumbing).
2. Migrate one representative slice (e.g., auth or ledger) to use `platform` runtime.
3. Expand migration until no “web runtime” depends on `cli/*` modules.

## Acceptance Criteria
- `src/lib/api/*` and Next route handlers do not import DB/config helpers from `src/cli/*`.
- Platform runtime has tests and stable public APIs.
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
- **Tests:** 496 passed (106 files) — 25 new platform-specific tests
- **Lint:** Clean
- **Build:** Passes

### Changes Made
Note: TDD-11 completed most of this sprint's core scope (config/db/audit migration). TDD-12 adds the remaining platform contracts.

1. **Transaction helper** — `withTransaction(db, fn)` in `@/platform/db`
   - Wraps better-sqlite3's transaction; auto-commits or rolls back
   - Tested: success commit + error rollback

2. **Injectable seams** — `@/platform/seams`
   - `clock.now()` — returns ISO timestamp (injectable via `setClock()`)
   - `ids.uuid()` — returns UUID v4 (injectable via `setIds()`)
   - `resetSeams()` — restores production defaults
   - Enables deterministic testing without monkey-patching Date/crypto

3. **25 platform unit tests** — `src/platform/__tests__/platform-services.test.ts`
   - Config: resolveConfig defaults, file merge, env override, boolean parsing, mergeConfig
   - DB: openDb creates dir + pragmas, withTransaction commit + rollback
   - Audit: appendAuditLog USER/SERVICE rows, appendServiceAudit actor extraction
   - Date-time: nowISO, parseISO, isValidISO edge cases
   - Seams: clock/ids default + stub + reset
