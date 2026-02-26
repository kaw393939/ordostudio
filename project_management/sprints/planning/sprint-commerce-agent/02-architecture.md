# Sprint Commerce-Agent — Architecture

---

## File Map

| File | Change |
|------|--------|
| `src/lib/api/maestro-tools.ts` | Append 4 tools to `MAESTRO_TOOLS` |
| `src/evals/scenarios/commerce.ts` | New eval file |

---

## DB Tables Used (existing)

### `deals`
```sql
-- Assumed existing schema
CREATE TABLE IF NOT EXISTS deals (
  id                 TEXT PRIMARY KEY,
  intake_id          TEXT REFERENCES intake_requests(id),
  user_id            TEXT REFERENCES users(id),
  title              TEXT,
  status             TEXT NOT NULL DEFAULT 'OPEN',
  -- OPEN -> SCOPED -> QUALIFIED -> CONTRACT_SENT -> CLOSED_WON -> CLOSED_LOST
  amount_cents       INTEGER,
  maestro_approved   INTEGER NOT NULL DEFAULT 0,
  assigned_to        TEXT REFERENCES users(id),
  created_at         DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at         DATETIME
);
```

---

## MAESTRO_APPROVED Gate

The `maestro_approved` flag prevents the LLM from accidentally advancing a deal
to CLOSED_WON by misunderstanding an ambiguous conversational prompt.

Rule enforced in `advance_deal_stage`:
```typescript
const GATED_STAGES = ['CONTRACT_SENT', 'CLOSED_WON'];
if (GATED_STAGES.includes(args.newStatus)) {
  if (!deal.maestro_approved) {
    return {
      error: 'APPROVAL_GATE_REQUIRED',
      message: 'This stage requires explicit approval. Say "approve deal <id>" to confirm.',
    };
  }
}
```

On explicit "approve" intent, set `maestro_approved = 1` first, then advance.

---

## Feed Events

```typescript
writeFeedEvent(db, {
  type: 'DealAdvanced',
  user_id: deal.user_id,
  metadata: { dealId, fromStatus, toStatus },
});
```
