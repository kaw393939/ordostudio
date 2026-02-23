# sprint-01-foundation.md

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


---

# sprint-02-db-core.md

# Sprint 02 — Database Core (Status, Migrate, Seed, Doctor)

## Goal
Deliver reliable DB lifecycle primitives with idempotent behavior and strict health checks for SQLite production profile.

## Scope
- Implement `db status`, `db migrate`, `db seed`, `doctor`.
- Integrate Drizzle ORM + drizzle-kit migrations.
- Enforce/verify SQLite requirements (WAL, FK, busy timeout, path validity).
- Ensure seed is idempotent (roles and bootstrap data).
- Add fail-closed audit behavior for state-changing commands.

## TDD Process
For each command/edge case:
1. Write failing tests for success path and invariant violations.
2. Implement minimal behavior.
3. Add idempotency and rollback tests.
4. Refactor service interfaces with tests green.

Required test layers:
- Unit tests: pragma checks, migration status resolver.
- Integration tests: migrate/seed idempotency, doctor validation.
- Failure-path tests: audit failure causes command failure.

## Stories
- As an operator, I can confirm schema status before writes.
- As an operator, I can run migrations safely multiple times.
- As an operator, I can seed without duplicate corruption.
- As an operator, I can detect bad SQLite runtime settings.

## Acceptance Criteria
- `db migrate` is idempotent and audited.
- `db seed` is idempotent and audited.
- `doctor` fails when WAL/FK are not enabled.
- `doctor` fails on schema mismatch.
- Any audit write failure aborts mutation (fail-closed).
- Precondition failures return exit code `6`.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- db
npm run cli -- db status --env local
npm run cli -- db migrate --env local
npm run cli -- db migrate --env local
npm run cli -- db seed --env local
npm run cli -- db seed --env local
npm run cli -- doctor --env local --json
```

Pass condition (required to close sprint):
- 100% of Sprint 02 DB tests pass.
- Re-running migrate/seed yields no duplicates or corruption.
- All verification commands exit `0` for healthy setup.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Idempotency evidence is attached in sprint notes.


---

# sprint-03-auth-users.md

# Sprint 03 — Auth Tokens & User Management

## Goal
Implement super-admin token operations and user/role commands with permission rails aligned to environment policy.

## Scope
- Implement token commands:
  - `auth token create`
  - `auth token revoke`
- Implement user commands:
  - `user create`, `user list`, `user show`
  - `user disable`, `user enable`
  - `user role add`, `user role remove`
- Enforce role and token checks for write operations in staging/prod.
- Ensure token hashing at rest and one-time token display.
- Audit all state mutations.

## TDD Process
- Write failing tests for each command and permission branch first.
- Add tests for token hashing and revocation behavior.
- Add tests for role assignment uniqueness and conflict handling.
- Refactor services only with green test suite.

Required test layers:
- Unit tests: permission guard, role resolver, token verifier.
- Integration tests: command-to-service wiring, audit writes.
- Security tests: no plaintext token persistence.

## Stories
- As a super-admin, I can issue and revoke service tokens.
- As an admin, I can create and manage user status.
- As a super-admin, I can assign/revoke roles safely.
- As operator, I can trust mutation auditability.

## Acceptance Criteria
- Token is shown once on create; only hash stored.
- Revoked token cannot authorize writes.
- User create enforces unique email.
- Role add/remove are idempotent and audited.
- Staging/prod write commands fail with exit code `3` when unauthorized.
- Not-found and conflict paths return specified exit codes.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- auth user
npm run cli -- auth token create --name sprint3 --env local --json
npm run cli -- user create --email admin@example.com --status ACTIVE --env local
npm run cli -- user role add --id <USER_ID> --role ADMIN --env local
npm run cli -- user disable --id <USER_ID> --reason "verification" --env local
npm run cli -- auth token revoke --id <TOKEN_ID> --env local
```

Pass condition (required to close sprint):
- 100% of Sprint 03 tests pass.
- Authorization and revocation checks behave as expected.
- All verification commands exit `0` for expected paths.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Security review checklist items are complete.


---

# sprint-04-events.md

# Sprint 04 — Event Lifecycle

## Goal
Deliver robust event lifecycle commands with validation, idempotent publish behavior, and full mutation auditing.

## Scope
- Implement commands:
  - `event create`
  - `event update`
  - `event publish`
  - `event cancel`
  - `event list`
- Enforce slug uniqueness and time validation.
- Ensure publish is idempotent and audited.
- Ensure cancellation reason requirements and audit metadata.

## TDD Process
- Start each command with failing contract tests.
- Add edge-case tests for date/timezone and conflict behavior.
- Add idempotency tests for repeated publish/cancel attempts.
- Refactor service layer with unchanged command contract.

Required test layers:
- Unit tests: input validation and state transitions.
- Integration tests: create→update→publish→cancel flow.
- Audit tests: every mutation creates audit log.

## Stories
- As an admin, I can create events in `DRAFT` state.
- As an admin, I can publish an event safely once.
- As an admin, I can cancel with an explicit reason.
- As an operator, I can list by status/date filters.

## Acceptance Criteria
- Event create enforces required fields and valid ISO times.
- Update modifies only provided fields.
- Publish is idempotent and audited.
- Cancel sets `CANCELLED` and stores audit reason metadata.
- List supports status/from/to filters.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- event
npm run cli -- event create --slug spring-launch --title "Spring Launch" --start 2026-04-01T14:00:00Z --end 2026-04-01T15:00:00Z --tz UTC --env local
npm run cli -- event publish --slug spring-launch --env local
npm run cli -- event publish --slug spring-launch --env local
npm run cli -- event cancel --slug spring-launch --reason "verification" --env local
npm run cli -- event list --status CANCELLED --env local --json
```

Pass condition (required to close sprint):
- 100% of Sprint 04 tests pass.
- Repeated publish does not duplicate or corrupt state.
- All verification commands exit `0` for expected paths.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Event domain invariants are documented.


---

# sprint-05-registrations-export.md

# Sprint 05 — Registrations, Check-in, Export

## Goal
Implement registration workflows with capacity/waitlist behavior, check-in flow, and governed export outputs with PII controls.

## Scope
- Implement commands:
  - `reg add`, `reg remove`, `reg list`
  - `checkin`
  - `event export`
- Enforce capacity rule: full event => `WAITLISTED`.
- Enforce no hard delete on remove (`CANCELLED` state transition).
- Implement export to CSV/JSON with security redaction rules.
- Require token for `--include-email` outside local.

## TDD Process
- Begin with failing tests for capacity and state transitions.
- Add regression tests for duplicate registration attempts.
- Add authorization/redaction tests for PII export paths.
- Refactor internals with no contract breakage.

Required test layers:
- Unit tests: status transitions and export formatter.
- Integration tests: event capacity scenarios and check-in behavior.
- Security tests: PII redaction without proper token context.

## Stories
- As an admin, I can register users and respect capacity limits.
- As an admin, I can cancel registrations without deleting history.
- As staff, I can check users in at event time.
- As operator, I can export registration data safely.

## Acceptance Criteria
- Full events place new registrations in `WAITLISTED`.
- `reg remove` transitions status to `CANCELLED`.
- `checkin` transitions to `CHECKED_IN` from allowed states.
- Export supports CSV/JSON and writes file correctly.
- PII behavior follows token + environment rules.
- All mutations are audited.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- registration export
npm run cli -- reg add --event spring-launch --user admin@example.com --env local
npm run cli -- reg list --event spring-launch --env local --json
npm run cli -- checkin --event spring-launch --user admin@example.com --env local
npm run cli -- event export --slug spring-launch --format csv --out ./tmp/spring-launch.csv --env local
npm run cli -- event export --slug spring-launch --format json --out ./tmp/spring-launch.json --env local
```

Pass condition (required to close sprint):
- 100% of Sprint 05 tests pass.
- Capacity/waitlist and check-in rules behave correctly.
- All verification commands exit `0` and output files are generated.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint CLI verification passes.
- Export governance checks are documented and approved.


---

# sprint-06-hardening-release.md

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


---

# sprint-07-api-foundation.md

# Sprint 07 — API Foundation (HAL + Problem Details + OpenAPI Skeleton)

## Goal
Establish the HTTP transport foundation for `/api/v1` with HAL success responses, RFC 9457 Problem Details errors, request correlation, and initial OpenAPI 3.1 contract publication.

## Scope
- Create base route scaffolding for Next.js Route Handlers under `/api/v1`.
- Add shared response builders:
  - HAL (`application/hal+json`)
  - Problem Details (`application/problem+json`)
- Implement request correlation (`request_id`) in headers and error bodies.
- Implement API root discoverability endpoint: `GET /api/v1`.
- Add OpenAPI 3.1 skeleton endpoint: `GET /api/v1/docs`.
- Add transport-layer guardrails: no business logic in handlers.

## TDD Process
For every endpoint and shared builder:
1. Write failing contract tests first.
2. Implement minimal transport behavior.
3. Refactor with strict backward-compatibility on response contracts.
4. Keep green tests before merging.

Required test layers:
- Contract tests for HAL response shape and required `_links`.
- Contract tests for Problem Details fields (`type/title/status/detail/instance` + `request_id`).
- Tests for content-type correctness per endpoint.

## Stories
- As a UI client, I can discover API entry links from `/api/v1`.
- As an integrator, I receive standardized error payloads.
- As ops, I can correlate errors using `request_id`.
- As developers, we have a single response formatting foundation.

## Acceptance Criteria
- `/api/v1` returns `application/hal+json` with `_links.self` and top-level navigation links.
- Errors return `application/problem+json` and RFC 9457 canonical fields.
- Every error body includes `request_id` extension member.
- OpenAPI skeleton is accessible at `/api/v1/docs`.
- Route handlers call shared builders and avoid direct business-rule duplication.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- api foundation
npm run lint
npm run build
npm run dev
# then manually verify:
# GET /api/v1
# GET /api/v1/docs
```

Pass condition (required to close sprint):
- 100% of Sprint 07 tests pass.
- HAL and Problem Details contracts are stable and validated.
- `/api/v1` and `/api/v1/docs` return expected payload shapes.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- API contract snapshot changes are reviewed/approved.


---

# sprint-08-auth-session.md

# Sprint 08 — Auth & Session (UI-Ready)

## Goal
Implement secure browser-ready authentication and identity endpoints (`register/login/logout/me`) with session cookies, CSRF-safe mutation patterns, and role-aware HAL affordances.

## Scope
- Integrate Auth.js credentials flow for session-based auth.
- Implement password hashing (argon2id preferred, fallback bcrypt only if justified).
- Build endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/me`
- Configure secure cookie policy:
  - `HttpOnly`
  - `Secure` in prod
  - `SameSite=Lax` (or stricter where validated)
- Ensure CSRF-safe mutation behavior.
- Ensure no super-admin escalation paths via API.

## TDD Process
For each endpoint and auth guard:
1. Write failing auth/session contract tests.
2. Implement minimal pass behavior.
3. Add CSRF and cookie-flag regression tests.
4. Refactor with green tests and unchanged contracts.

Required test layers:
- Contract tests for auth endpoint responses and status codes.
- Security tests for cookie flags and session lifecycle.
- RBAC tests for `/me` affordance links.

## Stories
- As a user, I can register and login through browser-safe sessions.
- As a user, I can logout and invalidate my session.
- As a client app, I can query `/me` and discover allowed actions.
- As security reviewers, we can verify cookie and CSRF protections.

## Acceptance Criteria
- Register creates `USER` role account with expected status.
- Login sets correct secure session cookie semantics.
- Logout clears session.
- `/me` returns role-aware HAL links.
- Mutating auth routes are CSRF-safe.
- No endpoint grants SUPER_ADMIN or token issuance via HTTP API.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- auth session me
npm run lint
npm run build
npm run dev
# manual/API checks:
# POST /api/v1/auth/register
# POST /api/v1/auth/login
# GET /api/v1/me
# POST /api/v1/auth/logout
```

Pass condition (required to close sprint):
- 100% of Sprint 08 tests pass.
- Session lifecycle and cookie security checks pass.
- `/me` links correctly reflect role permissions.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Security checklist for auth/session is fully green.


---

# sprint-09-users-api.md

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


---

# sprint-10-events-api.md

# Sprint 10 — Events API (Admin + Public Read)

## Goal
Expose event lifecycle over HTTP while preserving Sprint 04 domain invariants and state-driven HATEOAS affordances.

## Scope
- Implement endpoints:
  - `GET /api/v1/events` (filter + paging)
  - `POST /api/v1/events`
  - `GET /api/v1/events/{slug}`
  - `PATCH /api/v1/events/{slug}`
  - `POST /api/v1/events/{slug}/publish`
  - `POST /api/v1/events/{slug}/cancel`
- Preserve event lifecycle invariants from CLI domain services.
- Implement state-dependent HAL action links:
  - DRAFT => `app:publish`
  - PUBLISHED => `app:cancel`
  - CANCELLED => read-only links
- Ensure mutation paths are audited.

## TDD Process
1. Write failing contract tests for each endpoint + state link matrix.
2. Implement minimal handlers calling shared services.
3. Add idempotency tests for publish.
4. Refactor while keeping HAL/Problem contracts stable.

Required test layers:
- HAL link relation tests by event status.
- Validation tests for event updates and cancel reason.
- RBAC tests for write endpoints.

## Stories
- As an admin, I can create/update/publish/cancel events via API.
- As a client, I can discover allowed actions through `_links`.
- As operators, we retain audit trail for event mutations.

## Acceptance Criteria
- Event lifecycle semantics match Sprint 04 behavior.
- Publish remains idempotent.
- Cancel requires reason and stores audit metadata.
- List endpoint supports filters and paging metadata.
- HAL links correctly reflect event state.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test -- events api hateoas
npm run lint
npm run build
npm run dev
# manual/API checks:
# GET /api/v1/events?status=DRAFT
# POST /api/v1/events
# POST /api/v1/events/{slug}/publish
# POST /api/v1/events/{slug}/cancel
# GET /api/v1/events/{slug}
```

Pass condition (required to close sprint):
- 100% of Sprint 10 tests pass.
- HAL link matrix by state is correct.
- Event mutation audit coverage is complete.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Event API contract snapshots are approved.


---

# sprint-11-registrations-api.md

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


---

# sprint-12-api-hardening-release.md

# Sprint 12 — API Hardening, Security Regression, Release Readiness

## Goal
Harden API operations for production with abuse controls, defense-in-depth authorization enforcement, and release-ready operational runbooks.

## Scope
- Implement initial rate limiting for:
  - login
  - register
  - export endpoints
- Enforce security headers and no-store cache rules for auth/user endpoints.
- Ensure authorization checks are enforced in handlers (not middleware-only reliance).
- Add API-focused production runbooks and release checklist.
- Expand regression suite for auth bypass and edge-case security paths.

## TDD Process
1. Write failing security/abuse tests first.
2. Implement minimal controls to satisfy contracts.
3. Add regression tests for bypass patterns.
4. Refactor with full-suite green and no contract drift.

Required test layers:
- Rate-limit behavior tests.
- Handler-level auth enforcement tests.
- Problem Details consistency tests for blocked requests.

## Stories
- As security, I can trust handler-level access controls.
- As operations, I can mitigate abuse through rate limiting.
- As release managers, I have a clear API hardening signoff checklist.

## Acceptance Criteria
- Rate limits are enforced for targeted endpoints.
- Authorization logic is validated inside handlers.
- Security headers and cache controls are correctly applied.
- Regression tests cover known bypass classes.
- OpenAPI and docs reflect final API behavior.

## End-of-Sprint CLI Verification
Run these commands at sprint end:

```bash
npm run test
npm run lint
npm run build
npm run dev
# manual/API checks:
# rate-limit protected endpoint behavior
# auth-protected endpoint behavior
# /api/v1/docs contract consistency
```

Pass condition (required to close sprint):
- 100% of Sprint 12 tests pass.
- Security and operational hardening checks pass.
- Release checklist is fully green.

## Exit Gate
Sprint can move from `active` to `completed` only if:
- Acceptance criteria are fully met.
- End-of-sprint verification passes.
- Release signoff document is completed.


---

# sprint-13-ui-foundation-design-system.md

# Sprint 13 — UI Foundation + Design System

## Goal
Establish the Next.js App Router UI foundation with a reusable HAL client, Problem Details renderer, and protected route scaffolding for admin surfaces.

## Scope
- Create App Router shell and shared layouts/navigation.
- Add UI component baseline (forms, tables, dialogs, toasts) using existing Tailwind/UI primitives.
- Build `lib/halClient` with:
  - root discovery (`/api/v1`)
  - link following by relation
  - standardized fetch wrapper for HAL and Problem Details.
- Implement global Problem Details error UI with `request_id` display/copy.
- Add admin route protection driven by `/api/v1/me` and role-aware affordances.

## TDD Process
1. Write failing unit tests for HAL client parsing and link-follow behavior.
2. Write failing component tests for Problem Details rendering and request_id visibility.
3. Write failing integration tests for admin-route gating.
4. Implement minimally, then refactor with tests green.

## Stories
- As a user, I get consistent UI shell and feedback patterns.
- As a developer, I can consume API links without hardcoding transport paths.
- As support, I can capture request correlation IDs from UI errors.

## Acceptance Criteria
- HAL client consumes `_links` and supports relation-driven actions.
- Problem Details renderer handles non-2xx with clear messaging and `request_id`.
- Admin routes are denied when `/api/v1/me` does not grant required affordances.
- No UI hardcoding of event action routes (publish/cancel/export/registrations).

## End-of-Sprint Verification
```bash
npm run test -- ui-foundation hal-client
npm run lint
npm run build
```
Manual checks:
- Open protected admin route when logged out (must gate).
- Trigger a problem response and verify `request_id` appears.

Pass condition:
- All Sprint 13 tests pass.
- HAL + error contract behavior is verified.

## Exit Gate
Move sprint only when all acceptance criteria and verification checks pass.


---

# sprint-14-public-events-ui.md

# Sprint 14 — Public Events UI

## Goal
Deliver public events browsing and detail pages that consume HAL resources and state-dependent affordances.

## Scope
- Implement `/events` list page with paging/filter controls from API metadata.
- Implement `/events/[slug]` detail page.
- Render available actions strictly from HAL links.
- Display event state and user-specific affordances.

## TDD Process
1. Write failing page/component tests for list/detail render paths.
2. Write failing integration tests for HAL-link-driven actions visibility.
3. Implement minimal data-fetch and render logic.
4. Refactor for shared UI patterns with tests green.

## Stories
- As a visitor, I can browse published events.
- As a user, I can see allowed actions on event detail from API affordances.

## Acceptance Criteria
- `/events` renders from API response, including empty/error states.
- `/events/[slug]` renders detail and action controls from `_links`.
- UI does not assume `publish/cancel` endpoints; it follows affordances.
- Problem Details are shown through the global renderer.

## End-of-Sprint Verification
```bash
npm run test -- public-events-ui
npm run lint
npm run build
```
Manual checks:
- Navigate list -> detail.
- Confirm action controls change with event state/affordances.

Pass condition:
- All Sprint 14 tests pass.
- HAL-driven navigation validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.


---

# sprint-15-auth-pages-account.md

# Sprint 15 — Auth Pages + Account

## Goal
Implement UI auth entry points and account surfaces using session-based API flows and robust Problem Details handling.

## Scope
- Implement `/login` and `/register` using React Hook Form + Zod.
- Implement `/account` page for current user profile and basic registration summary.
- Handle auth/session transitions cleanly (logged in/out states).
- Surface rate-limit and auth errors with friendly messages and request IDs.

## TDD Process
1. Write failing form validation tests for login/register.
2. Write failing integration tests for success/error auth flows.
3. Write failing tests for `/account` authenticated gating.
4. Implement and refactor with green tests.

## Stories
- As a new user, I can register and sign in.
- As an existing user, I can log in and access my account.
- As a user, I receive clear errors for invalid credentials and throttling.

## Acceptance Criteria
- Login/register submit to API and handle Problem Details consistently.
- `/account` requires session and renders user data from `/api/v1/me`.
- Rate-limit (`429`) feedback is user-friendly.
- Request IDs are visible on surfaced errors.

## End-of-Sprint Verification
```bash
npm run test -- auth-ui account-ui
npm run lint
npm run build
```
Manual checks:
- Register -> login -> account.
- Verify invalid credentials and rate-limit UX.

Pass condition:
- All Sprint 15 tests pass.
- Auth/session UX contract validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.


---

# sprint-16-registration-ux.md

# Sprint 16 — Registration UX

## Goal
Deliver event registration UX preserving domain transitions: REGISTERED, WAITLISTED, CANCELLED, and CHECKED_IN visibility.

## Scope
- Add registration action on event detail.
- Show current registration status badges and transitions.
- Implement cancel action as state transition (no hard delete semantics in UI).
- Provide clear user feedback for waitlist outcomes.

## TDD Process
1. Write failing tests for register/cancel interaction flows.
2. Write failing tests for WAITLISTED behavior when capacity is full.
3. Write failing tests for status rendering and action availability.
4. Implement/refactor with green tests.

## Stories
- As a user, I can register for an event and see if I am waitlisted.
- As a user, I can cancel and see cancelled state reflected.

## Acceptance Criteria
- Register action reflects REGISTERED or WAITLISTED response.
- Cancel action transitions status to CANCELLED in UI state.
- UI state aligns with API status transitions.
- Problem responses are rendered consistently.

## End-of-Sprint Verification
```bash
npm run test -- registration-ui
npm run lint
npm run build
```
Manual checks:
- Register on available event.
- Register on full event and verify WAITLISTED.
- Cancel and verify CANCELLED status.

Pass condition:
- All Sprint 16 tests pass.
- Transition semantics verified against API behavior.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.


---

# sprint-17-admin-events-console.md

# Sprint 17 — Admin Events Console

## Goal
Implement admin event management UI for list/create/edit and state-driven publish/cancel actions.

## Scope
- Implement `/admin/events` list + create flow.
- Implement `/admin/events/[slug]` detail/edit flow.
- Render publish/cancel controls only when corresponding HAL links exist.
- Support create/update validation feedback and problem rendering.

## TDD Process
1. Write failing tests for admin list/create/edit UI.
2. Write failing tests for HAL-driven publish/cancel action visibility.
3. Write failing integration tests for lifecycle transitions in UI.
4. Implement/refactor with tests green.

## Stories
- As an admin, I can create and edit events.
- As an admin, I can publish/cancel only when affordances are present.

## Acceptance Criteria
- `/admin/events` supports listing and creation.
- `/admin/events/[slug]` supports editing.
- Publish/cancel buttons are conditioned by `_links`.
- Error states use Problem Details renderer with request_id.

## End-of-Sprint Verification
```bash
npm run test -- admin-events-ui
npm run lint
npm run build
```
Manual checks:
- Create event, publish it, then cancel it via available links.
- Confirm button visibility changes by state.

Pass condition:
- All Sprint 17 tests pass.
- State-driven affordance behavior is verified.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.


---

# sprint-18-admin-registrations-checkin-export.md

# Sprint 18 — Admin Registrations + Check-in + Export

## Goal
Implement admin registration operations, check-in workflows, and export UI with governance constraints.

## Scope
- Implement `/admin/events/[slug]/registrations` for list/add/cancel/check-in.
- Implement `/admin/events/[slug]/export` UI for csv/json exports.
- Enforce include-email governance behavior in UI.
- Display transitions and operation outcomes clearly.

## TDD Process
1. Write failing tests for registrations list/add/cancel/check-in.
2. Write failing tests for export format options and responses.
3. Write failing tests for include-email governance behavior.
4. Implement/refactor with tests green.

## Stories
- As an admin, I can manage registrations and check-ins.
- As an admin, I can export data while respecting governance constraints.

## Acceptance Criteria
- Registrations view supports add/cancel/check-in and status updates.
- Export supports csv/json and handles blocked include-email cases.
- UI follows API links and renders Problem Details for blocked actions.
- Request IDs are visible for operational troubleshooting.

## End-of-Sprint Verification
```bash
npm run test -- admin-registrations-ui export-ui
npm run lint
npm run build
```
Manual checks:
- Add/cancel/check-in registration.
- Export csv/json and validate include-email restrictions outside local.

Pass condition:
- All Sprint 18 tests pass.
- Governance behavior validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.


---

# sprint-19-admin-users-ui.md

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


---

# sprint-20-ui-hardening-e2e-release.md

# Sprint 20 — UI Hardening + E2E + Release Gate

## Goal
Finalize UI for production readiness with end-to-end coverage, accessibility pass, and escalation-surface checks.

## Scope
- Build Playwright E2E suite for critical public + admin flows.
- Add accessibility pass for keyboard navigation, labels, and focus behavior.
- Ensure consistent Problem Details UX with request_id propagation.
- Verify no CLI-only super-admin/dangerous operations are exposed in UI.

## TDD Process
1. Write failing E2E tests for end-to-end user/admin journeys.
2. Write failing accessibility and error rendering checks.
3. Implement minimal fixes to pass release criteria.
4. Refactor while preserving behavior and full green suite.

## Stories
- As a release owner, I can trust core UI flows through automated E2E coverage.
- As support, I can diagnose failures via request_id surfaced in UI.

## Acceptance Criteria
- E2E flows pass:
  - register/login/logout
  - browse events
  - register/waitlist/cancel
  - admin create→publish→registrations→check-in→export.
- Accessibility checks pass for critical routes.
- Problem Details and request_id are consistently displayed.
- No UI surface exposes CLI-only operations.

## End-of-Sprint Verification
```bash
npm run test -- e2e ui-hardening
npm run lint
npm run build
```
Manual checks:
- Spot-check critical public/admin flows in browser.
- Confirm no SUPER_ADMIN/CLI-only operation surfaces.

Pass condition:
- All Sprint 20 tests pass.
- Release checklist is fully green.

## Exit Gate
UI Phase 1 is complete only when all criteria above pass and regression suite is green.


---

# sprint-21-e2e-api-foundation-contracts.md

# Sprint 21 — E2E API Foundation + Contracts

## Goal
Implement deterministic E2E coverage for API discoverability, docs, content types, and Problem Details contract consistency.

## Scope
- Add Playwright/API E2E tests for `GET /api/v1` and `GET /api/v1/docs`.
- Add negative tests for missing endpoints returning RFC 9457 Problem Details with `request_id`.
- Assert representative success/error content types (`application/hal+json` and `application/problem+json`).
- Standardize E2E fixtures for users/events/registrations baseline.

## TDD Process
1. Write failing E2E tests for root/docs/content-type and problem-shape.
2. Add deterministic seed/fixture loader for E2E suite.
3. Implement minimal fixes until all tests pass.
4. Refactor tests for readability and stability.

## Stories
- As a UI client, I can rely on stable API contracts.
- As support, I always receive `request_id` for failed requests.

## Acceptance Criteria
- Root/docs discovery tests pass.
- Missing endpoint test validates full Problem Details contract + `request_id`.
- Content-type tests pass across representative endpoints.
- Shared E2E fixture setup is committed and reusable.

## End-of-Sprint Verification
```bash
npm run test -- e2e api-foundation
npm run lint
npm run build
```

Pass condition:
- All Sprint 21 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-22-e2e-auth-session-hardening.md

# Sprint 22 — E2E Auth + Session Hardening

## Goal
Deliver complete positive/negative E2E coverage for register/login/logout/account/session expiry/CSRF/rate-limit behavior.

## Scope
- Add UI E2E tests for register → login → account and logout gating.
- Add negative tests for invalid credentials and friendly Problem Details rendering with `request_id`.
- Add E2E coverage for rate-limited login/register flows.
- Add E2E coverage for expired session and CSRF-safe mutation blocking behavior.

## TDD Process
1. Write failing tests for happy path auth journey.
2. Write failing tests for invalid credentials, 429, CSRF, and session expiry.
3. Implement minimal app/test harness updates for deterministic pass.
4. Refactor selectors, fixture helpers, and retries.

## Stories
- As a user, I can authenticate reliably.
- As a security reviewer, I can validate hardening behavior from the UI.

## Acceptance Criteria
- Register/login/logout/account E2E flow passes.
- Invalid auth + rate-limit + CSRF + expiry behaviors are covered and pass.
- Every surfaced auth error includes request correlation in UI.

## End-of-Sprint Verification
```bash
npm run test -- e2e auth session
npm run lint
npm run build
```

Pass condition:
- All Sprint 22 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-23-e2e-public-events-hal.md

# Sprint 23 — E2E Public Events + HAL Compliance

## Goal
Validate public event browsing and strict HATEOAS behavior from UI consumers.

## Scope
- Add E2E coverage for `/events` list and `/events/[slug]` detail.
- Add negative tests for bad slug and forced API failure UX with Problem Details + `request_id`.
- Add HAL affordance tests for state-dependent publish/cancel visibility in admin event detail.
- Add strongest HATEOAS proof test: modified HAL href is the URL used by UI actions.
- Add stale UI/race behavior test (action fails gracefully and UI refreshes state).

## TDD Process
1. Write failing browse/detail + negative slug tests.
2. Write failing HAL affordance and dynamic-href action tests.
3. Implement/refine UI or helpers to honor HAL links only.
4. Refactor for deterministic race handling in tests.

## Stories
- As a user, I can browse event data safely.
- As an API architect, I can confirm UI is link-driven, not hardcoded.

## Acceptance Criteria
- Public list/detail E2E tests pass.
- Negative public error rendering tests pass with request correlation.
- HAL affordance + dynamic href usage tests pass.
- Stale-action race test passes with graceful recovery behavior.

## End-of-Sprint Verification
```bash
npm run test -- e2e events hal
npm run lint
npm run build
```

Pass condition:
- All Sprint 23 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-24-e2e-admin-operations-security.md

# Sprint 24 — E2E Admin Operations + Security Boundaries

## Goal
Complete E2E coverage for admin events, registrations/check-in/export, users UI, and non-escalation boundaries.

## Scope
- Add E2E tests for admin event create/edit/publish/cancel + validation/slug conflicts.
- Add E2E tests for admin registrations list/add/cancel/check-in/export + blocked include_email + rate-limit.
- Add E2E tests for admin users list/search/filter, enable/disable, ADMIN role idempotency.
- Add negative tests ensuring no SUPER_ADMIN controls in UI and API escalation attempts are denied.
- Add explicit unauthorized access tests for all admin web surfaces.

## TDD Process
1. Write failing admin events console tests.
2. Write failing registration/check-in/export governance tests.
3. Write failing admin users + non-escalation tests.
4. Implement minimal fixes and refactor shared admin E2E helpers.

## Stories
- As an admin, I can operate event lifecycle safely.
- As security, I can verify escalation controls are enforced.

## Acceptance Criteria
- Admin events/registrations/export/users E2E suites pass.
- Governance and 429 scenarios are covered and pass.
- SUPER_ADMIN and CLI-only boundaries are validated in tests.

## End-of-Sprint Verification
```bash
npm run test -- e2e admin operations security
npm run lint
npm run build
```

Pass condition:
- All Sprint 24 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-25-e2e-release-journeys-regression.md

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


---

# sprint-26-feature-password-reset-recovery.md

# Sprint 26 — Feature: Password Reset + Recovery E2E

## Goal
Implement password reset/account recovery feature and its complete positive/negative E2E suite.

## Scope
- Add reset request flow (UI + API) and reset confirmation flow.
- Add secure reset token generation, expiry, one-time use, and invalidation.
- Add deterministic test token capture strategy for E2E (test inbox/mock channel).
- Add E2E tests for valid reset, expired token, reused token, unknown email, and rate limits.

## TDD Process
1. Write failing E2E tests for reset request/confirm happy path.
2. Write failing negative token/rate-limit scenarios.
3. Implement minimal backend/UI flow and token lifecycle.
4. Refactor for security and deterministic tests.

## Stories
- As a user, I can recover access when I forget my password.
- As security, I can trust token and abuse controls.

## Acceptance Criteria
- Password reset happy path passes E2E.
- Negative token misuse and abuse-limit tests pass.
- No sensitive token leakage occurs in UI/logs.

## End-of-Sprint Verification
```bash
npm run test -- e2e password-reset
npm run lint
npm run build
```

Pass condition:
- All Sprint 26 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-27-feature-email-verification.md

# Sprint 27 — Feature: Email Verification + E2E

## Goal
Implement optional/common email verification lifecycle with robust E2E coverage.

## Scope
- Add verification token issue + confirm flow after registration.
- Add account state behavior for unverified/verified users.
- Add resend verification endpoint with rate limiting.
- Add E2E tests for verify success, expired link, resend, and unverified access restrictions.

## TDD Process
1. Write failing tests for verify-required registration behavior.
2. Write failing tests for verification link lifecycle and resend limits.
3. Implement feature minimally in auth/session and UI messaging.
4. Refactor and ensure compatibility with existing auth tests.

## Stories
- As a product owner, I can trust account email ownership before full access.
- As a user, I can recover from expired verification links.

## Acceptance Criteria
- Verification happy/negative paths pass E2E.
- Unverified behavior is explicit and deterministic.
- Resend flow is rate-limited and user-friendly.

## End-of-Sprint Verification
```bash
npm run test -- e2e email-verification
npm run lint
npm run build
```

Pass condition:
- All Sprint 27 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-28-feature-admin-invitations.md

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


---

# sprint-29-feature-account-registrations-history.md

# Sprint 29 — Feature: Account Registrations History + E2E

## Goal
Upgrade `/account` into a complete “My registrations” experience with privacy-safe E2E coverage.

## Scope
- Add account registrations list/history across events with current status.
- Ensure status updates reflect cancel/check-in lifecycle changes.
- Add clear empty/loading/error states using Problem Details patterns.
- Add privacy tests proving users cannot access other users’ registration data.

## TDD Process
1. Write failing tests for account history rendering and state updates.
2. Write failing privacy/authorization negative tests.
3. Implement account history UI + API integration.
4. Refactor selectors/helpers and stabilize data setup.

## Stories
- As a user, I can view my complete registration history.
- As a privacy reviewer, I can verify strict per-user data isolation.

## Acceptance Criteria
- Account history E2E tests pass for normal and empty datasets.
- Lifecycle state updates are visible without data leakage.
- Privacy negative tests pass.

## End-of-Sprint Verification
```bash
npm run test -- e2e account-registrations
npm run lint
npm run build
```

Pass condition:
- All Sprint 29 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-30-feature-event-discovery-search-calendar.md

# Sprint 30 — Feature: Event Discovery (Search/Filters/Calendar) + E2E

## Goal
Add richer event discovery quality features and verify them end-to-end.

## Scope
- Add public search/filter controls (title/location/tags as implemented scope).
- Persist filter state in URL and maintain stable pagination behavior.
- Add calendar export (ICS) download path if included in scope.
- Add E2E tests for search/filter/paging and timezone-correct calendar export.

## TDD Process
1. Write failing tests for search/filter/URL state + pagination stability.
2. Write failing tests for calendar export correctness (if implemented).
3. Implement minimal discovery enhancements in API + UI.
4. Refactor for performance and deterministic assertions.

## Stories
- As a visitor, I can find relevant events quickly.
- As a user, I can export events to calendar tools reliably.

## Acceptance Criteria
- Search/filter/pagination E2E tests pass.
- URL persistence behavior is covered and passing.
- ICS export tests pass when feature is enabled.

## End-of-Sprint Verification
```bash
npm run test -- e2e event-discovery
npm run lint
npm run build
```

Pass condition:
- All Sprint 30 tests and verification commands pass.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.


---

# sprint-31-feature-audit-log-ui.md

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


---

# sprint-32-feature-compliance-retention.md

# Sprint 32 — Feature: Compliance Basics (Terms/Privacy/Retention) + E2E

## Goal
Implement core compliance UX/API surfaces and validate them with E2E release checks.

## Scope
- Add Terms/Privacy routes and link integration in auth/account flows.
- Add registration acknowledgment checkbox flow if required.
- Implement baseline retention-aware account/data handling required by product scope.
- Add E2E tests for policy access, required acknowledgments, and retention/deletion constraints.
- Include final escalation-surface verification (no CLI-only dangerous operations exposed).

## TDD Process
1. Write failing tests for policy page availability and required acknowledgments.
2. Write failing retention/deletion and escalation-surface tests.
3. Implement minimal compliance features and UI affordances.
4. Refactor and run full release regression.

## Stories
- As a user, I can review product policies and consent where required.
- As release/compliance owner, I can validate baseline policy and retention behaviors.

## Acceptance Criteria
- Terms/Privacy and acknowledgment tests pass.
- Retention/deletion behaviors meet defined policy tests.
- Escalation-surface checks pass in final E2E gate.

## End-of-Sprint Verification
```bash
npm run test -- e2e compliance release
npm run lint
npm run build
```

Pass condition:
- All Sprint 32 tests and verification commands pass.
- UI+API E2E backlog from Letter 4 is fully planned and implementable.

## Exit Gate
Move sprint only when all acceptance criteria and verification pass.

