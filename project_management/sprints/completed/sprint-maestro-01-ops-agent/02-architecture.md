# Maestro-01: Ops Agent (v2) — Architecture

**Sprint:** `sprint-maestro-01-ops-agent`

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/api/maestro-tools.ts` | 25 tools + executor |
| `src/lib/api/maestro-system-prompt.ts` | Operator-framing system prompt |
| `src/app/api/v1/agent/maestro/route.ts` | Auth-gated POST route (ADMIN/STAFF only) |
| `src/evals/scenarios/maestro.ts` | 18 eval scenarios |

---

## Modified Files

| File | Change |
|------|--------|
| `src/evals/run.ts` | Register `maestro` eval type |
| `src/lib/api/intake.ts` | Add `writeFeedEvent('NewIntakeRequest')` call |
| `src/lib/api/deals.ts` | Add `writeFeedEvent('DealClosed')` on deal status → CLOSED |
| `src/app/api/v1/webhooks/stripe/route.ts` | Add `writeFeedEvent('PaymentReceived')` on `payment_intent.succeeded` |
| `src/lib/api/newsletter.ts` | Add `writeFeedEvent('NewsletterScheduled')` in scheduleNewsletter |
| `src/lib/api/bookings.ts` | Add `writeFeedEvent('BookingCreated')` in createBooking |
| `src/app/api/v1/account/referral/route.ts` | Fix `commission_rate: 0.25` → `0.04` per locked commission model |
| `package.json` | Add `evals:maestro` and `evals:all` scripts |

---

## Route Architecture

```typescript
// src/app/api/v1/agent/maestro/route.ts

export async function POST(request: Request) {
  // 1. Auth check — require ADMIN or STAFF
  const session = await requireSession(request);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const hasAccess = session.roles.some(r => ['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(r));
  if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // 2. Parse body: { messages: Message[], context?: Record<string,unknown> }
  const body = await request.json();

  // 3. Build messages array with system prompt prepended
  const allMessages = [
    { role: 'system', content: MAESTRO_SYSTEM_PROMPT },
    ...body.messages,
  ];

  // 4. Call Claude with MAESTRO_TOOLS
  const stream = await anthropic.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: allMessages,
    tools: MAESTRO_TOOLS.map(toAnthropicTool),
  });

  // 5. Agentic loop: process tool calls via executeMaestroTool()
  // 6. Stream response back as SSE (same pattern as /api/v1/agent/chat)
}
```

---

## How This Differs From `/api/v1/agent/chat`

| Aspect | `/api/v1/agent/chat` (public) | `/api/v1/agent/maestro` (admin) |
|--------|-------------------------------|----------------------------------|
| Auth | No session required | ADMIN / STAFF required |
| Tools | 5 public tools | 25 admin-tier tools |
| System prompt | Intake agent persona | Operator persona (neutral, direct) |
| capturedValues | `intake_id`, `booking_id` | `intake_id`, `execution_id`, `deal_id` |
| Max tokens | 1024 | 4096 |
| Model | claude-haiku | claude-sonnet or claude-opus |
| DB writes | `submit_intake`, `create_booking` | All write tools (10 total) |

---

## `capturedValues` Usage

`capturedValues` carries structured data back from the agent for deep-link generation in the UI:

```typescript
// Tool executor emits capturedValues on certain tools:
if (toolName === 'update_intake_status') {
  capturedValues.intake_id = args.intake_id;
  capturedValues.new_status = args.new_status;
}
if (toolName === 'approve_role_request') {
  capturedValues.request_id = args.request_id;
}
```

The Maestro-02 UI reads `capturedValues` from the SSE stream to render action chips (e.g., "View Intake →").

---

## Operator System Prompt

```
You are the Maestro — the Studio Ordo operations agent.
You serve the studio director and staff only.
Your job: give direct, concise operational summaries and execute requested actions accurately.

Rules:
1. Always use tools before answering operational questions (queue, role requests, revenue, etc.)
2. When asked to approve or reject something, confirm before writing — state what you are about to do, then call the tool
3. For write tools, briefly confirm the action taken ("Done — marked as QUALIFIED")
4. Never fabricate data — if a tool returns empty, say so
5. Do not discuss business strategy — you are an operations assistant
6. Keep responses short: summaries, not essays
7. If you receive an ambiguous request about a person, ask for clarification before acting
```

---

## No DB Migrations

This sprint adds zero migrations. All tables used (intake_requests, role_requests, maestro_availability, etc.) already exist. The new roles from sprint 00b must be seeded before this sprint runs in production.
