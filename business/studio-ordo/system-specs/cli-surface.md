# CLI + MCP Surfaces

**Owner:** Keith Williams · **Last updated:** 2026-02-22

---

## CLI (appctl)

### Entry

- `npm run cli -- <command> [flags]`

Canonical docs:

- `docs/cli-manual.md`
- `docs/cli-architecture.md`

### Global flags

From `src/cli/run-cli.ts` and CLI manual:

- `--env <local|staging|prod>`
- `--json`
- `--token <token>`
- `--yes`
- `--trace`
- `--quiet`
- `--dry-run`

### Command families (high-level)

- `doctor`
- `db status|migrate|seed|backup|restore`
- `auth token create|revoke`
- `user create|list|show|enable|disable|role add|role remove`
- `event create|update|publish|cancel|list|export`
- `reg add|remove|list`
- `checkin`
- `newsletter dispatch-due`
- `jobs stats|process-once|process-poll|retry-dead|purge-completed`

---

## Safety rails

The CLI is intended as an operator surface with hard safety rails:

- Staging/prod write protection via service tokens
- Dangerous prod DB operations require explicit confirmation + flags
- PII export controls
- Auditing expectations for mutating operations

Primary implementation:

- `src/cli/*`
- `src/platform/*` (runtime + audit)

---

## MCP server (admin ops)

### Entry (MCP)

- `npm run mcp -- --token <SERVICE_TOKEN>`

### Authentication

- Token is verified by hash lookup in the service token store.
- Token usage updates `last_used_at`.

Implementation:

- `src/mcp/main.ts`
- `src/mcp/server.ts`
- `src/mcp/tools.ts`

### Intended usage

The MCP server exposes admin-ops tools for automation while preserving:

- audited mutations
- confirmation gates
- request_id correlation

---

## Relationship to the HTTP API

- The UI and API are the primary user-facing surfaces.
- The CLI and MCP server are the privileged operational surfaces.
- Many core invariants are shared (e.g., audited mutations, state machines, payment/ledger gates).
