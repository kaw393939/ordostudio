# Sprint Journey-F: Urgent Escalation & Callback Tools — Tool Specs

File: `src/lib/agent/tools/maestro-journey-f.ts`

---

## Tool 1: `flag_urgent_intake`

```typescript
const FlagUrgentIntakeInput = z.object({
  intakeId: z.string().describe("ID of the intake request to flag as urgent"),
  reason:   z.string().min(5).max(500)
             .describe("Why this intake needs urgent attention"),
});
```

**Auth:** ADMIN/STAFF only (same check pattern as other admin tools).

**Returns:**
```typescript
{
  intakeId:  string;
  priority:  "urgent";
  flaggedAt: string;   // ISO datetime
}
```

**Side effects:**
1. Upsert `triage_tickets` row with `priority='urgent'`
2. Write `UrgentIntakeFlagged` feed event

**Errors:**
- `INTAKE_NOT_FOUND` if `intake_id` does not exist in `intake_requests`

---

## Tool 2: `trigger_urgent_callback`

```typescript
const TriggerUrgentCallbackInput = z.object({
  intakeId: z.string().describe("Intake to book a callback for"),
  slotId:   z.string().describe("Availability slot ID to reserve"),
});
```

**Auth:** ADMIN/STAFF only.

**Returns:**
```typescript
{
  bookingId: string;
  slotId:    string;
  intakeId:  string;
  bookedAt:  string;
}
```

**Errors:**
- `SLOT_NOT_FOUND` — slot does not exist
- `SLOT_CAPACITY_EXCEEDED` — slot fully booked (same guard as PE-02)

**Transaction:** See [02-architecture.md](02-architecture.md).

---

## Tool 3: `log_callback_outcome`

```typescript
const LogCallbackOutcomeInput = z.object({
  intakeId: z.string(),
  outcome:  z.enum(['converted', 'no_show', 'rescheduled', 'declined'])
             .describe("Result of the callback"),
  notes:    z.string().max(1000).optional()
             .describe("Free text notes about the outcome"),
});
```

**Auth:** ADMIN/STAFF only.

**Returns:**
```typescript
{
  intakeId:  string;
  outcome:   string;
  loggedAt:  string;
}
| { error: "NO_BOOKING_FOUND" }
```

---

## Registration in `maestro-tools.ts`

```typescript
import {
  flagUrgentIntake,
  triggerUrgentCallback,
  logCallbackOutcome,
} from "./tools/maestro-journey-f";

// Append to toolRegistry:
{ name: "flag_urgent_intake",      fn: flagUrgentIntake,      schema: FlagUrgentIntakeInput },
{ name: "trigger_urgent_callback", fn: triggerUrgentCallback, schema: TriggerUrgentCallbackInput },
{ name: "log_callback_outcome",    fn: logCallbackOutcome,    schema: LogCallbackOutcomeInput },
```

**Total tools after this sprint: 46**

---

## System Prompt Addition

Add to the ops agent system prompt (Rule 7):

```
7. If a lead mentions urgency, immediate need, or readiness to buy, call
   flag_urgent_intake immediately. Then offer to schedule a callback using
   trigger_urgent_callback. Do not proceed past this without operator confirmation.
```
