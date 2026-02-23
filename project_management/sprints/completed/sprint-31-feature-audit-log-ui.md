# Sprint 31 — Feature: Audit Log UI + E2E

## Goal
Provide an admin audit viewer with enterprise-grade access and filtering, validated by E2E tests.

## Scope
- Add admin audit list view with action/actor/time filters.
- Surface key mutation events (publish/cancel/export/roles) with safe metadata.
- Enforce admin-only access to audit UI.
- Add E2E tests for positive admin visibility and non-admin denial.
- Add negative tests for sensitive field redaction expectations.

## TDD Process
1. Write failing audit viewer access and filter tests.
2. Write failing non-admin denial and redaction tests.
3. Implement minimal audit UI endpoints/pages and filter wiring.
4. Refactor for consistency with existing admin UX.

## Stories
- As an admin, I can inspect operational history confidently.
- As compliance, I can verify least-privilege visibility and redaction.

## Acceptance Criteria
- Audit list/filter tests pass for admin users.
- Non-admin denial tests pass.
- Redaction assertions pass for sensitive metadata.

## End-of-Sprint Verification
```bash
npm run test -- e2e audit-ui
npm run lint
npm run build
```

Pass condition:
- All Sprint 31 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
