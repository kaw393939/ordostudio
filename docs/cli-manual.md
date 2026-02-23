# appctl CLI Manual

## 1. Overview

`appctl` is the operational control plane for this project. It provides auditable, repeatable commands for:

- database lifecycle
- service token security
- user and role administration
- event lifecycle
- registration/check-in/export operations

All mutating commands are designed to write audit records.

## 2. Prerequisites

- Node.js 20+
- Dependencies installed (`npm install`)

Run CLI:

```bash
npm run cli -- --help
```

## 3. Configuration

Configuration precedence:

1. CLI flags
2. environment variables
3. config file
4. defaults

Primary env var:

- `APPCTL_DB_FILE` — SQLite database path

Examples:

```bash
APPCTL_DB_FILE=./data/app.db npm run cli -- db status --env local
```

## 4. Global Flags

- `--env <local|staging|prod>`
- `--json`
- `--token <token>`
- `--yes`
- `--trace`
- `--quiet`

## 5. Command Reference

### 5.1 Health and DB

```bash
npm run cli -- doctor --env local --json
npm run cli -- db status --env local
npm run cli -- db migrate --env local
npm run cli -- db seed --env local
npm run cli -- db backup --out ./tmp/backup.db --env local
npm run cli -- db restore --from ./tmp/backup.db --env local --yes
```

### 5.2 Tokens

```bash
npm run cli -- auth token create --name ops-token --env local --json
npm run cli -- auth token revoke --id <TOKEN_ID> --env local
```

### 5.3 Users and Roles

```bash
npm run cli -- user create --email admin@example.com --status ACTIVE --env local
npm run cli -- user list --env local --json
npm run cli -- user show --email admin@example.com --env local --json
npm run cli -- user disable --id <USER_ID> --reason "security" --env local
npm run cli -- user enable --id <USER_ID> --env local
npm run cli -- user role add --id <USER_ID> --role ADMIN --env local
npm run cli -- user role remove --id <USER_ID> --role ADMIN --env local
```

### 5.4 Events

```bash
npm run cli -- event create --slug spring-launch --title "Spring Launch" --start 2026-04-01T14:00:00Z --end 2026-04-01T15:00:00Z --tz UTC --capacity 100 --env local
npm run cli -- event update --slug spring-launch --title "Spring Launch v2" --env local
npm run cli -- event publish --slug spring-launch --env local
npm run cli -- event cancel --slug spring-launch --reason "operational" --env local
npm run cli -- event list --status CANCELLED --env local --json
```

### 5.5 Registrations and Export

```bash
npm run cli -- reg add --event spring-launch --user admin@example.com --env local
npm run cli -- reg remove --event spring-launch --user admin@example.com --reason "requested" --env local
npm run cli -- reg list --event spring-launch --env local --json
npm run cli -- checkin --event spring-launch --user admin@example.com --env local
npm run cli -- event export --slug spring-launch --format csv --out ./tmp/spring-launch.csv --env local
npm run cli -- event export --slug spring-launch --format json --out ./tmp/spring-launch.json --env local
```

## 6. Security and Safety Rails

### 6.1 Staging/Prod write protection

Write commands in `staging`/`prod` require a valid token:

```bash
npm run cli -- user create --email x@example.com --env staging --token <TOKEN>
```

### 6.2 PII export control

`--include-email` outside local requires token:

```bash
npm run cli -- event export --slug spring-launch --format json --out ./tmp/secure.json --include-email --env staging --token <TOKEN>
```

### 6.3 Dangerous prod DB operations

For `db backup` / `db restore` in `prod`, all are required:

- `--force-prod`
- `--yes`
- valid `--token`

Example:

```bash
npm run cli -- db backup --out ./tmp/prod-backup.db --env prod --force-prod --yes --token <TOKEN>
```

## 7. Exit Code Guide

- `0` success
- `1` unexpected/internal error
- `2` usage or validation error
- `3` auth/permission error
- `4` not found
- `5` conflict/already exists
- `6` precondition failed

## 8. Recommended Local Bootstrap Flow

```bash
npm run cli -- db migrate --env local
npm run cli -- db seed --env local
npm run cli -- auth token create --name local-admin --env local --json
npm run cli -- user create --email admin@example.com --status ACTIVE --env local
```

## 9. Verification Commands

Core validation:

```bash
npm test
npm run lint
npm run build
npm run cli -- doctor --env local --json
```

Manual round-trip backup/restore:

```bash
npm run cli -- db backup --out ./tmp/backup.db --env local
npm run cli -- db restore --from ./tmp/backup.db --env local --yes
```

## 10. CLI Architecture (Contributor Notes)

The CLI follows a layered structure to keep business logic separate from persistence and delivery concerns.

Detailed architecture guide:

- [docs/cli-architecture.md](docs/cli-architecture.md)

### 10.1 Layering

1. **Delivery layer** — `src/cli/run-cli.ts`
   - Parses commands/flags
   - Resolves runtime config
   - Formats JSON/text output
   - Calls use-case functions only

2. **Use-case layer** — `src/cli/auth-users.ts`, `src/cli/events.ts`, `src/cli/registrations.ts`
   - Performs input validation and orchestration
   - Enforces auth/schema preconditions
   - Maps domain/repository errors to CLI errors/exit codes
   - Composes dependencies through shared factory helpers

3. **Core business layer** — `src/core/use-cases/*` + `src/core/ports/repositories.ts`
   - Owns business rules and contracts
   - Independent of CLI/HTTP transport details

4. **Infrastructure layer** — `src/core/infrastructure/sqlite/*` + `src/core/infrastructure/decorators/*`
   - Implements persistence adapters
   - Applies cross-cutting audit through decorators

5. **CLI repository modules** — `src/cli/*-repository.ts`
   - Focused query/mutation helpers for CLI-specific flows
   - Split by concern (`user-read`, `user-status`, `user-roles`, `service-token`, etc.)

6. **Shared composition utilities**
   - `src/cli/audited-repository-factories.ts` — audited repository construction helpers
   - `src/cli/audit.ts` — shared audit facade for orchestration-level audit events
   - `@/platform/db` — common DB open (shared via platform layer)

7. **Cross-cutting helpers**
   - `src/cli/write-auth.ts` — shared write auth enforcement for non-local envs
   - `src/cli/schema-guard.ts` — shared migration precondition guard

### 10.2 Rules for New CLI Work

- Put command parsing and output formatting in `run-cli.ts` only.
- Put business flow/validation in use-case modules.
- Put SQL/transactions in focused repository modules.
- Prefer typed errors over message-string branching.
- Prefer decorator/facade-based audit wiring over inline sink construction.

This structure keeps commands testable, makes persistence swappable, and reduces duplication across CLI surfaces.
