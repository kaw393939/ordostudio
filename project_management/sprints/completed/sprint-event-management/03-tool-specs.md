# Sprint Event-Management — Tool Specs

File: `src/lib/api/maestro-tools.ts` (append to `MAESTRO_TOOLS`)

---

## Tool 1: `create_event`

```typescript
const CreateEventInput = z.object({
  title:       z.string().min(2).max(200),
  start_at:    z.string().datetime().describe("ISO 8601 datetime"),
  capacity:    z.number().int().min(1).max(500).default(20),
  description: z.string().max(2000).optional(),
  end_at:      z.string().datetime().optional(),
});
```

**SQL:**
```sql
INSERT INTO events (id, title, description, start_at, end_at, capacity, status, created_by, created_at)
VALUES (?, ?, ?, ?, ?, ?, 'draft', :callerId, datetime('now'))
```

**Returns:** `{ eventId, title, start_at, capacity, status: 'draft' }`

---

## Tool 2: `update_event`

```typescript
const UpdateEventInput = z.object({
  eventId: z.string().min(1),
  changes: z.object({
    title:       z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional(),
    start_at:    z.string().datetime().optional(),
    end_at:      z.string().datetime().optional(),
    capacity:    z.number().int().min(1).optional(),
    status:      z.enum(['draft','published','cancelled']).optional(),
  }).refine(d => Object.keys(d).length > 0, "At least one field required"),
});
```

**Logic:** Dynamic UPDATE. Only update keys present in `changes`. Wrap in `db.transaction()`.
If `status = 'cancelled'` and registrations exist → still allowed (admin choice).

**Returns:** `{ eventId, updatedFields: string[], updatedAt: string }`

---

## Tool 3: `get_event_attendance`

```typescript
const GetEventAttendanceInput = z.object({
  eventId: z.string().min(1),
});
```

**SQL:**
```sql
SELECT
  e.title,
  e.capacity,
  COUNT(er.id) FILTER (WHERE er.status = 'registered') AS registered,
  COUNT(er.id) FILTER (WHERE er.status = 'cancelled')  AS cancelled,
  e.capacity - COUNT(er.id) FILTER (WHERE er.status = 'registered') AS remaining
FROM events e
LEFT JOIN event_registrations er ON er.event_id = e.id
WHERE e.id = :eventId
GROUP BY e.id;
```

**Returns:** `{ title, capacity, registered, cancelled, remaining, fillPct: number }`

---

## Tool 4: `list_registered_attendees`

```typescript
const ListRegisteredAttendeesInput = z.object({
  eventId: z.string().min(1),
  status:  z.enum(['registered','cancelled','all']).default('registered'),
});
```

**SQL:**
```sql
SELECT er.id, er.status, er.created_at, u.email, u.id AS user_id
FROM event_registrations er
JOIN users u ON u.id = er.user_id
WHERE er.event_id = :eventId
  AND (:status = 'all' OR er.status = :status)
ORDER BY er.created_at ASC;
```

**Returns:** `{ eventId, attendees: [{ userId, email, status, registeredAt }] }`

---

## Registration

```typescript
// Append to MAESTRO_TOOLS in maestro-tools.ts:
{ name: "create_event",               ... },
{ name: "update_event",               ... },
{ name: "get_event_attendance",       ... },
{ name: "list_registered_attendees",  ... },
```

Total tools after this sprint: **17** (10 M-01 + 3 Journey-F + 4 EM)
