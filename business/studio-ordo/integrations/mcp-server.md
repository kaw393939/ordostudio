# Integration — MCP Server (Admin Ops)

## Goal
Allow VS Code / Claude Code / other agents to manage Studio Ordo through a controlled, audited interface.

## Principles
- MCP is a delivery channel, not a second business system.
- Uses token-scoped auth.
- Every mutation writes audit entries.

## MVP tools
- list_intake, get_intake, triage_intake
- list_deals, assign_deal, approve_deal
- list_field_reports, feature_field_report
- create_newsletter_issue, generate_newsletter, schedule_newsletter, export_newsletter
- get_audit_log

## Safety
- Explicit confirmations for destructive operations.
- Rate limits.

