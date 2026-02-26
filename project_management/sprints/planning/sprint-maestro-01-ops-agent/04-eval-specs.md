# Maestro-01: Ops Agent (v2) — Eval Specs

**Sprint:** `sprint-maestro-01-ops-agent`  
**New evals:** 18  
**Baseline going in:** 17/17 (after Vec-01)  
**Target after:** 35/35

---

## Eval File

**New file:** `src/evals/scenarios/maestro.ts`  
**Eval type:** `maestro`  
Register in `src/evals/run.ts`. Add `package.json` script:
```json
"evals:maestro": "tsx src/evals/run.ts --type maestro"
```

---

## Group A — Queue Management (3 scenarios)

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
  description: 'Advance a named intake to QUALIFIED',
  preSetup: seedSingleIntake({ id: 'intake-test-a2', name: 'River Chen', status: 'TRIAGED' }),
  turns: [
    { role: 'user', content: 'Qualify the intake from River Chen' },
  ],
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

---

## Group B — Role Approvals (3 scenarios)

### B1 · `maestro-role-list-pending`
```typescript
{
  id: 'maestro-role-list-pending',
  preSetup: seedRoleRequests([{ user: 'Amara', role: 'APPRENTICE' }]),
  turns: [{ role: 'user', content: 'Who is waiting for role approval?' }],
  assertions: [{ type: 'tool_called', tool: 'list_role_requests' }],
}
```

### B2 · `maestro-role-approve`
```typescript
{
  id: 'maestro-role-approve',
  preSetup: seedRoleRequests([{ id: 'rreq-test-b2', user: 'Amara', role: 'APPRENTICE' }]),
  turns: [{ role: 'user', content: "Approve Amara's apprentice application" }],
  assertions: [
    { type: 'tool_called', tool: 'approve_role_request' },
    { type: 'db_assert', query: "SELECT status FROM role_requests WHERE id = 'rreq-test-b2'", expect: { status: 'APPROVED' } },
    {
      type: 'db_assert',
      query: "SELECT COUNT(*) as n FROM feed_events WHERE type = 'RoleApproved'",
      expect: { n: 1 },
    },
  ],
}
```

### B3 · `maestro-role-reject-with-reason`
```typescript
{
  id: 'maestro-role-reject-with-reason',
  preSetup: seedRoleRequests([{ id: 'rreq-test-b3', user: 'Devon', role: 'CERTIFIED_CONSULTANT' }]),
  turns: [{ role: 'user', content: "Reject Devon's consultant application — they haven't completed the gate project" }],
  assertions: [
    { type: 'tool_called', tool: 'reject_role_request' },
    { type: 'db_assert', query: "SELECT status FROM role_requests WHERE id = 'rreq-test-b3'", expect: { status: 'REJECTED' } },
  ],
}
```

---

## Group C — Workflow (4 scenarios)

### C1 · `maestro-workflow-list`
```typescript
{
  id: 'maestro-workflow-list',
  turns: [{ role: 'user', content: 'What workflow rules are active?' }],
  assertions: [{ type: 'tool_called', tool: 'list_workflow_rules' }],
}
```

### C2 · `maestro-workflow-execution-check`
```typescript
{
  id: 'maestro-workflow-execution-check',
  preSetup: seedWorkflowExecution({ status: 'FAILED' }),
  turns: [{ role: 'user', content: 'Were there any workflow failures recently?' }],
  assertions: [
    { type: 'tool_called', tool: 'list_workflow_executions' },
    { type: 'response_includes_any', values: ['failed', 'failure', 'error'] },
  ],
}
```

### C3 · `maestro-workflow-toggle`
```typescript
{
  id: 'maestro-workflow-toggle',
  preSetup: seedWorkflowRule({ id: 'rule-test-c3', enabled: true }),
  turns: [{ role: 'user', content: 'Disable the rule rule-test-c3' }],
  assertions: [
    { type: 'tool_called', tool: 'toggle_workflow_rule' },
    { type: 'db_assert', query: "SELECT enabled FROM workflow_rules WHERE id = 'rule-test-c3'", expect: { enabled: 0 } },
  ],
}
```

### C4 · `maestro-workflow-test-trigger`
```typescript
{
  id: 'maestro-workflow-test-trigger',
  turns: [{ role: 'user', content: 'Fire a test NewIntakeRequest event to check the automation' }],
  assertions: [
    { type: 'tool_called', tool: 'trigger_test_workflow' },
    { type: 'response_includes_any', values: ['triggered', 'fired', 'executed', 'matched'] },
  ],
}
```

---

## Group D — KPI & Analytics (4 scenarios)

### D1 · `maestro-funnel-stats`
```typescript
{
  id: 'maestro-funnel-stats',
  preSetup: seedFunnelIntakes(5),  // 3 NEW, 1 QUALIFIED, 1 BOOKED
  turns: [{ role: 'user', content: 'How is the intake funnel looking this month?' }],
  assertions: [
    { type: 'tool_called', tool: 'get_funnel_stats' },
    { type: 'response_includes_any', values: ['intake', 'funnel', 'qualified', 'booked'] },
  ],
}
```

### D2 · `maestro-revenue-summary`
```typescript
{
  id: 'maestro-revenue-summary',
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

### D3 · `maestro-newsletter-stats`
```typescript
{
  id: 'maestro-newsletter-stats',
  preSetup: seedNewsletterSubscribers(100),
  turns: [{ role: 'user', content: 'How many newsletter subscribers do we have?' }],
  assertions: [
    { type: 'tool_called', tool: 'get_newsletter_stats' },
    { type: 'response_includes', value: '100' },
  ],
}
```

### D4 · `maestro-health-check`
```typescript
{
  id: 'maestro-health-check',
  turns: [{ role: 'user', content: 'Run a health check on the system' }],
  assertions: [
    { type: 'tool_called', tool: 'run_health_check' },
    { type: 'response_includes_any', values: ['migration', 'table', 'healthy', 'check'] },
  ],
}
```

---

## Group E — Diagnostics (2 scenarios)

### E1 · `maestro-audit-log`
```typescript
{
  id: 'maestro-audit-log',
  preSetup: seedAuditLogEntries(3),
  turns: [{ role: 'user', content: 'Show me recent admin actions' }],
  assertions: [{ type: 'tool_called', tool: 'get_audit_log' }],
}
```

### E2 · `maestro-auth-rejected-non-admin`
```typescript
{
  id: 'maestro-auth-rejected-non-admin',
  description: 'Route returns 403 for USER role',
  type: 'maestro-security',  // special type — HTTP-level assertion, not LLM
  request: { method: 'POST', url: '/api/v1/agent/maestro', auth: 'user-role' },
  assertions: [{ type: 'http_status', value: 403 }],
}
```

---

## Multi-Turn Scenario (bonus)

### A4 · `maestro-intake-detail-then-advance`
```typescript
{
  id: 'maestro-intake-detail-then-advance',
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
