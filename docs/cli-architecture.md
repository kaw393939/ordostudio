# CLI Architecture Guide

This document describes the current `appctl` architecture after the cleanup/refactor passes and defines conventions for new development.

## Layered Structure

1. **Delivery layer** — `src/cli/run-cli.ts`
   - Parses command-line arguments and flags.
   - Builds runtime config.
   - Formats output (JSON/text) and maps thrown errors to exit codes.
   - Delegates business operations to CLI use-case modules.

2. **CLI use-case orchestration layer**
   - `src/cli/auth-users.ts`
   - `src/cli/events.ts`
   - `src/cli/registrations.ts`
   - Responsibilities:
     - Enforce preconditions (`schema-guard`, `write-auth`).
     - Compose use-case dependencies.
     - Translate domain errors to CLI errors.
     - Coordinate non-domain side effects (for example export file writing).

3. **Core use-case + ports layer**
   - Use-cases under `src/core/use-cases/*`
   - Interfaces under `src/core/ports/repositories.ts`
   - Responsibilities:
     - Business rules independent of CLI/HTTP/DB details.

4. **Infrastructure layer**
   - SQLite adapters under `src/core/infrastructure/sqlite/*`
   - Audit decorators under `src/core/infrastructure/decorators/*`
   - Responsibilities:
     - Implement repository ports.
     - Apply cross-cutting concerns (audit) without embedding them in business logic.

5. **CLI repository query/mutation modules**
   - `src/cli/events-repository.ts`
   - `src/cli/registrations-repository.ts`
   - `src/cli/user-read-repository.ts`
   - `src/cli/service-token-repository.ts`
   - Responsibilities:
     - Focused persistence concerns by capability.
     - SQL-level reads/writes used by CLI orchestration where no core use-case exists.

## Shared CLI Composition Helpers

- `src/cli/audit.ts`
  - Shared CLI audit recording facade (`recordAudit`, `recordSystemAudit`).
- `src/cli/audited-repository-factories.ts`
  - Centralized constructors for audited user/event/registration repositories.
  - Provides `createRegistrationUseCaseDeps` for registration-related use-cases.

## Error Handling Rules

- Use typed domain errors (`InvalidInputError`, `EventNotFoundError`, etc.).
- Map errors at orchestration boundaries to CLI error helpers (`usageError`, `notFoundError`, `conflictError`, `preconditionError`).
- Avoid message-string branching (for example, `error.message === "..."`).

## Audit Rules

- Prefer decorator-based audit for repository mutations in core-backed flows.
- Use `src/cli/audit.ts` for explicit orchestration-level events (for example idempotent publish markers, export events).
- Keep direct `SqliteAuditSink` construction out of feature modules where possible.

## Extension Checklist (New Feature)

1. Add/extend a core use-case if the behavior is business logic.
2. Add/extend a repository port only if needed by business rules.
3. Implement adapter behavior in infrastructure, optionally wrapped by audit decorators.
4. Keep CLI modules thin: validate inputs, call use-case, map errors.
5. Add focused tests first (unit/use-case), then CLI/API regression slices.

## Readiness Signals

A change is considered architecture-safe when:

- There is no duplicated repository construction in feature modules.
- There are no message-string error checks in CLI orchestration.
- Cross-cutting audit is centralized via decorators/facades.
- Focused CLI and API regression tests pass.
