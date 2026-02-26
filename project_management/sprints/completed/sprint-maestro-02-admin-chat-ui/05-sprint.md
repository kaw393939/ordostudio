# Maestro-02: Admin Chat UI — Sprint Tasks

**Sprint:** `sprint-maestro-02-admin-chat-ui`

---

## T1 — `GET /api/v1/admin/ops-summary` route

**New file:** `src/app/api/v1/admin/ops-summary/route.ts`

Auth check: ADMIN/STAFF. Queries:
```sql
-- funnel (7d)
SELECT status, COUNT(*) as count FROM intake_requests
WHERE created_at >= date('now', '-7 days') GROUP BY status;

-- revenue (7d)
SELECT entry_type, SUM(amount_cents)/100 as total FROM ledger_entries
WHERE created_at >= date('now', '-7 days') AND status = 'EARNED' GROUP BY entry_type;

-- activity (7d)
SELECT type, COUNT(*) as count FROM feed_events
WHERE created_at >= date('now', '-7 days') GROUP BY type ORDER BY count DESC LIMIT 5;
```

Returns combined JSON. **No Claude call.** Pure DB.

---

## T2 — `useOpsSummary` hook

```typescript
// src/hooks/useOpsSummary.ts
export function useOpsSummary() {
  const [data, setData] = useState<OpsSummaryData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = () => { /* call /api/v1/admin/ops-summary, set data */ };
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, []);

  return { data, lastUpdated, error, refresh: fetch };
}
```

---

## T3 — `<OpsSummaryWidget />` component

Renders data from `useOpsSummary`. Sections:
- Intake funnel counts (colored by stage)
- Revenue totals with labels
- Recent activity list (event_type + count)
- Refresh timestamp + manual refresh button

Skeleton loading state while `data === null`.

---

## T4 — `useMaestroChat` hook

```typescript
// src/hooks/useMaestroChat.ts
export function useMaestroChat(userId: string) {
  const storageKey = `maestro_history_${userId}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    JSON.parse(localStorage.getItem(storageKey) ?? '[]')
  );
  const [streaming, setStreaming] = useState(false);
  const [capturedValues, setCapturedValues] = useState<Record<string,string>>({});

  async function send(content: string) { /* SSE fetch, stream, persist */ }
  function clear() { setMessages([]); localStorage.removeItem(storageKey); }

  return { messages, streaming, capturedValues, send, clear };
}
```

---

## T5 — `<MaestroInput />` component

- Textarea: grows 1–3 rows
- Enter submits (preventDefault), Shift+Enter adds newline
- Disabled + spinner when `streaming === true`
- Placeholder: "Ask Maestro anything..."

---

## T6 — `<MaestroChat />` component

- List of messages with role indicators
- Auto-scroll to latest on message append
- Action chips below assistant messages when `capturedValues` present
- "Clear History" button in header

---

## T7 — `/admin/chat/page.tsx` page

```tsx
// src/app/(admin)/admin/chat/page.tsx
export default function AdminChatPage() {
  const { user } = useCurrentUser(); // existing auth hook
  const chat = useMaestroChat(user.id);
  const summary = useOpsSummary();

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 min-w-0">
        <MaestroChat {...chat} />
      </div>
      <div className="w-72 shrink-0 hidden md:block">
        <OpsSummaryWidget {...summary} />
      </div>
    </div>
  );
}
```

---

## T8 — Admin sidebar nav

Find the admin nav component and add:
```tsx
<NavItem href="/admin/chat" icon={MessageSquare} label="Chat" />
```

---

## T9 — Build + commit

```bash
npm run build
git add .
git commit -m "feat(maestro): admin chat UI, ops-summary endpoint, localStorage history"
git push origin main
```
