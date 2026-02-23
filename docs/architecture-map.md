# Architecture Map

> Source of truth for the codebase layer structure and dependency rules.
> Enforced by `src/__tests__/architecture-boundaries.test.ts` and ESLint (`no-restricted-imports`).

## Layers

```
┌─────────────────────────────────────────────────────────┐
│                    DELIVERY (outermost)                  │
│  src/app/    — Next.js route handlers & pages           │
│  src/cli/    — CLI commands (Commander)                  │
│  src/lib/    — Web business logic, API helpers, UI libs  │
│  src/components/ — Shared React components              │
├─────────────────────────────────────────────────────────┤
│                       ADAPTERS                           │
│  src/adapters/sqlite/  — SQLite repository impls         │
│  src/adapters/stripe/  — Stripe payment gateway adapter  │
│  src/adapters/discord/ — Discord client adapter          │
├─────────────────────────────────────────────────────────┤
│                       PLATFORM                           │
│  src/platform/types.ts    — AppConfig, RuntimeEnv, etc.  │
│  src/platform/config.ts   — Config resolution            │
│  src/platform/db.ts       — openDb (SQLite connection)   │
│  src/platform/audit.ts    — Audit log helpers            │
│  src/platform/date-time.ts— Core date parsing            │
│  src/platform/runtime.ts  — Convenience barrel           │
├─────────────────────────────────────────────────────────┤
│                    CORE (innermost)                       │
│  src/core/domain/        — Entities, errors, value objs  │
│  src/core/ports/         — Repository & service ports    │
│  src/core/use-cases/     — Application services          │
│  src/core/infrastructure/decorators/ — Audit decorators  │
└─────────────────────────────────────────────────────────┘
```

## Dependency Rule

Dependencies **point inward**. An inner layer must never import from an outer layer.

| Source layer | May import from                      | Must NOT import from         |
|-------------|--------------------------------------|------------------------------|
| **core/**    | `platform/`, `core/` (self)          | `adapters/`, `delivery/`     |
| **platform/** | `platform/` (self), npm, node:      | `adapters/`, `delivery/`     |
| **adapters/** | `core/`, `platform/`, npm, node:    | `delivery/`                  |
| **delivery/** | everything (outermost ring)          | *(no restriction)*           |

## Key Symbols & Canonical Locations

| Symbol | Canonical module | Re-exported from (backward compat) |
|--------|------------------|-------------------------------------|
| `AppConfig`, `RuntimeEnv`, `DbConfig` | `@/platform/types` | `@/cli/types` |
| `resolveConfig`, `loadConfigFromDisk` | `@/platform/config` | `@/cli/config` (CLI adds flag overrides) |
| `openDb` / `openCliDb` | `@/platform/db` | `@/platform/runtime` |
| `appendAuditLog`, `appendServiceAudit` | `@/platform/audit` | `@/platform/runtime` |
| `parseISO`, `nowISO`, `isValidISO` | `@/platform/date-time` | `@/lib/date-time` |
| `SqliteEventRepository`, etc. | `@/adapters/sqlite/repositories` | *(old location removed)* |
| `SqliteAuditSink` | `@/adapters/sqlite/audit-sink` | *(old location removed)* |

## Enforcement

1. **Vitest boundary test** — `src/__tests__/architecture-boundaries.test.ts`
   Scans source files at test time and fails if any import violates the layer rules.

2. **ESLint `no-restricted-imports`** — `eslint.config.mjs`
   IDE-level + CI-level enforcement for `core/`, `platform/`, and `adapters/` files.

## Adding New Files

- **Pure business logic / domain types** → `src/core/`
- **Shared runtime services (config, db, time, ids)** → `src/platform/`
- **Concrete implementations of ports (SQLite, Stripe, email)** → `src/adapters/`
- **CLI commands** → `src/cli/`
- **HTTP routes, Next.js pages, React components** → `src/app/`, `src/lib/`, `src/components/`
