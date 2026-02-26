# Sprint Commerce-Agent: Deal Pipeline in Ops Agent — Overview

## Status
**NOT STARTED** | Priority: 🟠 P1 | Depends on: Maestro-01 + Maestro-02 complete

---

## One-Liner
Wire the existing deal pipeline MCP tools (`list_deals`, `assign_deal`,
`approve_deal`) to the ops agent so operators can manage the intake→deal→revenue
conversion without leaving the chat interface.

---

## Why This Sprint Exists

From the reconciliation report:
> Domain 3 (Commerce / Deals): "Agent tool: any commerce tool ❌ Not present"
> Despite MCP tools already being built.

The deal pipeline tools already exist. This sprint adds them to `maestro-tools.ts`
and adds `get_deal_detail` and `get_customer_timeline` (read-only tools that provide
context before the operator advances a deal).

**This is the highest-revenue automation gap after Journey-F.** An operator currently
has to leave the chat, find the deal in a list or the DB, and advance it manually.
After this sprint: "Approve the deal for River Chen" → one tool call → done.

---

## What "Wiring" Means Here

The MCP server already exposes `list_deals`, `assign_deal`, `approve_deal`.
These exist as server-side tool definitions. This sprint adds them as **agent-callable
tools** in `maestro-tools.ts` with Zod schemas, so the ops agent LLM can use them.

No new DB logic is required. We're bridging the existing implementation into the
conversational agent.

---

## Scope Boundaries

| In scope | Out of scope |
|---|---|
| 4 deal tools in ops agent | Stripe charge initiation |
| 3 evals CA-01 through CA-03 | New CRM migrations |
| `advance_deal_stage` respects `MAESTRO_APPROVED` flag | Email to client on deal advance |

---

## The 4 Tools

| Tool | Auth | What happens |
|------|------|--------------|
| `list_deals` | ADMIN/STAFF | SELECT from `deals` with status filter |
| `get_deal_detail` | ADMIN/STAFF | Full deal row + intake + user info |
| `advance_deal_stage` | ADMIN/STAFF | UPDATE `deals.status`; fires feed event; enforces MAESTRO_APPROVED gate |
| `get_customer_timeline` | ADMIN/STAFF | Chronological history of a user's activity |

---

## Outputs Produced

- 4 new tools in `src/lib/api/maestro-tools.ts`
- 3 evals in `src/evals/scenarios/commerce.ts`
- `DealAdvanced` feed event
- Total tools in ops agent: 17 → 21 (after EM)

---

## Estimated Effort

| Role | Hours |
|---|---|
| Backend — bridge existing tools | 2 h |
| `get_customer_timeline` (new) | 1.5 h |
| Evals | 1.5 h |
| Total | 5 h |

---

## Risk

**Low-Medium.** `advance_deal_stage` makes a DB write. The `MAESTRO_APPROVED` gate
prevents the LLM from auto-advancing deals above a certain stage. The operator must
explicitly say "approve" — the agent cannot self-trigger approval without explicit
instruction. This is the same pattern as `approve_role_request` in M-01.
