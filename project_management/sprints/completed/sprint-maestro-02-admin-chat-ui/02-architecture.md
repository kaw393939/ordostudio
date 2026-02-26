# Maestro-02: Admin Chat UI — Architecture

**Sprint:** `sprint-maestro-02-admin-chat-ui`

---

## New Files

| File | Purpose |
|------|---------|
| `src/app/(admin)/admin/chat/page.tsx` | Route page: renders `<MaestroChat>` + `<OpsSummaryWidget>` side by side |
| `src/components/admin/maestro-chat.tsx` | Chat panel component |
| `src/components/admin/maestro-input.tsx` | Message input component |
| `src/components/admin/ops-summary-widget.tsx` | Polling summary widget |
| `src/hooks/useMaestroChat.ts` | Hook: manages messages, SSE stream, localStorage persistence |
| `src/hooks/useOpsSummary.ts` | Hook: polls `/api/v1/admin/ops-summary` on 60s interval |
| `src/app/api/v1/admin/ops-summary/route.ts` | REST endpoint returning pre-aggregated ops data |

---

## Modified Files

| File | Change |
|------|--------|
| Admin sidebar nav component | Add "Chat" nav item with `MessageSquare` icon |

---

## SSE Streaming Pattern

Same pattern as the existing intake chat at `src/components/chat-interface.tsx`.  
`useMaestroChat` hook:
```typescript
async function send(message: string) {
  appendUserMessage(message);
  const res = await fetch('/api/v1/agent/maestro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history }),
  });
  // Read SSE stream, append to assistant message progressively
  // Parse capturedValues from SSE events
  // On stream complete, persist to localStorage
}
```

---

## `capturedValues` Rendering

The SSE stream can emit a special event: `data: {"type":"capturedValues","payload":{"intake_id":"intake-001"}}`

When `useMaestroChat` receives a `capturedValues` event, it stores it with the assistant message. `<MaestroChat>` renders an action chip below the message:

```typescript
function ActionChip({ capturedValues }: { capturedValues: Record<string,string> }) {
  if (capturedValues.intake_id) return <Link href={`/admin/intakes/${capturedValues.intake_id}`}>View Intake →</Link>;
  if (capturedValues.request_id) return <Link href={`/admin/roles`}>View Role Request →</Link>;
  return null;
}
```

---

## No DB Migrations, No New Evals

This sprint is pure UI + one REST endpoint. Zero DB changes. Zero LLM eval scenarios — the UI is exercised via playwright E2E tests if desired, not the eval harness.
