# LMS 219 — Super Admin Control Plane

This repository contains:

- A Next.js application shell (`src/app`) for future UI work.
- A production-oriented CLI control plane (`appctl`) for admin/super-admin operations.

The CLI is the operational source of truth and currently supports:

- DB lifecycle: `status`, `migrate`, `seed`, `backup`, `restore`, `doctor`
- Service token management: create/revoke
- User and role management
- Event lifecycle management
- Registration, check-in, and event export workflows

## Tech Stack

- Runtime: Node.js 20+
- Language: TypeScript
- Web: Next.js 16
- CLI: Commander + Zod + cosmiconfig
- Data: SQLite (`better-sqlite3`)
- Logging: Pino
- Testing: Vitest

## Quick Start

Install dependencies:

```bash
npm install
```

Run quality checks:

```bash
npm test
npm run lint
npm run build
```

Run the web app:

```bash
npm run dev
```

Run the CLI:

```bash
npm run cli -- --help
```

## CLI Basics

Common examples:

```bash
# Health
npm run cli -- doctor --env local --json

# DB setup
npm run cli -- db migrate --env local
npm run cli -- db seed --env local

# Create token + user
npm run cli -- auth token create --name bootstrap --env local --json
npm run cli -- user create --email admin@example.com --status ACTIVE --env local
```

Global flags:

- `--env <local|staging|prod>`
- `--json`
- `--token <token>`
- `--yes`
- `--trace`

## Documentation

Detailed manual:

- [docs/cli-manual.md](docs/cli-manual.md)
- [CLI Architecture (Contributor Notes)](docs/cli-manual.md#10-cli-architecture-contributor-notes)
- [CLI Architecture Guide](docs/cli-architecture.md)

Project planning and sprint artifacts:

- [project_management/sprints/completed](project_management/sprints/completed)

## Current Status

All planned implementation sprints (1–6) are completed and manually verified through CLI-driven signoff.

