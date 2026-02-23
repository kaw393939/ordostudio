# Sprint 28 — Feature: Admin Invitations + E2E

## Goal
Add secure admin invitation workflows that grant ADMIN (never SUPER_ADMIN) with full E2E validation.

## Scope
- Add invitation create/send/accept flow for admin role onboarding.
- Enforce invite expiry, one-time use, and existing-account behavior.
- Ensure invite flow cannot assign SUPER_ADMIN.
- Add positive and negative E2E tests for invitation lifecycle and unauthorized attempts.

## TDD Process
1. Write failing tests for admin invite happy path.
2. Write failing tests for reuse/expiry/existing-account/unauthorized invite attempts.
3. Implement invitation model + endpoints + minimal UI surfaces.
4. Refactor security validations and test fixtures.

## Stories
- As an admin, I can onboard another admin safely.
- As security, I can validate non-escalation at all times.

## Acceptance Criteria
- Invite lifecycle tests pass end-to-end.
- SUPER_ADMIN is never assignable in invite flow.
- Unauthorized invite creation is blocked and tested.

## End-of-Sprint Verification
```bash
npm run test -- e2e admin-invitations
npm run lint
npm run build
```

Pass condition:
- All Sprint 28 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.
