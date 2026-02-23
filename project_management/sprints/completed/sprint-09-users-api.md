# Sprint 09 — Users API (Admin)

## Goal
Deliver admin user-management HTTP endpoints aligned with CLI invariants and non-escalation rules, including RBAC enforcement and audited mutations.

## Scope
- Implement endpoints:
  - `GET /api/v1/users`
  - `GET /api/v1/users/{id}`
  - `PATCH /api/v1/users/{id}`
  - `POST /api/v1/users/{id}/roles`
  - `DELETE /api/v1/users/{id}/roles/{role}`
- Reuse existing domain/service logic from CLI-backed services.
- Enforce non-escalation rule:
  - No SUPER_ADMIN role grant/revoke via HTTP API.
- Add HAL links for admin affordances.
- Ensure all mutations are audited and fail-closed on audit failure.

## TDD Process
1. Write failing endpoint contract tests.
2. Implement minimal handler + service integration.
3. Add RBAC matrix tests (USER/ADMIN/STAFF where applicable).
4. Refactor with contract snapshots stable.

Required test layers:
- Response contract tests (HAL + Problem Details).
- RBAC matrix tests for each endpoint.
- Idempotency tests for role add/remove.

## Stories
- As an admin, I can list/filter users.
- As an admin, I can inspect and update user status.
- As an admin, I can add/remove non-super roles idempotently.
- As security, I can verify API cannot escalate SUPER_ADMIN.

## Acceptance Criteria
- Unique email and user integrity rules remain enforced.
- Role add/remove remain idempotent.
- SUPER_ADMIN role changes via API are denied.
- Not-found/conflict errors use Problem Details consistently.
- Mutation endpoints produce audit records.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- users api rbac
npm run lint
npm run build
npm run dev
# manual/API checks:
# GET /api/v1/users
# GET /api/v1/users/{id}
# PATCH /api/v1/users/{id}
# POST /api/v1/users/{id}/roles
# DELETE /api/v1/users/{id}/roles/{role}
```

Pass condition (required to close sprint):
- 100% of Sprint 09 tests pass.
- RBAC matrix and non-escalation behavior are validated.
- All user mutation paths are audited.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Non-escalation controls are explicitly documented.
