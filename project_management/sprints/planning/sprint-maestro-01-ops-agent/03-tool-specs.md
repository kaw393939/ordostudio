# Maestro-01: Ops Agent (v2) — Tool Specs

**Sprint:** `sprint-maestro-01-ops-agent`
**Tool count (this sprint):** 10
**Deferred to M-01b:** 15 (bookings, workflow, expanded KPI, diagnostics)

---

## Tool Registry Pattern

All 10 tools live in `src/lib/api/maestro-tools.ts`.

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

## Group A — Queue Management (3 tools)

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

## Group C — KPI (2 tools)

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

### `get_recent_activity`

```typescript
const GetRecentActivityArgs = z.object({
  days: z.number().int().min(1).max(90).default(7),
});
// Returns: [{ type, count, last_at }] from feed_events
// SQL: SELECT type, COUNT(*) as count, MAX(created_at) as last_at FROM feed_events
//      WHERE created_at >= date('now', '-? days') GROUP BY type ORDER BY count DESC
```

---

## Group D — Operations (2 tools)

### `get_ops_summary`

```typescript
// No args
// Internal: calls get_revenue_summary(7d) + get_recent_activity(7d)
// Returns combined object — used by Maestro-02 polling endpoint /api/v1/admin/ops-summary
// Pure read; no feed event written
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

---

## Deferred Tools (M-01b)

The following 15 tools are fully specified in `sprint-maestro-01b-extended/03-tool-specs.md`.
Do NOT implement them in this sprint. Add them only after observing which gaps
appear in real usage after M-01/02 ships.

| Group | Tool |
|-------|------|
| Queue | `assign_intake` |
| Queue | `add_intake_note` |
| Bookings | `list_bookings` |
| Bookings | `add_availability_slot` |
| Bookings | `cancel_availability_slot` |
| Workflow | `list_workflow_executions` |
| Workflow | `get_workflow_execution_detail` |
| Workflow | `list_workflow_rules` |
| Workflow | `toggle_workflow_rule` |
| KPI | `get_funnel_stats` |
| KPI | `get_contact_summary` |
| KPI | `get_newsletter_stats` |
| KPI | `get_event_utilization` |
| Diagnostics | `run_health_check` |
| Diagnostics | `trigger_test_workflow` |

---

## `feed_events` Writer Expansion

These existing functions must be updated to call `writeFeedEvent()`:

| Function | New event type | When |
|----------|---------------|------|
| `createIntakeRequest()` | `NewIntakeRequest` | After INSERT |
| `closeDeal()` or deal status to `CLOSED` | `DealClosed` | After UPDATE |
| Stripe `payment_intent.succeeded` handler | `PaymentReceived` | After payment INSERT |
| `scheduleNewsletter()` | `NewsletterScheduled` | After schedule |
| `createBooking()` | `BookingCreated` | After INSERT |
