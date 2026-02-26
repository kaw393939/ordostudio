# Sprint R-03: Extract `SOMark` and `ChatHeader` Components

**Track:** Chat Refactor  
**Audit source:** Uncle Bob / Knuth audit — DRY violations  
**Depends on:** none — purely additive extraction, no logic changes  
**Estimated effort:** 1.5 hours  

---

## Context

The architecture audit found the S·O monogram SVG copied verbatim **five times** across `chat-widget.tsx` with inconsistent `strokeWidth` values (1.2, 1.4, and 1.5 appear across copies). The chat header chrome (title, subtitle, status dot, close button) is similarly duplicated across all three mode branches (hero, page, floating).

This sprint extracts two small, focused components:
1. `<SOMark />` — the brand monogram, parameterised by size
2. `<ChatHeader />` — the header bar shared by all three modes

Neither component introduces new behaviour. They are DRY extractions only.

---

## 3.1 — `SOMark` Component

**Current state:** Five inline SVG blocks, each 15–20 lines, with magic numbers for `size` and inconsistent `strokeWidth`.

**Target:**
```tsx
interface SOMark {
  size?: number;        // overall bounding box (default: 24)
  className?: string;
  "aria-hidden"?: boolean;
}

export function SOMark({ size = 24, className, "aria-hidden": ariaHidden = true }: SOMark) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
    >
      {/* S — curved stroke */}
      <path
        d="M10 10 C10 7 14 5 18 7 C22 9 22 13 18 15 C14 17 10 19 10 22 C10 25 14 27 18 25"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
      {/* O — circle */}
      <circle
        cx="22"
        cy="16"
        r="5"
        stroke="currentColor"
        strokeWidth={1.4}
        fill="none"
      />
    </svg>
  );
}
```

**Important:** Use a single canonical `strokeWidth={1.4}` — review each usage site to confirm no visual regression before removing the old SVG blocks.

**Placement:** Co-locate with `chat-widget.tsx` as a local component or extract to `src/components/chat/so-mark.tsx` (preferred if it will be used outside the chat widget in future).

---

## 3.2 — `ChatHeader` Component

**Current state:** Three nearly-identical header blocks inside the three mode conditional branches of `ChatWidget`:

```tsx
{/* hero mode */}
<div className="flex items-center justify-between ...">
  <div className="flex items-center gap-2">
    <SOMark size={16} />
    <span className="text-sm font-medium ...">Studio Ordo</span>
    <span className="w-2 h-2 rounded-full bg-green-400 ..." />
  </div>
  <span className="text-xs text-white/60">Online</span>
</div>
```

Repeated with slightly different padding/sizing in `page` and `floating` modes.

**Target:**
```tsx
interface ChatHeaderProps {
  mode: "hero" | "page" | "floating";
  onClose?: () => void;
  showClose?: boolean;
}

function ChatHeader({ mode, onClose, showClose = false }: ChatHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        mode === "floating" ? "px-4 py-3" : "px-5 py-4",
      )}
    >
      <div className="flex items-center gap-2">
        <SOMark size={16} className="text-white/80" />
        <span className="text-sm font-semibold text-white">Studio Ordo</span>
        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Online</span>
        {showClose && onClose && (
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="p-1 rounded text-white/40 hover:text-white/80 transition-colors"
          >
            <XIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
```

**Replacement sites:**
- Hero mode header block
- Page (`/apply`) mode header block
- Floating mode header block

---

## 3.3 — Audit Other Incidental Duplication

While touching the header, fix any other trivially deduplicated markup found during the extraction:

- Constant `STATUS_DOT_CLASS` for the pulsing green dot (used in header and potentially the launcher)
- Consistent aria-labels across all three close buttons if they exist

---

## File Structure After Sprint

```
src/components/chat/
  chat-widget.tsx      ← imports SOMark, ChatHeader
  so-mark.tsx          ← NEW: SOMark component
  chat-header.tsx      ← NEW: ChatHeader component (or co-located in chat-widget.tsx)
```

If these components are small enough (< 30 lines each), they may be kept at the top of `chat-widget.tsx` as local components until R-06 fully decomposes the file.

---

## Tasks

| # | Action | File | Time |
|---|--------|------|------|
| T1 | Write canonical `SOMark` SVG paths + audit existing strokeWidth values | chat-widget.tsx | 20 min |
| T2 | Replace all 5 inline SVG blocks with `<SOMark size={n} />` | chat-widget.tsx | 20 min |
| T3 | Write `ChatHeader` component | chat-widget.tsx or chat-header.tsx | 20 min |
| T4 | Replace 3 header blocks with `<ChatHeader mode={...} />` | chat-widget.tsx | 15 min |
| T5 | Visual review in all 3 modes (browser, dev server) | — | 10 min |

---

## Verification

```bash
npx vitest run
# + manual visual inspection in:
# - Homepage hero chat
# - /apply page chat
# - Floating chat widget
```

Check: SVG renders correctly at all 3 sizes, brand dot pulses, close button appears/hides correctly per mode, no layout shift vs before.

---

## Definition of Done

- [ ] Zero inline SVG `<path d="M10 10...">` blocks in `chat-widget.tsx` outside of `SOMark`
- [ ] Single `SOMark` component with consistent `strokeWidth={1.4}`
- [ ] Single `ChatHeader` component used in all three mode branches
- [ ] No visual regression in any of the three chat surfaces
- [ ] `npx vitest run` passes at 1547/1548
