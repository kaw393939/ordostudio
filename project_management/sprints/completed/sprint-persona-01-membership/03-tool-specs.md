# Sprint Persona-01: Membership & Apprenticeship Tools — Tool Specs

File: `src/lib/agent/tools/maestro-persona-membership.ts`

---

## Tool 1: `apply_for_apprenticeship`

```typescript
const ApplyForApprenticeshipInput = z.object({
  note: z.string().max(500).optional()
         .describe("Optional motivation note from the applicant"),
});
```

**SQL:**
```sql
-- Check for existing pending request
SELECT id FROM role_requests
WHERE user_id = :userId AND status = 'pending'
LIMIT 1;

-- If none: insert new request
INSERT INTO role_requests (id, user_id, requested_role, status, notes, created_at)
VALUES (?, ?, 'APPRENTICE', 'pending', ?, datetime('now'));
```

**Returns:** `{ requestId, status: 'pending', message: "Application submitted" }`
**Error:** `{ error: 'APPLICATION_ALREADY_PENDING', existingRequestId }`

---

## Tool 2: `view_rank_requirements`

```typescript
const ViewRankRequirementsInput = z.object({
  targetRole: z.enum(['ASSOCIATE','APPRENTICE','CERTIFIED_CONSULTANT']).optional()
               .describe("If omitted, returns requirements for caller's next rank"),
});
```

**Logic:** Look up `RANK_REQUIREMENTS[callerRole]` to get current role's requirements
(what was needed to reach this rank), and `RANK_REQUIREMENTS[nextRole]` for the next goal.

**Returns:**
```typescript
{
  currentRole: string;
  nextRole: string | null;     // null if at CERTIFIED_CONSULTANT
  requirementsToAdvance: string[];
}
```

---

## Tool 3: `list_assigned_tasks`

```typescript
const ListAssignedTasksInput = z.object({
  status: z.enum(['all','pending','completed']).default('pending'),
  limit:  z.number().int().min(1).max(50).default(20),
});
```

**SQL:**
```sql
SELECT id, title, description, status, due_date, created_at
FROM apprentice_tasks
WHERE assigned_to = :userId
  AND (:status = 'all' OR status = :status)
ORDER BY created_at DESC
LIMIT :limit;
```

**Graceful fallback:** If table not found → `{ tasks: [], note: "task module not active" }`

---

## Tool 4: `get_apprentice_profile`

```typescript
const GetApprenticeProfileInput = z.object({
  userId: z.string().optional()
           .describe("Target user ID — ADMIN/STAFF only for others; omit for self"),
});
```

**SQL:**
```sql
SELECT u.id, u.role, u.created_at AS joined_at,
       COUNT(DISTINCT at.id)  FILTER (WHERE at.status='completed') AS tasks_completed_n,
       COUNT(DISTINCT gs.id)                                        AS gate_submissions_n
FROM users u
LEFT JOIN apprentice_tasks at ON at.assigned_to = u.id
LEFT JOIN gate_submissions  gs ON gs.user_id = u.id
WHERE u.id = :targetUserId
GROUP BY u.id;
```

**Auth check:** If `targetUserId !== callerId` and caller not ADMIN/STAFF → `{ error: 'FORBIDDEN' }`

---

## Tool 5: `review_apprentice_application`

```typescript
const ReviewApprenticeApplicationInput = z.object({
  requestId: z.string().describe("ID of the role_requests row to review"),
});
```

**ADMIN/STAFF only.** Returns full application detail + notes array.

**SQL:**
```sql
SELECT rr.*, u.email, u.role AS current_role
FROM role_requests rr
JOIN users u ON u.id = rr.user_id
WHERE rr.id = :requestId;
```

---

## Registration in `maestro-tools.ts`
Append 6 entries to toolRegistry.

**Deferred:** `promote_user_role` and `review_gate_submission` — see 00-overview.md for rationale.
