# Maestro-01: Ops Agent (v2) — Eval Specs

**Sprint:** `sprint-maestro-01-ops-agent`
**New evals:** 10
**Baseline going in:** 17/17 (after Vec-01)
**Target after:** 27/27

---

## Eval File

**New file:** `src/evals/scenarios/maestro.ts`
**Eval type:** `maestro`
Register in `src/evals/run.ts`. Add `package.json` script:
```json
"evals:maestro": "tsx src/evals/run.ts --type maestro"
```

---

## Group A — Queue Management (4 scenarios)

### A1 · `maestro-queue-list`
```typescript
{
  id: 'maestro-queue-list',
  type: 'maestro',
  description: 'Lists intake queue with default filter',
  preSetup: seedQueueIntakes(3),   // inserts 3 NEW intakes
  turns: [{ role: 'user', content: 'Show me the intake queue' }],
  assertions: [
    { type: 'tool_called', tool: 'get_intake_queue' },
    { type: 'response_includes_any', values: ['intake', 'queue', 'pending'] },
  ],
}
```

### A2 · `maestro-queue-advance`
```typescript
{
  id: 'maestro-queue-advance',
  type: 'maestro',
  preSetup: seedSingleIntake({ id: 'intake-test-a2', name: 'River Chen', status: 'TRIAGED' }),
  turns: [{ role: 'user', content: 'Qualify the intake from River Chen' }],
  assertions: [
    { type: 'tool_called', tool: 'update_intake_status' },
    { type: 'db_assert', query: "SELECT status FROM intake_requests WHERE id = 'intake-test-a2'", expect: { status: 'QUALIFIED' } },
  ],
}
```

### A3 · `maestro-queue-filter-by-status`
```typescript
{
  id: 'maestro-queue-filter-by-status',
  type: 'maestro',
  turns: [{ role: 'user', content: 'Show me only the booked intakes' }],
  assertions: [
    { type: 'tool_called', tool: 'get_intake_queue' },
    { type: 'tool_arg_includes', tool: 'get_intake_queue', arg: 'status', value: 'BOOKED' },
  ],
}
```

### A4 · `maestro-intake-detail-then-advance` (multi-turn)
```typescript
{
  id: 'maestro-intake-detail-then-advance',
  type: 'maestro',
  preSetup: seedSingleIntake({ id: 'intake-test-a4', name: 'Keiran Walsh', status: 'NEW' }),
  turns: [
    { role: 'user', content: 'Tell me about the intake from Keiran Walsh' },
    { role: 'user', content: 'Looks good — move it to QUALIFIED' },
  ],
  assertions: [
    { type: 'tool_called', tool: 'get_intake_detail', on_turn: 0 },
    { type: 'tool_called', tool: 'update_intake_status', on_turn: 1 },
    { type: 'db_assert', query: "SELECT status FROM intake_requests WHERE id = 'intake-test-a4'", expect: { status: 'QUALIFIED' } },
  ],
}
```

---

## Group B — Role Approvals (3 scenarios)

### B1 · `maestro-role-list-pending`
```typescript
{
  id: 'maestro-role-list-pending',
  type: 'maestro',
  preSetup: seedRoleRequests([{ user: 'Amara', role: 'APPRENTICE' }]),
  turns: [{ role: 'user', content: 'Who is waiting for role approval?' }],
  assertions: [{ type: 'tool_called', tool: 'list_role_requests' }],
}
```

### B2 · `maestro-role-approve`
```typescript
{
  id: 'maestro-role-approve',
  type: 'maestro',
  preSetup: seedRoleRequests([{ id: 'rreq-test-b2', user: 'Amara', role: 'APPRENTICE' }]),
  turns: [{ role: 'user', content: "Approve Amara's apprentice application" }],
  assertions: [
    { type: 'tool_called', tool: 'approve_role_request' },
    { type: 'db_assert', query: "SELECT status FROM role_requests WHERE id = 'rreq-test-b2'", expect: { status: 'APPROVED' } },
    { type: 'db_assert', query: "SELECT COUNT(*) as n FROM feed_events WHERE type = 'RoleApproved'", expect: { n: 1 } },
  ],
}
```

### B3 · `maestro-role-reject-with-reason`
```typescript
{
  id: 'maestro-role-reject-with-reason',
  type: 'maestro',
  preSetup: seedRoleRequests([{ id: 'rreq-test-b3', user: 'Devon', role: 'CERTIFIED_CONSULTANT' }]),
  turns: [{ role: 'user', content: "Reject Devon's consultant application — they haven't completed the gate project" }],
  assertions: [
    { type: 'tool_called', tool: 'reject_role_request' },
    { type: 'db_assert', query: "SELECT status FROM role_requests WHERE id = 'rreq-test-b3'", expect: { status: 'REJECTED' } },
  ],
}
```

---

## Group C — Revenue & Activity (1 scenario)

### C1 · `maestro-revenue-summary`
```typescript
{
  id: 'maestro-revenue-summary',
  type: 'maestro',
  preSetup: seedLedgerEntries([
    { entry_type: 'PLATFORM_REVENUE', amount_cents: 800000, status: 'EARNED' },
    { entry_type: 'REFERRER_COMMISSION', amount_cents: 160000, status: 'EARNED' },
  ]),
  turns: [{ role: 'user', content: 'What is our revenue this month?' }],
  assertions: [
    { type: 'tool_called', tool: 'get_revenue_summary' },
    { type: 'response_includes', value: '8,000', description: 'Should state the platform revenue amount' },
  ],
}
```

---

## Group D — Security & Audit (2 scenarios)

### D1 · `maestro-audit-log`
```typescript
{
  id: 'maestro-audit-log',
  type: 'maestro',
  preSetup: seedAuditLogEntries(3),
  turns: [{ role: 'user', content: 'Show me recent admin actions' }],
  assertions: [{ type: 'tool_called', tool: 'get_audit_log' }],
}
```

### D2 · `maestro-auth-rejected-non-admin`
```typescript
{
  id: 'maestro-auth-rejected-non-admin',
  type: 'maestro-security',  // HTTP-level assertion, not LLM
  description: 'Route returns 403 for USER role',
  request: { method: 'POST', url: '/api/v1/agent/maestro', auth: 'user-role' },
  assertions: [{ type: 'http_status', value: 403 }],
}
```

---

## Deferred Evals (M-01b)

The following evals are deferred and will be created in `sprint-maestro-01b-extended`:

- `maestro-workflow-list`, `maestro-workflow-execution-check`, `maestro-workflow-toggle`, `maestro-workflow-test-trigger`
- `maestro-funnel-stats`, `maestro-newsletter-stats`, `maestro-health-check`
- Any booking/availability evals
