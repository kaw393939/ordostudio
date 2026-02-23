# Sprint 25 — E2E Release Journeys + Regression Gate

## Goal
Ship the consolidated release-gate E2E suite with public/admin journeys and supportability regressions.

## Scope
- Build one canonical public journey: browse → detail → register/waitlist/cancel.
- Build one canonical admin journey: create → publish → registration → check-in → export.
- Add supportability assertion that forced failures always display `request_id` in UI.
- Add regression test for role downgrade mid-session (admin loses access on refresh).
- Add CI-ready test grouping/tags and docs for release execution.

## TDD Process
1. Write failing end-to-end journey tests.
2. Add failing supportability + role-downgrade regression tests.
3. Implement minimal fixes for determinism and gating.
4. Refactor and stabilize release test command.

## Stories
- As a release owner, I can trust critical journeys before shipping.
- As support, I can triage using request correlation in failure UX.

## Acceptance Criteria
- Public and admin release journeys pass reliably.
- request_id supportability check passes.
- Role downgrade mid-session regression test passes.
- Release-gate command and docs are updated.

## End-of-Sprint Verification
```bash
npm run test -- e2e release regression
npm run lint
npm run build
```

Pass condition:
- All Sprint 25 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
