# Sprint 06 — Backup/Restore Hardening, CI, Release Readiness

## Goal
Finalize operational safety for dangerous commands, validate backup/restore reliability, and enforce release gates in CI.

## Scope
- Implement and harden:
  - `db backup`
  - `db restore`
  - optional `db reset` safety rails
- Enforce dangerous-op rules in prod:
  - token required
  - `--force-prod`
  - `--yes`
- Add backup/restore round-trip checks in CI.
- Ensure migration forward-only discipline guardrails.
- Finalize docs/runbooks for operational usage.

## TDD Process
- Write failing tests for each dangerous command guard.
- Add tests for local/staging/prod behavior differences.
- Add round-trip restore verification tests.
- Refactor only with green full-suite and CLI smoke tests.

Required test layers:
- Unit tests: guard rails, confirmation flags, env gating.
- Integration tests: backup artifact + restore round-trip.
- CI workflow tests: sprint-close gate script.

## Stories
- As a super-admin, I can create reliable backups.
- As a super-admin, I can restore safely with explicit intent.
- As operator, I can trust CI to block unsafe regressions.
- As team, I can release only with verified CLI correctness.

## Acceptance Criteria
- Backup uses safe method and produces valid artifact.
- Restore default is local/staging only; prod requires explicit overrides.
- Dangerous commands in prod fail without all required flags/token.
- Round-trip backup/restore passes in CI local profile.
- Full CLI contract tests pass (help, JSON shape, exit codes).

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test
npm run lint
npm run build
npm run cli -- db backup --out ./tmp/backup.db --env local
npm run cli -- db restore --from ./tmp/backup.db --env local --yes
npm run cli -- doctor --env local --json
```

Pass condition (required to close sprint):
- 100% of Sprint 06 tests pass.
- Full project CI-equivalent command set exits `0`.
- Backup/restore round-trip verified and documented.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Release checklist is fully green.
