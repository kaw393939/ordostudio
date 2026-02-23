CLI Spec v0.1 — “Super Admin Control Plane”
1) Purpose
Why this exists
A repo-shipped CLI that provides repeatable, auditable, safe operations for:
DB lifecycle (migrate/seed/health/backup/restore)
Super-admin user/role operations (create/disable/promote)
Event lifecycle (create/publish/cancel)
Registration operations (add/check-in/export)
Strategic intent
Phase 1: CLI is the source of truth for “admin control plane” operations.
Phase 2: Build API endpoints that call the same domain services.
Phase 3: Build web UI + admin UI on top of those endpoints.
The CLI remains the only place for super-admin and dangerous ops.
2) Core principles and invariants
Invariants
No duplicated business logic: CLI calls the same domain service layer that API routes will call later.
Audit required: Every state-changing command emits an AuditLog record. If audit write fails, the command fails (fail-closed).
Idempotent by default: re-running migrate, seed, role add, publish should not produce duplicates or corruption.
Safety rails for production: dangerous commands require explicit flags + super-admin token.
Scope boundaries (v0.1)
Included:
DB: status/migrate/seed/backup/restore/doctor
Auth support: service token create/revoke (for CLI super-admin auth)
Users: create/list/show/disable/enable/role add/remove
Events: create/update/publish/cancel/list
Registrations: add/remove/list/checkin/export
Not included (future):
Email sending, notifications, payment, invitations, OAuth provider configuration, multi-tenant, multi-instance scaling.
3) Runtime + dependencies
Runtime
Node 20+
TypeScript
Recommended libraries (implementation guidance)
CLI framework: Commander
Validation: Zod
Config loading: cosmiconfig
Logging (structured): Pino
ORM + migrations: Drizzle ORM + drizzle-kit
SQLite driver (single-node prod): better-sqlite3
(Optional migration path: libSQL)
Auth integration later can be via Auth.js, but v0.1 CLI auth is token-based (below).
4) Environments and config
Environments
local, staging, prod
Config precedence
CLI flags → 2) env vars → 3) config file → 4) defaults
Config file
.appctlrc (JSON/YAML) or appctl.config.json
Minimum config fields:
env: default env
db:
mode: sqlite
file: absolute or repo-relative path (prod must be explicit)
busyTimeoutMs: default 5000–10000
security:
requireTokenInStaging: true
requireTokenInProd: true
dangerousOpsRequireExplicitProd: true
audit:
strict: true (fail if audit insert fails)
output:
defaultFormat: text | json
5) SQLite production operating profile (v0.1 requirement)
When env=prod, the CLI (and app runtime) must enforce/verify:
WAL mode enabled
foreign keys enabled
busy timeout set
journaling + sync policy set for production (documented)
DB file location is persistent (not in ephemeral deploy dir)
single-instance assumption: one app process is the writer
Required CLI checks
doctor must validate:
DB reachable
schema up to date
WAL + foreign keys active
file path resolves to expected location
ability to write (permissions)
Required CLI operations
db backup must use a safe backup method (not a naive random file copy)
db restore is local/staging only by default; production restore requires explicit override + token
6) Security model (super-admin stays CLI-only)
Super-admin authentication
Privileged commands require a service token:
Provided via CLI_ADMIN_TOKEN env var (or --token)
Token stored hashed in DB (never plaintext at rest)
Token shown once upon creation
Tokens can be revoked
Role model
USER
ADMIN
SUPER_ADMIN (optional in UI later, but enforced in CLI now)
Rule:
UI-admin features eventually map to ADMIN.
CLI-only dangerous ops require SUPER_ADMIN token.
7) Data model (minimum viable tables)
v0.1 tables:
User: id, email (unique), status (ACTIVE/DISABLED/PENDING), created_at, updated_at
Role: id, name (USER/ADMIN/SUPER_ADMIN)
UserRole: user_id, role_id, unique(user_id, role_id)
ServiceToken: id, name, token_hash, created_at, revoked_at, last_used_at
Event: id, slug (unique), title, start_at, end_at, timezone, status (DRAFT/PUBLISHED/CANCELLED), capacity nullable, created_by nullable, created_at/updated_at
EventRegistration: id, event_id, user_id, status (REGISTERED/WAITLISTED/CANCELLED/CHECKED_IN), unique(event_id, user_id)
AuditLog: id, actor_type, actor_id nullable, action, target_type, target_id, metadata json, created_at, request_id
Notes:
Auth provider/session tables can be added later without breaking this core.
8) CLI interface contract
Binary name
appctl (placeholder)
Global flags
--env <local|staging|prod>
--json
--quiet
--no-color
--trace
--dry-run
--yes
--token <token> (overrides env var)
Exit codes
0 success
2 validation/usage error
3 auth/permission error
4 not found
5 conflict/already exists
6 precondition failed (e.g., migrations not run)
1 other error
Output rules
default: human readable (tables, one-line summaries)
--json: strict JSON object with:
ok, command, env, data, warnings[], errors[], request_id
9) Command set v0.1
9.1 Bootstrap / health
appctl init
creates config scaffold (non-destructive)
appctl doctor
verifies config, DB reachability, schema current, SQLite pragmas, permissions
9.2 Database lifecycle
appctl db status
shows current migration + pending count
appctl db migrate
applies migrations (idempotent), audit db.migrate
appctl db seed [--fixture <name>]
seeds roles + optional initial admin user, audit db.seed
appctl db backup --out <file>
produces consistent backup artifact, audit db.backup
appctl db restore --from <file>
local/staging only unless --env prod --force-prod + token, audit db.restore
CLI-only dangerous (optional v0.1):
appctl db reset
local only by default; requires --yes
9.3 Super-admin tokens (CLI-only)
appctl auth token create --name <label> [--ttl-days <n>]
prints token once; stores hash; audit auth.token.create
appctl auth token revoke --id <tokenId>
audit auth.token.revoke
9.4 Users (admin & super-admin)
appctl user create --email <email> [--status <PENDING|ACTIVE>]
audit user.create
appctl user list [--role <ROLE>] [--status <STATUS>] [--search <q>]
appctl user show --id <id> | --email <email>
appctl user disable --id <id> [--reason <text>]
audit user.disable
appctl user enable --id <id>
audit user.enable
appctl user role add --id <id> --role <ROLE>
audit user.role.add
appctl user role remove --id <id> --role <ROLE>
audit user.role.remove
9.5 Events (admin)
appctl event create --slug <slug> --title <title> --start <iso> --end <iso> --tz <IANA> [--capacity <n>]
creates DRAFT; audit event.create
appctl event update --slug <slug> [--title ...] [--start ...] [--end ...] [--capacity ...]
audit event.update
appctl event publish --slug <slug>
audit event.publish
appctl event cancel --slug <slug> --reason <text>
audit event.cancel
appctl event list [--status <...>] [--from <date>] [--to <date>]
9.6 Registrations (admin)
appctl reg add --event <slug> --user <email|id>
respects capacity; if full → WAITLISTED; audit registration.add
appctl reg remove --event <slug> --user <email|id> [--reason <text>]
sets status CANCELLED (no hard delete); audit registration.cancel
appctl reg list --event <slug> [--status <...>]
appctl checkin --event <slug> --user <email|id>
sets CHECKED_IN; audit registration.checkin
appctl event export --slug <slug> --format <csv|json> --out <file> [--include-email]
--include-email requires token outside local; audit event.export
10) Service layer contract (the “future UI bridge”)
The CLI must call domain services with stable interfaces (names illustrative):
DbService (migrate/seed/status/backup/restore)
UserService (create/disable/enable/assignRole)
EventService (create/update/publish/cancel/list)
RegistrationService (add/cancel/list/checkin/export)
AuditService (append + query later)
Phase 2+ requirement: API routes must call these same services. The UI never talks to DB directly.
11) Safety rails and permissions matrix
Default permission rules
In local: read commands allowed without token; write commands allowed without token (configurable)
In staging/prod: any write command requires token
Dangerous ops in prod require: token + --force-prod + --yes
Redaction rules
In staging/prod without token: never print PII (emails), never export PII
With token: PII allowed only when explicitly requested (e.g., --include-email)
12) Test and acceptance criteria (v0.1 “done means”)
Required automated checks:
Command help snapshots (stable CLI UX)
db seed idempotency test
event publish is idempotent and audited
capacity rule: when full → WAITLISTED
audit fail-closed: if audit insert fails, command fails and DB mutation is rolled back
doctor detects incorrect SQLite pragmas and schema mismatch
Operational checks:
backup/restore round-trip in CI (local env)
migration forward-only discipline enforced
13) Roadmap alignment (how v0.1 evolves)
v0.2–v0.3
Add “admin API endpoints” mirroring CLI operations (minus dangerous ops)
Add web admin UI pages for events/registrations/users
CLI stays “super-admin only” for:
token creation/revoke
DB backup/restore/reset
role elevation to SUPER_ADMIN
emergency disable users / emergency cancel event
v1.0
Formalize permissions, rate-limits, audit query UI, export governance, and data migration utilities to Postgres