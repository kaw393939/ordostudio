# Operating Model — Humans vs Agents (Minimal UI, Maximum Leverage)

Date: 2026-02-23

## Goal
Run Studio Ordo with:
- **Minimal human UI** (clarity-first, role cockpits)
- **Maximum operational leverage** via agents/CLI/MCP
- **Hard safety rails** (auditability, approvals, reversibility)

This doc defines:
1) Roles (humans + agents)
2) What each role owns
3) Which actions belong in UI vs agent tools
4) Governance rules (approvals + audit)

---

## Roles (humans)

### Affiliate
Owns distribution.
- Promote offers/events
- Track referrals + payouts

### Client
Owns participation.
- Register/book
- Attend
- Pay

### Apprentice
Owns delivery execution.
- Execute assigned work
- Submit field reports
- Improve through feedback loops

### Maestro (Operator / Editor)
Owns quality + prioritization.
- Triage the work that matters
- Approve exceptions
- Maintain tone/voice and delivery standards

### Support (optional / shared responsibility)
Owns relationship moments.
- Help clients through confusion/exceptions
- Escalate policy decisions to Maestro

---

## Roles (agents)

### Ops Agent (Queue Manager)
Owns throughput.
- Watch queues
- Detect stuck states
- Propose next actions
- Draft routine comms

### Ingestion Agents (External Adapters)
Own the boundary with external sources.
- Meetup events
- YouTube channel transcripts
- Other APIs used for research/newsletters

### Drafting Agent (Editorial Assistant)
Owns first drafts.
- Weekly issue draft generation
- Subject line options
- Section grouping + summaries
- Always includes provenance links

### Audit/Quality Agent
Owns guardrails.
- Validate invariants
- Detect anomalies
- Produce incident timelines

---

## System of record vs adapters

### System of record (this site)
The platform stores canonical state:
- Users, roles/entitlements
- Intake, deals, ledger
- Events, registrations, engagements
- Newsletter issues + provenance
- Audit logs

### Adapters (MCP servers)
External MCP servers **do not own truth**.
They provide:
- fetch/read tools
- normalized outputs
- stable IDs and timestamps

The platform ingests and stores normalized entities.

---

## UI vs Agent Tools (the boundary)

### UI is for
- High-context review
- Relationship-sensitive work
- Approval moments
- Status visibility and self-serve

Examples:
- Client: reschedule/cancel, receipts
- Affiliate: referral status, payout status
- Apprentice: assignments + submit report
- Maestro: deal approvals, publish newsletter

### Agent tools are for
- High-volume, rules-based operations
- Bulk changes
- Reconciliation
- Report generation
- Cross-system synchronization

Examples:
- Deduping, backfills, imports
- Queue assignment
- “Generate newsletter draft from sources X/Y/Z”
- “Produce weekly ops report”

---

## Non-negotiable safety rails

### 1) Audit trail for everything
Every mutation (UI/CLI/MCP) must emit:
- actor (user/service token)
- action
- target IDs
- before/after summary
- timestamp

### 2) Human approval gates
The following require explicit human confirmation (UI or approval workflow):
- Money movement: refunds, payouts, ledger adjustments
- Publishing: newsletter send, event publish/close
- Permissions: roles/entitlements escalation
- Destructive actions: deletes, irreversible bulk updates

### 3) Idempotency + dry-run
All high-impact agent tools should support:
- `--dry-run`
- idempotent operations (safe to repeat)
- precondition checks (state machine rules)

### 4) Principle of least privilege
- Service tokens are scoped per tool surface area.
- MAESTRO is not automatically SUPER_ADMIN.

---

## Operating rhythm

### Daily
- Ops agent summarizes queues and proposes assignments.
- Apprentices execute and submit reports.
- Maestro approves exceptions and unblocks delivery.

### Weekly
- Ingestion agents collect sources.
- Drafting agent proposes newsletter lineup + draft.
- Maestro edits and publishes.
- Reporting agent summarizes performance.

### Monthly
- Audit/quality agent runs invariants + drift detection.
- Humans update policy, offerings, and training.

---

## What “success” looks like
- Humans spend time on: quality, relationships, judgment.
- Agents spend time on: throughput, data hygiene, drafts, reporting.
- UI stays calm and obvious: 3–5 primary actions per role.
