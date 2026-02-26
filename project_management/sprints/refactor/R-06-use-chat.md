# Sprint R-06: Extract `useChat` Hook

**Track:** Chat Refactor  
**Audit source:** Uncle Bob SRP audit — God component decomposition, final stage  
**Depends on:** R-02 (stable ids), R-04 (useFileAttachments), R-05 (parseSSEStream)  
**Estimated effort:** 3–4 hours  

---

## Context

After R-03, R-04, and R-05, `ChatWidget` still owns:
- `messages` state
- `isStreaming` state
- `submitted` state
- `conversationId` / `sessionId` localStorage reads/writes
- `sendMessage()` function (which calls `parseSSEStream`)
- `inputRef` and `focus()` after send

This sprint extracts all of that into a `useChat` hook, reducing `ChatWidget` to a **pure UI compositor**: it receives data and callbacks from `useChat` and `useFileAttachments` and renders them. It should contain no `fetch`, no `localStorage`, no `crypto.randomUUID()`, and no SSE logic after this sprint.

---

## 6.1 — `useChat` Hook API

```typescript
interface UseChatOptions {
  mode: "hero" | "page" | "floating";
  sessionIdOverride?: string;    // from URL param ?session=
}

interface UseChatReturn {
  // State
  messages: Message[];
  isStreaming: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;

  // Derived
  hasUserMessages: boolean;       // memoized — no re-compute on every keystroke

  // Actions
  sendMessage: (
    text: string,
    attachments: Attachment[],
  ) => Promise<void>;

  // Ref (widget sets this so hook can call .focus() after send)
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export function useChat(options: UseChatOptions): UseChatReturn
```

---

## 6.2 — `hasUserMessages` — useMemo Fix

**Current (broken):**
```tsx
const hasUserMessages = messages.some(m => m.role === "user");
```

This runs on every single render — including on every keystroke in the input. There are typically dozens of renders per second while typing.

**Fixed (inside `useChat`):**
```tsx
const hasUserMessages = useMemo(
  () => messages.some((m) => m.role === "user"),
  [messages],          // only recomputes when messages array changes
);
```

Messages change only on send and on each streaming delta — keystroke renders do not change `messages`, so this becomes O(1).

---

## 6.3 — `BOLD_RE` Module-Scope Fix (Audit item B8)

**Current:**
```tsx
// Inside renderSpan() — called on every character of every message
function renderSpan(text: string) {
  const BOLD_RE = /\*\*([^*]+)\*\*/g;   // compiled on every call
  ...
}
```

**Fixed — hoist to module scope:**
```typescript
// At top of file, outside any component
const BOLD_RE = /\*\*([^*]+)\*\*/g;
```

JavaScript regex compilation is not free, and `renderSpan` is called in a hot path (every character of every message during streaming).

---

## 6.4 — `ChatWidget` After This Sprint

The component body shrinks to approximately:

```tsx
export function ChatWidget({ mode, sessionId }: ChatWidgetProps) {
  const {
    messages,
    isStreaming,
    inputValue,
    setInputValue,
    hasUserMessages,
    sendMessage,
    inputRef,
  } = useChat({ mode, sessionIdOverride: sessionId });

  const {
    pendingAttachments,
    isDragging,
    fileInputRef,
    addFiles,
    removeAttachment,
    clearAttachments,
    revokeAttachments,
    handlers: attachmentHandlers,
  } = useFileAttachments();

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text && pendingAttachments.length === 0) return;
    const attachments = [...pendingAttachments];
    setInputValue("");
    clearAttachments();
    revokeAttachments(attachments);  // revoke before send, R-01 fix
    await sendMessage(text, attachments);
  }, [inputValue, pendingAttachments, sendMessage, setInputValue, clearAttachments, revokeAttachments]);

  return (
    <ChatShell
      mode={mode}
      isDragging={isDragging}
      {...attachmentHandlers}
    >
      <ChatHeader mode={mode} />
      <MessageList messages={messages} isStreaming={isStreaming} />
      <InputRow
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        inputRef={inputRef}
        pendingAttachments={pendingAttachments}
        onRemoveAttachment={removeAttachment}
        onAddFiles={addFiles}
        fileInputRef={fileInputRef}
        disabled={isStreaming}
        hasUserMessages={hasUserMessages}
      />
    </ChatShell>
  );
}
```

Total line count of `ChatWidget` after R-06: target < 80 lines (down from 844).

---

## 6.5 — Sub-Components Created in This Sprint

To make the above compositor work, this sprint also extracts:

### `<MessageList />`
Props: `messages: Message[], isStreaming: boolean`  
Owns: scroll-to-bottom logic, streaming cursor display, message bubble rendering (calls `renderSpan` for markdown)

### `<InputRow />`
Props: value, onChange, onSend, inputRef, pendingAttachments, handlers, disabled, hasUserMessages  
Owns: textarea resize, Shift+Enter handling, send button state, attachment tray, attachment count badge

### `<ChatShell />`
Props: mode, isDragging, drag handlers, children  
Owns: the three outer layout shells (hero full-bleed, page column, floating popup)

---

## 6.6 — File Placement After R-06

```
src/components/chat/
  chat-widget.tsx           ← compositor, < 80 lines
  use-chat.ts               ← NEW hook (messages, send, streaming)
  use-file-attachments.ts   ← from R-04
  so-mark.tsx               ← from R-03
  chat-header.tsx           ← from R-03
  message-list.tsx          ← NEW sub-component
  input-row.tsx             ← NEW sub-component
  chat-shell.tsx            ← NEW sub-component
  __tests__/
    use-chat.test.ts        ← NEW tests
```

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Write `useChat` hook skeleton | `use-chat.ts` | 30 min |
| T2 | Move `messages`, `isStreaming`, `sessionId`, `conversationId` state into hook | `use-chat.ts` | 20 min |
| T3 | Move `sendMessage()` into hook (uses `parseSSEStream` from R-05) | `use-chat.ts` | 30 min |
| T4 | Add `hasUserMessages` `useMemo` inside hook | `use-chat.ts` | 5 min |
| T5 | Hoist `BOLD_RE` to module scope | module top | 2 min |
| T6 | Extract `<MessageList />` | `message-list.tsx` | 30 min |
| T7 | Extract `<InputRow />` | `input-row.tsx` | 30 min |
| T8 | Extract `<ChatShell />` | `chat-shell.tsx` | 20 min |
| T9 | Reduce `ChatWidget` to pure compositor | `chat-widget.tsx` | 30 min |
| T10 | Write `useChat` unit tests (MSW mock) | `use-chat.test.ts` | 45 min |

---

## Test Coverage

`useChat` tests (using `renderHook`):

| Test | Scenario |
|------|----------|
| Initial state | Opening message present, isStreaming false |
| `sendMessage` transitions to streaming | isStreaming becomes true |
| Streaming deltas append to message | Content grows during SSE |
| `onDone` saves conversationId to localStorage | Storage written correctly |
| Error response | isStreaming reset, error message added |
| `hasUserMessages` false initially | Memoized correctly |
| `hasUserMessages` true after send | Updates after user message added |

---

## Definition of Done

- [ ] `chat-widget.tsx` is < 100 lines
- [ ] `useChat` hook exists with complete API
- [ ] `hasUserMessages` uses `useMemo` — not a plain `.some()` call
- [ ] `BOLD_RE` is a module-scope constant
- [ ] `sendMessage`, `messages`, `isStreaming` all live in `useChat`
- [ ] No `fetch`, `localStorage`, `TextDecoder`, `JSON.parse` in `chat-widget.tsx`
- [ ] 7+ new `useChat` tests all passing
- [ ] `npx vitest run` total ≥ 1562/1563
