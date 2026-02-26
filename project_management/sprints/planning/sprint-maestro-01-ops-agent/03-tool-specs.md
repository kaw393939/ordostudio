# Maestro-01: Ops Agent (v2) — Tool Specs

**Sprint:** `sprint-maestro-01-ops-agent`

---

## Tool Registry Overview

All 25 tools live in `src/lib/api/maestro-tools.ts`.

Pattern:
```typescript
export const MAESTRO_TOOLS: ToolDefinition[] = [ ... ];

export function executeMaestroTool(
  name: string,
  args: unknown,
  db: Database,
): MaestroToolResult {
  const tool = MAESTRO_TOOLS.find(t => t.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool.execute(args, db);
}
```

Every tool:
- Validates args with Zod — returns `{ error: string }` on invalid args (never throws)
- Write tools are wrapped in `db.transaction()`
- No tool calls external services (no email, no Stripe charges)
- Write tools emit a `writeFeedEvent()` call inside the same transaction

---

## Group A — Queue Management (5 tools)

### `get_intake_queue`

```typescript
const GetIntakeQueueArgs = z.object({
  status: z.array(z.enum(['NEW','TRIAGED','QUALIFIED','BOOKED','CLOSED','REJECTED'])).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// Returns: { intakes: [{ id, name, email, status, created_at, assigned_to }] }
// SQL: SELECT i.*, u.email as assigned_email FROM intake_requests i
//      LEFT JOIN users u ON i.assigned_to = u.id
//      WHERE ($status IS NULL OR i.status IN (...))
//      ORDER BY i.created_at DESC LIMIT $limit
```

### `get_intake_detail`

```typescript
const GetIntakeDetailArgs = z.object({
  intake_id: z.string().min(1),
});
// Returns: full intake_request row + status history array + triage_ticket if exists
```

### `update_intake_status`

```typescript
const UpdateIntakeStatusArgs = z.object({
  intake_id: z.string().min(1),
  new_status: z.enum(['TRIAGED','QUALIFIED','BOOKED','CLOSED','REJECTED']),
  note: z.string().max(500).optional(),
});
// Writes: updates intake_requests.status; inserts intake_status_history row; writeFeedEvent('IntakeStatusChanged')
```

### `assign_intake`

```typescript
const AssignIntakeArgs = z.object({
  intake_id: z.string().min(1),
  user_id: z.string().min(1),
});
// Writes: sets intake_requests.assigned_to; writeFeedEvent('IntakeAssigned')
```

### `add_intake_note`

```typescript
const AddIntakeNoteArgs = z.object({
  intake_id: z.string().min(1),
  note: z.string().min(1).max(1000),
});
// Writes: inserts intake_status_history with current status + note; no status change
```

---

## Group B — Role Approvals (3 tools)

### `list_role_requests`

```typescript
const ListRoleRequestsArgs = z.object({
  status: z.enum(['PENDING','APPROVED','REJECTED']).default('PENDING'),
});
// Returns: [{ id, user_id, user_email, requested_role, created_at, status }]
// SQL: SELECT rr.*, u.email FROM role_requests rr JOIN users u ON rr.user_id = u.id WHERE status = ?
```

### `approve_role_request`

```typescript
const ApproveRoleRequestArgs = z.object({
  request_id: z.string().min(1),
  note: z.string().max(500).optional(),
});
// Writes (in transaction):
//   UPDATE role_requests SET status='APPROVED', approved_by=<maestro user_id>, approved_at=now WHERE id=?
//   INSERT INTO user_roles (user_id, role_id) ...
//   writeFeedEvent('RoleApproved', { request_id, role })
// Returns: { success: true, user_id, role }
```

### `reject_role_request`

```typescript
const RejectRoleRequestArgs = z.object({
  request_id: z.string().min(1),
  reason: z.string().min(1).max(500),
});
// Writes: UPDATE role_requests SET status='REJECTED'; writeFeedEvent('RoleRejected', { reason })
```

---

## Group C — Bookings & Availability (3 tools)

### `list_bookings`

```typescript
const ListBookingsArgs = z.object({
  status: z.enum(['OPEN','BOOKED','CANCELLED']).optional(),
  limit: z.number().int().default(20),
});
// Returns: [{ slot_id, start_at, end_at, status, booked_by_email, booking_id }]
```

### `add_availability_slot`

```typescript
const AddAvailabilitySlotArgs = z.object({
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
});
// Writes: INSERT INTO maestro_availability; writeFeedEvent('SlotAdded')
// Validates: end_at > start_at; duration 15min–4h
```

### `cancel_availability_slot`

```typescript
const CancelSlotArgs = z.object({
  slot_id: z.string().min(1),
});
// Writes: UPDATE maestro_availability SET status='CANCELLED' WHERE id=? AND status='OPEN'
// Error if status = 'BOOKED': "Cannot cancel a booked slot — cancel the booking first"
```

---

## Group D — Workflow (4 tools)

### `list_workflow_executions`

```typescript
const ListWorkflowExecutionsArgs = z.object({
  status: z.enum(['PENDING','RUNNING','SUCCESS','FAILED']).optional(),
  rule_id: z.string().optional(),
  limit: z.number().int().default(20),
});
```

### `get_workflow_execution_detail`

```typescript
const GetWorkflowExecutionDetailArgs = z.object({
  execution_id: z.string().min(1),
});
// Returns: full execution row + associated rule name + trigger event
```

### `list_workflow_rules`

```typescript
const ListWorkflowRulesArgs = z.object({
  enabled_only: z.boolean().default(false),
});
// Returns: [{ id, name, event_type, action_type, enabled, last_execution_at, execution_count }]
```

### `toggle_workflow_rule`

```typescript
const ToggleWorkflowRuleArgs = z.object({
  rule_id: z.string().min(1),
  enabled: z.boolean(),
});
// Writes: UPDATE workflow_rules SET enabled=? WHERE id=?
// Returns: { rule_id, enabled, name }
```

---

## Group E — KPI & Analytics (6 tools)

### `get_funnel_stats`

```typescript
const GetFunnelStatsArgs = z.object({
  days: z.number().int().min(1).max(365).default(30),
});
// Returns:
// { period_days: 30, intakes: { new: 5, triaged: 3, qualified: 2, booked: 1, closed: 1, rejected: 0 } }
// SQL: GROUP BY status WHERE created_at >= date('now', '-? days')
```

### `get_recent_activity`

```typescript
const GetRecentActivityArgs = z.object({
  days: z.number().int().min(1).max(90).default(7),
});
// Returns: [{ type, count, last_at }] from feed_events
// SQL: SELECT type, COUNT(*) as count, MAX(created_at) as last_at FROM feed_events
//      WHERE created_at >= date('now', '-? days') GROUP BY type ORDER BY count DESC
```

### `get_contact_summary`

```typescript
// No args
// Returns: { total: 45, by_status: [{ status: 'new', count: 12 }, ...] }
// SQL: SELECT status, COUNT(*) FROM contacts GROUP BY status
```

### `get_revenue_summary`

```typescript
const GetRevenueSummaryArgs = z.object({
  days: z.number().int().min(1).max(365).default(30),
});
// Returns:
// {
//   period_days: 30,
//   platform_revenue: 24000,
//   referrer_commissions: 1600,
//   provider_payouts: 8000,
//   net_revenue: 14400,
//   entry_count: 6,
//   paid_vs_earned: { paid: 2, earned: 3, void: 1 }
// }
// SQL: SELECT entry_type, SUM(amount_cents)/100 as total, status FROM ledger_entries
//      WHERE created_at >= date('now', '-? days') GROUP BY entry_type, status
```

### `get_newsletter_stats`

```typescript
// No args — current snapshot stats
// Returns:
// {
//   subscribers: { total: 318, active: 280, unsubscribed: 38 },
//   last_send_run: { run_id, sent_at, sent_count, delivered, bounced },
//   issues: { total: 12, scheduled: 1, published: 11 }
// }
// SQL: JOIN newsletter_subscribers + newsletter_send_runs + newsletter_issues
```

### `get_event_utilization`

```typescript
const GetEventUtilizationArgs = z.object({
  days: z.number().int().min(1).max(180).default(60),
});
// Returns:
// { period_days: 60, events: [{ id, title, capacity, registered, fill_pct, date }] }
// SQL: SELECT e.*, COUNT(er.id) as registered FROM events e
//      LEFT JOIN event_registrations er ON er.event_id = e.id
//      WHERE e.start_at >= date('now', '-? days') GROUP BY e.id
```

---

## Group F — Diagnostics (4 tools)

### `run_health_check`

```typescript
// No args
// Returns: {
//   db_migration_version: '043',
//   table_counts: { users: 42, intake_requests: 15, deals: 8, ... },
//   email_configured: true,
//   openai_configured: true,
//   sqlite_vec_loaded: true
// }
```

### `get_audit_log`

```typescript
const GetAuditLogArgs = z.object({
  limit: z.number().int().default(20),
  action: z.string().optional(),
  actor_type: z.enum(['user','system','agent']).optional(),
});
// Returns: [{ id, action, actor_type, actor_id, target_id, created_at, metadata }]
```

### `trigger_test_workflow`

```typescript
const TriggerTestWorkflowArgs = z.object({
  event_type: z.string().min(1),
  payload: z.record(z.unknown()),
});
// Writes: INSERT INTO feed_events with metadata.source = 'EVAL' (or 'TEST')
// Returns: { feed_event_id, matched_rules: [{ rule_id, name, triggered: true/false }] }
```

### `get_ops_summary`

```typescript
// No args
// Internal: calls get_funnel_stats(7d) + get_recent_activity(7d) + get_newsletter_stats() + get_revenue_summary(7d)
// Returns combined object — used by Maestro-02 polling endpoint /api/v1/admin/ops-summary
// This is a pure read that aggregates; no feed event written
```

---

## `feed_events` Writer Expansion

These existing functions must be updated to call `writeFeedEvent()` inside their DB transaction:

| Function | New event type | When |
|----------|---------------|------|
| `createIntakeRequest()` | `NewIntakeRequest` | After INSERT |
| `closeDeal()` or deal status to `CLOSED` | `DealClosed` | After UPDATE |
| Stripe `payment_intent.succeeded` handler | `PaymentReceived` | After payment INSERT |
| `scheduleNewsletter()` | `NewsletterScheduled` | After schedule |
| `createBooking()` | `BookingCreated` | After INSERT |
