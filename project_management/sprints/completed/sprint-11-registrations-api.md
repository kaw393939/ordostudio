# Sprint 11 — Registrations, Check-in, Export API

## Goal
Expose registration/check-in/export API endpoints that preserve Sprint 05 business rules, redaction governance, and audit guarantees.

## Scope
- Implement endpoints:
  - `GET /api/v1/events/{slug}/registrations`
  - `POST /api/v1/events/{slug}/registrations`
  - `DELETE /api/v1/events/{slug}/registrations/{userId}`
  - `POST /api/v1/events/{slug}/checkins`
  - `GET /api/v1/events/{slug}/export?format=csv|json&include_email=...`
- Preserve capacity/waitlist behavior.
- Preserve cancellation semantics (state transition, no hard delete).
- Preserve check-in transition rules.
- Enforce export PII governance and role/token restrictions.
- Ensure all mutation and export actions are audited.

## TDD Process
1. Write failing contract and rules tests first.
2. Implement minimal handler + service integration.
3. Add security tests for `include_email` governance.
4. Refactor while preserving HAL/Problem contracts.

Required test layers:
- Capacity/waitlist transition tests.
- Export format and redaction tests.
- Authorization and audit tests for export/check-in/mutation paths.

## Stories
- As admin/staff, I can manage registrations and check-ins safely.
- As operator, I can export event data with governance controls.
- As security, I can verify PII is not exposed without proper authorization.

## Acceptance Criteria
- Full events push new registrations to WAITLISTED.
- Delete endpoint transitions registrations to CANCELLED.
- Check-in transitions to CHECKED_IN only from allowed states.
- Export supports CSV and JSON streaming/output.
- `include_email` behavior follows environment + token rules.
- All mutation/export actions are audited.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- registrations api export
npm run lint
npm run build
npm run dev
# manual/API checks:
# POST /api/v1/events/{slug}/registrations
# GET /api/v1/events/{slug}/registrations
# POST /api/v1/events/{slug}/checkins
# GET /api/v1/events/{slug}/export?format=csv
# GET /api/v1/events/{slug}/export?format=json&include_email=true
```

Pass condition (required to close sprint):
- 100% of Sprint 11 tests pass.
- Transition rules and export governance are validated.
- Audit coverage is complete for registration/check-in/export actions.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Data export governance checks are explicitly documented.
