# Sprint R-02: Stable Message IDs

**Track:** Chat Refactor  
**Audit source:** Uncle Bob / Knuth audit — concurrency hazard  
**Depends on:** R-01 (Message.id field introduced there — this sprint builds on it)  
**Estimated effort:** 1–2 hours  

---

## Context

This sprint deepens the `Message.id` change introduced as one of five fixes in R-01 and ensures the rest of the `chat-widget.tsx` component respects the stable-ID contract everywhere identities were previously assumed to be position-based.

R-01 introduced `Message.id` and replaced `msgIndex` tracking inside `sendMessage`. This sprint:
1. Verifies there are no remaining positional assumptions about message arrays
2. Adds a `useRef` stable-ID accumulator for the in-flight streaming message to ensure parallelism safety
3. Ensures the `messages` prop type throughout the tree is updated so TypeScript enforces the id field

---

## Background: Why Index-Based State Is Unsafe in Concurrent Mode

React 18 concurrent features (Suspense, `startTransition`, `useDeferredValue`) can interrupt and replay renders. When a setState updater captures an outer-scope variable as a side effect (e.g., `msgIndex = prev.length`) the captured value is correct only if the updater runs exactly once — which is no longer guaranteed.

The pattern React enforces is:
- State updaters must be pure
- Identity must come *from* the state, not from capturing external counters

The correct pattern for streaming into a specific in-flight message is to assign it a UUID *before* beginning async work, store that UUID in a `useRef` so it persists across re-renders without causing re-renders, and use the UUID to look up the message in the state array.

---

## Analysis: Remaining Positional Assumptions

After R-01, search the codebase for any remaining index-based message manipulation:

```
grep -n "messages\[" src/components/chat/chat-widget.tsx
grep -n "prev\.length" src/components/chat/chat-widget.tsx
grep -n "msgIndex\|messageIndex\|lastMessage\b" src/components/chat/chat-widget.tsx
```

Known remaining sites after R-01:
1. `openingMessage` initialisation in `useState` — uses array literal, safe
2. `hasUserMessages` — uses `.some()`, safe  
3. `sendMessage` — R-01 converted to id-based, verify complete

---

## Implementation

### 2.1 — `streamingIdRef`

Replace any `let msgIndex` / `let streamingId` captured in `sendMessage` closure with a stable ref:

```tsx
const streamingIdRef = useRef<string | null>(null);

// Inside sendMessage, before fetch:
const id = crypto.randomUUID();
streamingIdRef.current = id;

setMessages((prev) => [
  ...prev,
  { id, role: "assistant", content: "" },
]);
```

During SSE ingestion:
```tsx
setMessages((prev) =>
  prev.map((m) =>
    m.id === streamingIdRef.current
      ? { ...m, content: m.content + delta }
      : m,
  ),
);
```

After streaming completes:
```tsx
streamingIdRef.current = null;
```

Using a ref rather than a local variable prevents accidental capture in async closures that close over a stale value if `sendMessage` is called twice before the first call finishes (race guard).

### 2.2 — `Message` type as only accepted shape

Ensure the `Message` interface in `chat-widget.tsx` marks `id` as required (not optional):

```typescript
interface Message {
  id: string;           // required — always set at creation
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}
```

### 2.3 — Fix any `prev[prev.length - 1]` patterns

If any code accesses the last message by index (e.g., to append a tool-call result), replace with:

```tsx
// Instead of: prev[prev.length - 1]
// Use:
prev.find((m) => m.id === streamingIdRef.current)
```

### 2.4 — Typed assertion helper

Add a small helper to surface bugs loudly:

```typescript
/** Throws if a message with the given id is not found — use in dev only */
function getMessageById(messages: Message[], id: string): Message {
  const m = messages.find((m) => m.id === id);
  if (!m) throw new Error(`[Chat] message ${id} not found in state`);
  return m;
}
```

This is a dev-time guard and can be removed in production via `process.env.NODE_ENV === "development"` if desired.

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Convert `streamingId` local var to `streamingIdRef` | `chat-widget.tsx` | 15 min |
| T2 | Mark `Message.id` as required (not optional) | `chat-widget.tsx` | 5 min |
| T3 | Audit for remaining `prev.length`/index patterns, fix each | `chat-widget.tsx` | 20 min |
| T4 | Add `getMessageById` dev helper | `chat-widget.tsx` | 5 min |
| T5 | TypeScript compile check: `npx tsc --noEmit` | — | 5 min |

---

## Verification

```bash
npx tsc --noEmit
npx vitest run
```

Expected: zero TypeScript errors, 1547/1548 vitest.

Manual browser check: Open chat widget, send two rapid messages (stress concurrent state), verify both messages appear in correct order with correct content and neither is overwritten.

---

## Definition of Done

- [ ] No `let msgIndex`, no `prev.length` positional assumptions in `chat-widget.tsx`
- [ ] `streamingIdRef` ref holds the in-flight message id
- [ ] `Message.id` is `string` (required), not `string | undefined`
- [ ] `npx tsc --noEmit` is clean
- [ ] `npx vitest run` passes at 1547/1548
