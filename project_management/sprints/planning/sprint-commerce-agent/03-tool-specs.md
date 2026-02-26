# Sprint Commerce-Agent — Tool Specs

File: `src/lib/api/maestro-tools.ts` (append to `MAESTRO_TOOLS`)

---

## Tool 1: `list_deals`

```typescript
const ListDealsInput = z.object({
  status: z.enum(['OPEN','SCOPED','QUALIFIED','CONTRACT_SENT','CLOSED_WON','CLOSED_LOST','all']).default('OPEN'),
  limit:  z.number().int().min(1).max(100).default(20),
});
```

**SQL:**
```sql
SELECT d.*, u.email, i.status AS intake_status
FROM deals d
LEFT JOIN users u ON u.id = d.user_id
LEFT JOIN intake_requests i ON i.id = d.intake_id
WHERE (:status = 'all' OR d.status = :status)
ORDER BY d.created_at DESC
LIMIT :limit;
```

**Returns:** `{ deals: [{ id, title, status, amount_cents, userEmail, createdAt }] }`

---

## Tool 2: `get_deal_detail`

```typescript
const GetDealDetailInput = z.object({
  dealId: z.string().min(1),
});
```

**Returns:** Full deal row + intake request + user profile + timeline summary.

```sql
SELECT d.*, u.email, u.role,
       i.status AS intake_status, i.created_at AS intake_created_at
FROM deals d
LEFT JOIN users u ON u.id = d.user_id
LEFT JOIN intake_requests i ON i.id = d.intake_id
WHERE d.id = :dealId;
```

---

## Tool 3: `advance_deal_stage`

```typescript
const AdvanceDealStageInput = z.object({
  dealId:    z.string().min(1),
  newStatus: z.enum(['SCOPED','QUALIFIED','CONTRACT_SENT','CLOSED_WON','CLOSED_LOST']),
  note:      z.string().max(500).optional(),
  approve:   z.boolean().optional()
              .describe("Set true to explicitly grant MAESTRO_APPROVED gate"),
});
```

**Logic:**
1. ADMIN/STAFF check
2. Fetch deal — error if not found
3. If `args.approve === true`, set `maestro_approved = 1`
4. If new stage is gated (CONTRACT_SENT, CLOSED_WON) and `maestro_approved !== 1` → return gate error
5. UPDATE `deals.status`, `deals.updated_at`; log note to `audit_log` if provided
6. `writeFeedEvent('DealAdvanced', { dealId, fromStatus, toStatus })`

---

## Tool 4: `get_customer_timeline`

```typescript
const GetCustomerTimelineInput = z.object({
  userId: z.string().min(1),
  limit:  z.number().int().min(1).max(50).default(20),
});
```

**Returns:** Chronological history of user activity across multiple tables:

```typescript
// Union query across feed_events, intake_requests, deals, role_requests
// Returns: [{ type, description, created_at }] ordered DESC by created_at
```

**SQL (approximate):**
```sql
SELECT 'intake' AS type, id, status AS description, created_at FROM intake_requests WHERE user_id = :userId
UNION ALL
SELECT 'deal', id, status, created_at FROM deals WHERE user_id = :userId
UNION ALL
SELECT 'role_request', id, status || ' ' || requested_role, created_at FROM role_requests WHERE user_id = :userId
UNION ALL
SELECT type, id, NULL, created_at FROM feed_events WHERE user_id = :userId
ORDER BY created_at DESC
LIMIT :limit;
```

**Graceful:** Returns empty array and `{ note: 'No activity found' }` for unknown userId.

---

## Registration

```typescript
// Append to MAESTRO_TOOLS:
{ name: "list_deals",             ... },
{ name: "get_deal_detail",        ... },
{ name: "advance_deal_stage",     ... },
{ name: "get_customer_timeline",  ... },
```

Total tools after this sprint: **21** (10 M-01 + 3 JF + 4 EM + 4 CA)
