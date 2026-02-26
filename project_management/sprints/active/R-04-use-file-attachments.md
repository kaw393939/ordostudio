# Sprint R-04: Extract `useFileAttachments` Hook

**Track:** Chat Refactor  
**Audit source:** Uncle Bob SRP audit — God component decomposition  
**Depends on:** R-01 (object URL revocation pattern established), R-02 (Message.id types stable)  
**Estimated effort:** 2–3 hours  

---

## Context

`chat-widget.tsx` currently owns file attachment handling inline — about 120 lines covering drag-and-drop, paste, file input, base64 encoding, object URL creation/cleanup, and state management. This code has no connection to chat messaging and should be entirely self-contained.

Extracting it to a custom hook achieves:
1. The remaining `ChatWidget` component no longer needs to know about `FileReader`, `URL.createObjectURL`, drag events, or MIME type guards
2. The hook can be unit-tested in isolation (with a mocked DOM)
3. The hook's cleanup effect is guaranteed to run at the right lifecycle boundary

---

## 4.1 — Scope of the Hook

`useFileAttachments` owns:

| Piece | Current location |
|-------|-----------------|
| `pendingAttachments` state | Inline state |
| `isDragging` state | Inline state |
| `fileInputRef` | Inline ref |
| `fileToBase64(file)` | Named function inside component |
| `filesToAttachments(files)` | Named function, sequential I/O |
| `processFiles(files)` | Named function, MIME guard + dedup |
| `handleFileInputChange` | Inline event handler |
| `handlePaste` | Inline event handler |
| `handleDragOver` / `handleDragLeave` / `handleDrop` | Inline event handlers |
| `removeAttachment(id)` | Inline function |
| cleanup `useEffect` (URL revocation) | Inline effect |

---

## 4.2 — Hook API

```typescript
interface Attachment {
  id: string;
  name: string;
  type: string;
  base64: string;
  preview?: string;       // only for images, blob: URL
  size: number;
}

interface UseFileAttachmentsReturn {
  // State
  pendingAttachments: Attachment[];
  isDragging: boolean;

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Actions
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;          // called after send
  revokeAttachments: (attachments: Attachment[]) => void;  // called by ChatWidget after send

  // Event handlers (ready to spread on elements)
  handlers: {
    onDragOver: React.DragEventHandler;
    onDragLeave: React.DragEventHandler;
    onDrop: React.DragEventHandler;
    onPaste: React.ClipboardEventHandler;
    onFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
  };
}

export function useFileAttachments(options?: {
  maxFiles?: number;          // default 5
  maxSizeBytes?: number;      // default 10 * 1024 * 1024 (10 MB)
  accept?: string[];          // MIME types, default image/* + application/pdf
}): UseFileAttachmentsReturn
```

---

## 4.3 — Implementation Notes

### `filesToAttachments` — parallel I/O (Bug fix from audit)

**Current (broken):**
```typescript
const attachments: Attachment[] = [];
for (const file of files) {
  const base64 = await fileToBase64(file);  // sequential
  attachments.push({ ... });
}
```

**Fixed:**
```typescript
const attachments = await Promise.all(
  Array.from(files).map(async (file) => {
    const base64 = await fileToBase64(file);
    const preview = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      base64,
      preview,
      size: file.size,
    };
  }),
);
```

### `revokeAttachments` — explicit revocation helper

The hook tracks all object URLs it creates internally and provides `revokeAttachments` so the caller (ChatWidget) can revoke sent-message previews immediately after appending to the message array, preventing the leak identified in R-01.

```typescript
const createdUrls = useRef<Set<string>>(new Set());

// On cleanup (unmount):
useEffect(() => {
  return () => {
    for (const url of createdUrls.current) {
      URL.revokeObjectURL(url);
    }
  };
}, []);
```

### MIME guard

Move the accepted-type list to the options parameter with sensible defaults. Reject files not in the allowlist and show a dev-mode `console.warn` with the rejected filename and type.

### Dedup guard

Reject files whose `name + size` combination already exists in `pendingAttachments` to prevent double-adds from paste + file input.

---

## 4.4 — Usage in `ChatWidget`

Before:
```tsx
// ~120 lines of file handling state, refs, effects, handlers scattered inline
```

After:
```tsx
const {
  pendingAttachments,
  isDragging,
  fileInputRef,
  addFiles,
  removeAttachment,
  clearAttachments,
  revokeAttachments,
  handlers,
} = useFileAttachments();
```

JSX attachment zones become:
```tsx
<div
  onDragOver={handlers.onDragOver}
  onDragLeave={handlers.onDragLeave}
  onDrop={handlers.onDrop}
>
```

---

## 4.5 — File Placement

```
src/components/chat/
  use-file-attachments.ts    ← NEW hook
  chat-widget.tsx            ← imports the hook, uses its API
```

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Write `useFileAttachments` hook with all handlers | `use-file-attachments.ts` | 60 min |
| T2 | Fix `filesToAttachments` to use `Promise.all` | `use-file-attachments.ts` | 10 min |
| T3 | Replace all inline file-handling code in `ChatWidget` with hook | `chat-widget.tsx` | 30 min |
| T4 | Connect `revokeAttachments` call in `sendMessage` after send | `chat-widget.tsx` | 10 min |
| T5 | Write unit tests for `useFileAttachments` | `use-file-attachments.test.ts` | 30 min |

---

## Test Coverage

New test file: `src/components/chat/__tests__/use-file-attachments.test.ts`

Tests:
- `addFiles` with valid image — appends attachment, creates blob URL
- `addFiles` with disallowed MIME type — rejects file, state unchanged
- `addFiles` with duplicate — deduplication, state unchanged
- `removeAttachment` — removes by id, revokes URL
- `clearAttachments` — empties state
- `filesToAttachments` — two files processed in parallel (spy on FileReader)
- Unmount cleanup — all URLs revoked

---

## Definition of Done

- [ ] `useFileAttachments` hook exists at `src/components/chat/use-file-attachments.ts`
- [ ] `filesToAttachments` uses `Promise.all`
- [ ] All drag/drop/paste/input handlers removed from `ChatWidget` body
- [ ] `revokeAttachments` called after send to fix object URL leak
- [ ] Unit tests for hook: all 7 scenarios pass
- [ ] `npx vitest run` total ≥ 1554/1555 (7 new tests added)
