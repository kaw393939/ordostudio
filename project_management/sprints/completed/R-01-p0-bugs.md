# Sprint R-01: P0 Bug Fixes

**Track:** Chat Refactor  
**Audit source:** Uncle Bob / Knuth audit, February 2026  
**Depends on:** nothing — all fixes are in-place, no structural changes  
**Estimated effort:** 1–2 hours  

---

## Context

Five independently discoverable bugs found in the chat widget and backend route during the architecture audit. Three are correctness bugs that silently produce wrong behaviour today. Two are latent — they work by accident and will break under React concurrent mode or under load. All five can be fixed surgically with no interface changes.

These are P0 because:
- Three involve memory or resource leaks (object URLs, DB connections)
- One produces silent data loss (last-text-block overwrite in Claude)
- One is a concurrency hazard that React 18 concurrent scheduler will eventually trigger

None of these require new tests — the existing test suite must stay at 1547/1548.

---

## Bug Inventory

### B1 — Object URL leak on sent attachments
**File:** `src/components/chat/chat-widget.tsx`  
**Symptom:** Every image attachment the user sends stays as a live `blob:` URL in memory until the page is closed. In a long session with many images this will exhaust browser memory.

**Root cause:**  
`removeAttachment` revokes URLs when the user removes items from the pending tray. The `useEffect` cleanup only iterates `pendingAttachments` state at unmount — but once a message is *sent*, those preview URLs are moved into `messages[].attachments[].preview` and are no longer in `pendingAttachments`, so neither handler ever revokes them.

**Exact location:** `sendMessage()` — immediately after `setMessages((prev) => [...prev, sentMessage])`.

**Fix:**
```tsx
// After appending the sent message, immediately revoke previews —
// the <img src> already holds a reference, the blob URL is no longer needed
for (const a of currentAttachments) {
  if (a.preview) {
    URL.revokeObjectURL(a.preview);
    a.preview = undefined;
  }
}
```

---

### B2 — `OPENING_MESSAGE` text divergence between client and server
**Files:**  
- `src/components/chat/chat-widget.tsx` line ~55  
- `src/app/api/v1/agent/chat/route.ts` line ~128

**Symptom:** The two copies have different text.
- Client: `"We're a small training and consulting studio..."`
- Server: `"We're a small training and commissions studio..."`

A returning visitor whose conversation is replayed from the DB will see the server's version; a new visitor sees the client's version. They will drift further as copy is updated.

**Fix:**  
1. Add a named export to `src/lib/api/agent-system-prompt.ts`:
```typescript
export const AGENT_OPENING_MESSAGE =
  "We're a small training and consulting studio. I'm here to figure out if we're the right fit. What brings you here today?";
```
2. Delete both local `const OPENING_MESSAGE = ...` declarations.
3. Import `AGENT_OPENING_MESSAGE` in both files under the existing import block.

The canonical text is the **client-facing version** (the more natural one). Update the server copy to match.

---

### B3 — `assistantText` assignment overwrites rather than accumulates
**File:** `src/lib/llm-anthropic.ts`  
**Location:** Inside `runClaudeAgentLoop`, in the `while` loop:

```typescript
for (const block of response.content) {
  if (block.type === "text") {
    assistantText = block.text;   // BUG: assign, not append
  }
}
```

**Symptom:** If Claude returns multiple `text` blocks in a single response (permitted by the Anthropic API spec), only the last block's text is returned. The earlier blocks are silently discarded. This is not triggered by current prompts but is a correctness error by spec.

**Fix:**
```typescript
for (const block of response.content) {
  if (block.type === "text") {
    assistantText += block.text;
  }
}
```

Ensure `assistantText` is initialised as `""` before the loop (it already is).

---

### B4 — SSE word-split emits spaces and newlines as separate frames
**File:** `src/app/api/v1/agent/chat/route.ts`  
**Location:** Inside the `responseStream` `start(controller)` block:

```typescript
const words = assistantFinalContent.split(/(\s+)/);
for (const word of words) {
  if (word) {     // BUG: " " and "\n" are truthy
    controller.enqueue(encoder.encode(sseChunk({ delta: word })));
  }
}
```

**Symptom:** `split(/(\s+)/)` with a capture group returns the whitespace tokens as array elements. `if (word)` passes them because a space string is truthy. Each space triggers a separate `setMessages` re-render on the client during streaming. This doubles the frame count and causes visible jitter in the streaming cursor.

**Fix:**
```typescript
for (const word of words) {
  if (word.trim()) {
    controller.enqueue(encoder.encode(sseChunk({ delta: word })));
  }
}
```

This change does not affect visual output — the client concatenates all deltas — but halves the SSE frame count and eliminates the jitter.

---

### B5 — `msgIndex` side-effect captured inside `setMessages` state updater
**File:** `src/components/chat/chat-widget.tsx`  
**Location:** `sendMessage()` → SSE reader loop:

```tsx
setMessages((prev) => {
  msgIndex = prev.length;         // SIDE EFFECT inside pure updater function
  return [...prev, { role: "assistant", content: "" }];
});
```

**Symptom:** React's state updater functions must be pure. React 18 concurrent mode may call the updater more than once with different `prev` values, making `msgIndex` non-deterministic. It works today because Next.js client components run synchronously, but it is a concurrency hazard that will produce ghost messages or lost streaming updates if the scheduler changes behavior.

**Fix:** Add an `id` field to `Message`, assign ids to messages at creation, and locate the streaming message by id rather than array index.

Step 1 — extend the type:
```typescript
interface Message {
  id: string;       // NEW
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}
```

Step 2 — assign ids at creation:
```tsx
// Opening message
const [messages, setMessages] = useState<Message[]>([
  { id: crypto.randomUUID(), role: "assistant", content: AGENT_OPENING_MESSAGE },
]);

// Sent message
const sentMessage: Message = {
  id: crypto.randomUUID(),
  role: "user",
  content: text,
  attachments: ...,
};

// Streaming placeholder
const streamingId = crypto.randomUUID();
setMessages((prev) => [
  ...prev,
  { id: streamingId, role: "assistant", content: "" },
]);
```

Step 3 — update by id not index:
```tsx
setMessages((prev) =>
  prev.map((m) =>
    m.id === streamingId
      ? { ...m, content: assistantBuffer }
      : m,
  ),
);
```

The `streamingId` is captured in the closure of `sendMessage`, which is safe because it's created before the async work begins and never reassigned.

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Add `AGENT_OPENING_MESSAGE` export to `agent-system-prompt.ts` | `src/lib/api/agent-system-prompt.ts` | 5 min |
| T2 | Import + use `AGENT_OPENING_MESSAGE` in route.ts | `src/app/api/v1/agent/chat/route.ts` | 3 min |
| T3 | Import + use `AGENT_OPENING_MESSAGE` in chat-widget.tsx | `src/components/chat/chat-widget.tsx` | 3 min |
| T4 | Fix `assistantText +=` in llm-anthropic.ts | `src/lib/llm-anthropic.ts` | 1 min |
| T5 | Fix SSE whitespace guard in route.ts | `src/app/api/v1/agent/chat/route.ts` | 1 min |
| T6 | Add `id` to `Message` interface and propagate | `src/components/chat/chat-widget.tsx` | 20 min |
| T7 | Fix object URL revocation in `sendMessage` | `src/components/chat/chat-widget.tsx` | 5 min |

---

## Verification

```bash
npx vitest run
```

Expected: 1547/1548 (identical baseline — no new tests needed for these fixes).

All bugs are in runtime-path code. The unit tests don't exercise the widget directly except for the guild-join-flow tests, which are unaffected.

---

## Definition of Done

- [ ] `AGENT_OPENING_MESSAGE` is the single source of truth; both files import it
- [ ] Client and server opening text are identical
- [ ] `=` replaced with `+=` in llm-anthropic.ts
- [ ] SSE frame count is halved (verify in browser DevTools → Network → EventStream)
- [ ] `Message.id` exists; no `msgIndex` variable exists anywhere in chat-widget.tsx
- [ ] Sent attachment previews revoked immediately after `setMessages`
- [ ] `npx vitest run` passes at 1547/1548
