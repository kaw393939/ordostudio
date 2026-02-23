# Sprint 01 — Foundation & Test Harness

## Goal
Establish a production-grade CLI foundation (`appctl`) with a strict TDD workflow, stable command UX, config loading precedence, validation, logging, and deterministic test infrastructure.

## Scope
- Initialize CLI runtime with TypeScript + Node 20.
- Add command framework (`Commander`) and global flags contract.
- Implement config loading precedence:
  1. CLI flags
  2. environment variables
  3. config file
  4. defaults
- Implement baseline output contract:
  - human-readable default
  - `--json` strict response shape
- Implement exit code mapping contract.
- Add command help and usage snapshots.
- Add shared test utilities for CLI execution and fixtures.

## TDD Process
For every feature in this sprint:
1. Write failing tests/spec first.
2. Implement minimum code to pass.
3. Refactor while preserving green tests.
4. Commit only when all tests pass locally.

Required test layers:
- Unit tests: parsing, config merge, output formatting, exit-code mapper.
- Contract tests: global flags and JSON envelope schema.
- Snapshot tests: command help output.

## Stories
- As an operator, I can run `appctl --help` and see stable command docs.
- As an operator, I can pass `--env` and `--json` globally.
- As a developer, I can rely on deterministic config precedence.
- As CI, I can fail fast on contract regressions.

## Acceptance Criteria
- `appctl --help` returns exit code `0` and matches approved snapshot.
- Global flags parse correctly and are available to command handlers.
- `--json` output always returns:
  - `ok`, `command`, `env`, `data`, `warnings[]`, `errors[]`, `request_id`.
- Usage/validation errors exit with code `2`.
- Unexpected errors exit with code `1`.
- Config precedence behaves exactly as specified.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test
npm run lint
npm run build
npm run cli -- --help
npm run cli -- --json --env local doctor
```

Pass condition (required to close sprint):
- 100% of Sprint 01 tests pass.
- All verification commands exit `0`.
- No snapshot diffs unless intentionally updated and approved.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Open defects for sprint scope = 0.
