# Studio Ordo Platform

>[!NOTE]
> **Owner:** Keith Williams — Founder, Studio Ordo · Senior Lecturer, NJIT Center for Enterprise AI
> **Started:** 2025 · **Last updated:** February 25, 2026

The Studio Ordo platform is the operational backbone of [Studio Ordo](https://studioordo.com) — a training and consulting studio that teaches engineers to govern AI in software delivery. This repository contains the full-stack web application, admin CLI, AI intake agent, MCP server, and all associated infrastructure.

---

## What This Is

| Layer | Description |
|-------|-------------|
| **Web app** | Public-facing Next.js site with training pages, events, registration, studio content, and the AI intake chat |
| **Admin console** | Full internal dashboard for user/role/event/engagement/CRM management |
| **CLI (`appctl`)** | Production-grade control plane for DB lifecycle, tokens, users, jobs, and ops |
| **AI intake agent** | Conversational qualification agent (Claude-backed, SSE streaming, multimodal) on the homepage |
| **MCP server** | Model Context Protocol server for AI-assisted admin operations |
| **Evals harness** | Automated evaluation suite for agent correctness (triage, workflow, intake) |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict) |
| Web framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Radix UI |
| AI / LLM | Anthropic Claude (`@anthropic-ai/sdk`), OpenAI (`openai`) |
| Database | SQLite via `better-sqlite3` |
| Payments | Stripe |
| Auth | Argon2 password hashing, session tokens |
| CLI | Commander + Zod + cosmiconfig |
| Logging | Pino |
| Testing | Vitest (unit), Playwright (E2E), custom eval harness |
| Storage | AWS S3 (`@aws-sdk/client-s3`) |
| Forms | React Hook Form + Zod |
| Dates | date-fns, react-day-picker |

---

## Installation

**Prerequisites:** Node.js 20+, npm 10+

```bash
# 1. Clone and install
git clone <repo-url>
cd lms_219
npm install

# 2. Bootstrap the local database
npm run cli -- db migrate --env local
npm run cli -- db seed --env local

# 3. Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_PATH=./data/local.db
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Available Scripts

```bash
# Development
npm run dev                  # Next.js dev server (localhost:3000)
npm run build                # Production build
npm run start                # Production server

# Quality
npm test                     # Vitest unit + integration tests (run once)
npm run test:watch           # Vitest in watch mode
npm run lint                 # ESLint
npm run lint:ui-guardrails   # UI token compliance check

# E2E
npm run test:e2e             # Playwright E2E suite
npm run test:e2e:headed      # Playwright with browser visible

# Performance
npm run test:lighthouse      # Lighthouse CI against local server
npm run test:bundle          # Bundle size gate check

# AI Evals
npm run evals                # Full eval suite (triage + workflow + intake)
npm run evals:triage         # Triage evals only
npm run evals:workflow       # Workflow routing evals only
npm run evals:intake         # Intake agent evals only

# CLI
npm run cli -- --help        # Full CLI reference
npm run mcp                  # Start the MCP server

# Data
npm run seed:localhost        # Seed realistic content for localhost
```

---

## CLI Quick Reference

```bash
# Health check
npm run cli -- doctor --env local --json

# Database
npm run cli -- db migrate --env local
npm run cli -- db seed --env local
npm run cli -- db backup --env local
npm run cli -- db restore --env local --file <path>

# Users & tokens
npm run cli -- auth token create --name bootstrap --env local --json
npm run cli -- user create --email admin@example.com --status ACTIVE --env local

# Jobs
npm run cli -- jobs run conversation-sweep --env local

# Events
npm run cli -- event list --env local
npm run cli -- event create --env local
```

**Global CLI flags:** `--env <local|staging|prod>` · `--json` · `--token <token>` · `--yes` · `--trace`

---

## Repository Structure

```
src/
  app/                   Next.js App Router (public + admin + API routes)
    (public)/            Public pages: home, training, events, studio, apply
    (admin)/admin/       Internal dashboard
    api/v1/              REST API + SSE agent chat endpoint
  components/            Shared UI components
    chat/                AI intake chat widget (multimodal, SSE streaming)
    ui/                  shadcn/ui base components
  lib/
    api/                 Domain logic: auth, events, conversations, CRM, workflows
    llm-anthropic.ts     Claude agent loop with multimodal support
  cli/                   appctl CLI commands
  mcp/                   MCP server
  evals/                 AI evaluation harness
  platform/              Runtime, DB access, job scheduler
business/
  studio-ordo/           Brand, messaging, personas, pricing, ops docs
docs/                    Architecture, design system, runbooks, audits
project_management/
  sprints/               Sprint artifacts (completed, active, planning)
  reviews/               Sprint review notes
  letters/               Decision/context letters (letter1–6)
  master-plan-*.md       Master planning documents
e2e/                     Playwright E2E test specs
scripts/                 Build tools, Lighthouse CI, bundle checks
```

---

## AI Intake Agent

The homepage (`/`) is a full-screen conversational intake agent (no static marketing copy). The agent:

- Runs on Claude via `/api/v1/agent/chat` with SSE streaming
- Accepts text + image attachments + PDF (multimodal)
- Qualifies prospects across: goal, role, timeline, fit
- Recognises Keith Williams as the founder (skips intake form)
- Calls tools: `content_search`, `submit_intake`, `get_available_slots`, `create_booking`
- Stores conversation history in SQLite (`intake_conversations`)

**System prompt:** [`src/lib/api/agent-system-prompt.ts`](src/lib/api/agent-system-prompt.ts)
**Agent loop:** [`src/lib/llm-anthropic.ts`](src/lib/llm-anthropic.ts)
**Chat route:** [`src/app/api/v1/agent/chat/route.ts`](src/app/api/v1/agent/chat/route.ts)
**Widget:** [`src/components/chat/chat-widget.tsx`](src/components/chat/chat-widget.tsx)

---

## Test Baseline

| Suite | Status |
|-------|--------|
| Unit / integration (Vitest) | **1547 / 1548** passing (1 pre-existing unrelated) |
| AI evals | **13 / 13** passing |
| E2E (Playwright) | Core flows green |

Run the full check:

```bash
npm test && npm run evals
```

---

## Project Management

### Sprint Tracks

This project uses multiple named sprint tracks, each with a distinct focus:

| Track | Prefix | Description |
|-------|--------|-------------|
| Core numerical | `sprint-NN-` | Main feature and infrastructure sprints (1–67+) |
| TDD architecture | `sprint-tdd-NN-` | Test-driven architecture refactors (1–16) |
| IP / Content | `sprint-ip-NN-` | Frameworks, profiles, newsletter, lead magnets |
| Krug UX | `sprint-krug-NN-` | Usability & navigation passes (Steve Krug methodology) |
| Marketing | `sprint-mkt-NN-` | Public page clarity, proof artifacts, conversion |
| Ops | `sprint-ops-NN-` | Operating model, agent proposals, MCP ingestion |
| Production | `sprint-prd-NN-` | Email, logging, security, CI/CD, accessibility |
| System | `sprint-sys-NN-` | Seed data, apprentice paths, community flywheel |
| Maestro (active) | `sprint-maestro-NN-` | AI agent, chat UI, marketing intelligence |

### Sprint Folders

| Location | Contents |
|----------|----------|
| [`project_management/sprints/completed/`](project_management/sprints/completed/) | All completed sprint documents |
| [`project_management/sprints/active/`](project_management/sprints/active/) | Currently in-flight sprint(s) |
| [`project_management/sprints/planning/`](project_management/sprints/planning/) | Upcoming sprints + sprint map |
| [`project_management/sprints/planning/00-sprint-map.md`](project_management/sprints/planning/00-sprint-map.md) | Dependency-ordered execution map |

### Active Sprint Series: Maestro

| Sprint | Focus | Status |
|--------|-------|--------|
| Maestro-00b | Governance rails, DB role seeding | ✅ Complete |
| Maestro-00 Discovery | Agent context enrichment, conversation sweep, homepage CTA wiring | ✅ Complete |
| Maestro-01 Ops Agent | Admin chat UI | Planning |
| Maestro-02 Admin Chat UI | — | Planning |
| Maestro-03 Marketing Intelligence | — | Planning |

### Context Letters

Decision and context letters written to the project:

| Letter | Topic |
|--------|-------|
| [`project_management/letter1.md`](project_management/letter1.md) | Initial context |
| [`project_management/letter2.md`](project_management/letter2.md) | — |
| [`project_management/letter3.md`](project_management/letter3.md) | — |
| [`project_management/letter4.md`](project_management/letter4.md) | — |
| [`project_management/letter5.md`](project_management/letter5.md) | — |
| [`project_management/letter.6.md`](project_management/letter.6.md) | — |
| [`project_management/master-plan-role-approvals.md`](project_management/master-plan-role-approvals.md) | Role approval architecture |

---

## Key Documentation

### Architecture & Engineering

| Document | Description |
|----------|-------------|
| [`docs/architecture-map.md`](docs/architecture-map.md) | Full system architecture map |
| [`docs/frontend-architecture.md`](docs/frontend-architecture.md) | Frontend structure, routing, component conventions |
| [`docs/cli-architecture.md`](docs/cli-architecture.md) | CLI design and contributor notes |
| [`docs/cli-manual.md`](docs/cli-manual.md) | Full CLI reference manual |
| [`docs/feature-flags.md`](docs/feature-flags.md) | Feature flag system |
| [`docs/mcp-ingestion-contract.md`](docs/mcp-ingestion-contract.md) | MCP server contracts |

### Design & UX

| Document | Description |
|----------|-------------|
| [`docs/design-system.md`](docs/design-system.md) | Token system, typography, component library |
| [`docs/swiss-bauhaus-ui-spec.md`](docs/swiss-bauhaus-ui-spec.md) | Visual design philosophy (Swiss/Bauhaus grid system) |
| [`docs/icon-map.md`](docs/icon-map.md) | Icon reference |
| [`docs/frontend-pr-checklist.md`](docs/frontend-pr-checklist.md) | Pre-merge UI checklist |

### Operations & Quality

| Document | Description |
|----------|-------------|
| [`docs/operator-handbook.md`](docs/operator-handbook.md) | Day-to-day operating procedures |
| [`docs/release-checklist.md`](docs/release-checklist.md) | Production release process |
| [`docs/rollback-playbook.md`](docs/rollback-playbook.md) | Rollback procedures |
| [`docs/lighthouse-regression-policy.md`](docs/lighthouse-regression-policy.md) | Lighthouse budget policy |
| [`docs/lighthouse-release-gate-runbook.md`](docs/lighthouse-release-gate-runbook.md) | Release gate runbook |
| [`docs/real-workflow-verification.md`](docs/real-workflow-verification.md) | Workflow verification protocol |

### Audits & Research

| Document | Description |
|----------|-------------|
| [`docs/information-architecture-audit.md`](docs/information-architecture-audit.md) | IA audit |
| [`docs/dual-lens-admin-user-ux-audit.md`](docs/dual-lens-admin-user-ux-audit.md) | Admin/user dual-lens UX audit |
| [`docs/krug-ia-ui-audit-2026-02-23.md`](docs/krug-ia-ui-audit-2026-02-23.md) | Krug usability audit (Feb 2026) |
| [`docs/usability-seo-navigation-audit.md`](docs/usability-seo-navigation-audit.md) | Usability + SEO audit |
| [`docs/operating-model-humans-agents-2026-02-23.md`](docs/operating-model-humans-agents-2026-02-23.md) | Human + AI operating model |

### Business

| Document | Description |
|----------|-------------|
| [`business/studio-ordo/one-page-brand-sheet.md`](business/studio-ordo/one-page-brand-sheet.md) | Brand at-a-glance |
| [`business/studio-ordo/messaging-guide.md`](business/studio-ordo/messaging-guide.md) | Copy, CTAs, objection handling |
| [`business/studio-ordo/personas.md`](business/studio-ordo/personas.md) | Target audience personas |
| [`business/studio-ordo/voice-tone.md`](business/studio-ordo/voice-tone.md) | Voice and tone guide |
| [`business/studio-ordo/maestro/keith-williams-profile.md`](business/studio-ordo/maestro/keith-williams-profile.md) | Founder profile (bio, credentials, proof) |
| [`business/studio-ordo/handbook.md`](business/studio-ordo/handbook.md) | Studio operations handbook |

---

## Development Conventions

- **One failing test ceiling:** the pre-existing `db-core` seed count test is the only allowed red. All new work must ship green.
- **UI tokens only:** no hardcoded hex values in components — use `text-text-primary`, `bg-surface`, `border-border`, etc.
- **Type safety:** no `any` without a comment justification.
- **Agent changes:** update `src/lib/api/agent-system-prompt.ts` + restart the dev server (prompt is imported at module load time, not hot-reloaded).
- **Evals:** any change to agent tools, system prompt, or routing logic must keep `npm run evals` green.
- **PR checklist:** [`docs/frontend-pr-checklist.md`](docs/frontend-pr-checklist.md)

