# Operator Handbook: Humans & Agents

Welcome to the Studio Ordo operating model. This handbook defines how humans and agents interact to run the platform.

## The Core Contract
- **Humans** use role cockpits and approval screens. We focus on high-context review, relationship-sensitive work, and approval moments.
- **Agents** use CLI and MCP tools. They handle high-volume, rules-based operations, bulk changes, and report generation.

## Human Roles & Cockpits
1. **Affiliate**: Owns distribution. Uses the Affiliate cockpit to get referral links and track payouts.
2. **Client**: Owns participation. Uses the Client cockpit to view upcoming events and access receipts.
3. **Apprentice**: Owns delivery execution. Uses the Apprentice cockpit to view assigned work and submit field reports.
4. **Maestro (Operator/Editor)**: Owns quality and prioritization. Uses the Maestro cockpit to work the deal queue, approve exceptions, and ship the newsletter.

## Agent Roles
1. **Ops Agent**: Watches queues, detects stuck states, and proposes next actions.
2. **Ingestion Agents**: Collect data from external sources (Meetup, YouTube, APIs).
3. **Drafting Agent**: Generates weekly newsletter drafts and summaries.
4. **Audit/Quality Agent**: Validates invariants and detects anomalies.

## Approval Gates
High-risk actions require explicit human confirmation:
- **Money**: Refunds, payouts, ledger adjustments.
- **Publishing**: Newsletter send, event publish/close.
- **Permissions**: Roles/entitlements escalation.

## Advanced Admin
Rare and advanced admin tasks (e.g., bulk imports, data repair, configuration) are not surfaced in the primary UI. These are executed via CLI/MCP tools by authorized agents or operators.
