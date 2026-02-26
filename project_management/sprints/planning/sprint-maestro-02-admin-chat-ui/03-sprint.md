# Sprint Maestro-02: Admin Chat UI — Sprint Plan

---

## T1: `GET /api/v1/admin/ops-summary` Route

**File:** `src/app/api/v1/admin/ops-summary/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // 1. Auth check: require ADMIN or STAFF
  // 2. Open DB
  // 3. Run 4 parallel queries:
  //    - intake queue counts: GROUP BY status WHERE status IN ('NEW','TRIAGED','QUALIFIED')
  //    - pending role requests: COUNT(*) WHERE status = 'PENDING'
  //    - workflow failures last 24h: COUNT(*) FROM workflow_executions WHERE status='FAILED'
  //      AND created_at >= now - 1 day
  //    - open slots: COUNT(*) FROM maestro_availability WHERE status = 'OPEN'
  //      AND start_at >= now
  // 4. Return JSON (shape defined in spec)
}
```

Target: < 50ms. No LLM involved.

---

## T2: Confirm `react-markdown` availability

Run: `grep -r "react-markdown" package.json`

If not present: `npm install react-markdown` (client-side only — used in `OpsChat.tsx`).

---

## T3: Create `src/components/admin/OpsSummaryPanel.tsx`

- Client component (`"use client"`)
- Fetches `GET /api/v1/admin/ops-summary` on mount
- Polls every 30 seconds (`setInterval` in `useEffect`, cleanup on unmount)
- Loading state: skeleton rows (3)
- Error state: small inline "retry" link
- Renders 4 sections as described in UX design
- Each count is a `<Link>` to the corresponding admin page

---

## T4: Create `src/components/admin/OpsChat.tsx`

- Client component
- State: `messages`, `input`, `isLoading`, `error`
- On mount: load history from `localStorage.getItem('maestro-chat-history')`, parse JSON
- On message append: `localStorage.setItem('maestro-chat-history', JSON.stringify(messages))`
- POST to `/api/v1/agent/maestro`: sends `{ message, history: messages.map(toHistoryItem) }`
- History item shape: `{ role, content }` (matches route expectation)
- Typing indicator: shown when `isLoading` is true
- Markdown rendering: wrap assistant text in `<ReactMarkdown>` with `className="prose prose-sm"`
- Input: `<textarea>` — submit on Enter (without Shift), Shift+Enter for newline
- Empty state: show welcome message when `messages.length === 0`

---

## T5: Create `src/app/(admin)/chat/page.tsx`

```typescript
// Server component
import { requireAdminSession } from "@/lib/auth/session"
import { OpsSummaryPanel } from "@/components/admin/OpsSummaryPanel"
import { OpsChat } from "@/components/admin/OpsChat"

export default async function AdminChatPage() {
  await requireAdminSession() // redirects to /login if unauthorized
  
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <aside className="w-[280px] border-r flex-shrink-0 overflow-y-auto p-4">
        <OpsSummaryPanel />
      </aside>
      <main className="flex-1 overflow-hidden">
        <OpsChat />
      </main>
    </div>
  )
}
```

---

## T6: Add "Chat" to Admin Sidebar Navigation

**File:** wherever the admin sidebar nav items are defined (find by searching for existing nav items like "Workflows" or "Intake")

Add an entry:
```typescript
{ href: "/admin/chat", label: "Chat", icon: MessageSquareIcon }
```

Position: after "Workflows" in the sidebar order.

---

## T7: Write Tests (4 tests)

**File:** `src/app/api/v1/admin/__tests__/ops-summary.test.ts`

Test suite:
1. Returns 401 when no session
2. Returns 403 when non-staff session
3. Returns correct shape with seeded DB (all counts numeric, all ≥ 0)
4. `intake_queue.new` increments when a NEW intake is added

No UI component tests in this sprint.

---

## T8: QA

See `04-qa-checklist.md`
