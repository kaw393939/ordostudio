# UX Plan — Minimal UI + Agent Ops (Cockpits, Not Control Panels)

Date: 2026-02-23

## Goal
Reduce UI surface area while improving clarity.
- Keep **role cockpits** for humans.
- Move true “admin” work to CLI/MCP tools.
- Keep a small set of **approval cockpits**.

---

## Navigation contract

### Primary (Public)
- Public header stays consistent across the site.
- Signed-in users get **Dashboard**.

### Role cockpits (Dashboard)
- `/account` is the single entry point.
- It should route the user into the correct cockpit:
  - Affiliate cockpit
  - Apprentice cockpit
  - Maestro cockpit
  - Client cockpit (if/when needed)

### Operator surfaces
- The left admin sidebar remains the canonical operator nav.
- Mobile gets a tiny “top tasks” strip.
- On desktop, avoid duplicate nav surfaces.

---

## Human UX surfaces we need

### Affiliate cockpit (UI)
Primary tasks:
1) Get referral link + assets
2) Track conversion + payout status
3) Update payout information (if needed)

Acceptance criteria:
- The “what to do next” is visible without scrolling.
- 1 click to copy link.

### Client cockpit (UI)
Primary tasks:
1) View upcoming events/consults
2) Access receipts
3) Reschedule/cancel within policy

Acceptance criteria:
- No admin language.
- All policies are discoverable and explicit.

### Apprentice cockpit (UI)
Primary tasks:
1) View assigned work queue
2) Submit a field report
3) See feedback/approval status

Acceptance criteria:
- Submitting a report is obvious.
- Report templates are enforced (no “blank doc” anxiety).

### Maestro cockpit (UI)
Primary tasks:
1) Work the deal queue
2) Approve/deny exceptions (money/publish/permissions proposals)
3) Ship the newsletter (review + publish)

Acceptance criteria:
- Queue → Focus → Act pattern.
- High-risk actions always confirm.

---

## Approval cockpits (UI)
UI exists to support judgment and safety.

### Money approvals
- Ledger approvals/payout proposals
- Refund proposals

### Publishing approvals
- Newsletter publish/send
- Event publish/close

### Permission approvals
- Role/entitlements escalation requests

Acceptance criteria:
- Every approval screen shows “why this is safe” (preconditions + audit).

---

## Agent-only surfaces (CLI/MCP)
These should not be primarily done in the web UI.

### Site admin
- backfills/imports
- data repair
- configuration
- bulk operations
- entitlements sync jobs

### Editorial ingestion
- Meetup/YouTube/API collection
- transcript fetch
- tagging + dedupe
- draft generation

Acceptance criteria:
- Tool outputs are structured.
- Mutations are audited.
- Supports dry-run.

---

## De-scope rules (to keep UI thin)
- If it’s bulk, repetitive, or rules-based → agent tool.
- If it’s money/publishing/permissions → human approval.
- If it’s rare and advanced → hide behind disclosure or remove from UI.

---

## Measurable outcomes
- Reduced nav choices on operator pages (lower cognitive load).
- Fewer UI pages with tables as the primary interface.
- Faster cycle times on deals and newsletter publishing.
