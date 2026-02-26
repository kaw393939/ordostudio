# Maestro-01: Ops Agent (v2) — Overview

**Sprint:** `sprint-maestro-01-ops-agent`  
**Date:** 2026-02-26  
**Estimate:** 3–4 days  
**Priority:** 🟠 P1  
**Depends on:** Maestro-00b (roles must exist), Phase 0 (eval gate clean)  
**Replaces:** `archive/sprint-maestro-01-ops-agent/`

---

## What This Sprint Builds

A separate Claude-powered conversational route that gives the authenticated admin (ADMIN, STAFF) a natural language interface to the full operations pipeline.

**The operator does not navigate forms or dashboards for routine actions.** They type: "Approve the pending role request from Santiago" or "Show me the intake queue" or "What's our revenue this month?" — and the Maestro agent handles it.

---

## Key Changes Versus v1 Spec

| Area | v1 (archived) | v2 (this sprint) |
|------|---------------|-----------------|
| Tool count | 21 | 25 (added 4 KPI tools) |
| Eval count | 14 | 18 (added 4 KPI evals D4–D7) |
| KPI tools | Planned but thin | Fully specified: revenue, newsletter, referral, event utilization |
| feed_events writers | Not specified | Explicitly listed — intake submit, deal close, payment, newsletter send |
| `commission_rate` bug | Not mentioned | Fixed in T1 (carry from P0 bug registry) |
| Tool registry pattern | Match existing | Explicit Zod schema for every tool |
| Architecture notes | Minimal | Full file map, role check pattern, capturedValues usage |

---

## What This Unlocks

After this sprint:
- Maestro-02 can build the chat UI (it just needs the `/api/v1/agent/maestro` route)
- Maestro-03 can add intelligence tools (adds to `maestro-tools.ts`)
- Eval count reaches 31/31
- All 6 journey domains have at least partial agent coverage
