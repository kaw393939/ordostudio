# Sprint 66 — MCP Server for Admin Ops (Audited)

## Goal
Expose a safe MCP server interface so tools (VS Code/Claude Code) can query and operate Studio Ordo through the same audited admin APIs.

## Scope
- Define tool surface area (read-first).
- Token-scoped auth for MCP.
- Explicit confirmations for destructive operations.
- Audit entries for all mutations.

## Acceptance Criteria
- [x] MCP server runs locally and can authenticate.
- [x] Read tools: intake/deals/field reports/newsletter/audit.
- [x] Mutation tools include confirmations and audit logs.
- [x] Lint/tests/build pass.

