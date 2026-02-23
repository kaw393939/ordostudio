# Sprint 19 — Admin Users UI

## Goal
Deliver admin users management UI aligned with API RBAC and non-escalation rules.

## Scope
- Implement `/admin/users` list/search/filter.
- Implement user detail/status enable-disable interactions.
- Implement role add/remove UI for allowed roles.
- Explicitly block/remove SUPER_ADMIN role mutation controls in UI.

## TDD Process
1. Write failing tests for users list/search/detail interactions.
2. Write failing tests for enable/disable flows.
3. Write failing tests for role add/remove idempotency and SUPER_ADMIN exclusion.
4. Implement/refactor with tests green.

## Stories
- As an admin, I can manage user status and roles safely.
- As a security reviewer, I can confirm UI has no SUPER_ADMIN escalation surface.

## Acceptance Criteria
- Users list/search/detail works from API responses.
- Enable/disable actions update UI state accurately.
- Role add/remove works for permitted roles.
- No UI control allows SUPER_ADMIN role changes.

## End-of-Sprint Verification
```bash
npm run test -- admin-users-ui
npm run lint
npm run build
```
Manual checks:
- Add/remove ADMIN role and verify idempotent behavior.
- Confirm SUPER_ADMIN controls do not appear.

Pass condition:
- All Sprint 19 tests pass.
- Non-escalation UI constraints are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
