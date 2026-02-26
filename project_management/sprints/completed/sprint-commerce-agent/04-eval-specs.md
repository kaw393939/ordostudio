# Sprint Commerce-Agent — Eval Specs

Eval file: `src/evals/scenarios/commerce.ts`
Eval type: `commerce`

**New evals:** 3
Register type in `src/evals/run.ts`. Add script:
```json
"evals:commerce": "tsx src/evals/run.ts --type commerce"
```

---

## Seed Helper

```typescript
export function seedDeal(db: Database, overrides: Partial<Deal> = {}) {
  const id = overrides.id ?? 'deal-seed-ca';
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, role) VALUES (:userId, :email, 'USER')
  `).run({ userId: overrides.userId ?? 'usr-ca', email: overrides.email ?? 'lead@example.com' });
  db.prepare(`
    INSERT OR REPLACE INTO deals (id, title, status, user_id, amount_cents, maestro_approved, created_at)
    VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(
    id,
    overrides.title ?? 'AI Consulting Project',
    overrides.status ?? 'OPEN',
    overrides.userId ?? 'usr-ca',
    overrides.amount_cents ?? 500000,
  );
  return id;
}
```

---

## Eval CA-01: `list-open-deals`

```typescript
{
  id: "commerce-CA-01-list-deals",
  type: "commerce",
  description: "Agent lists open deals via list_deals",
  preSetup: (db) => {
    seedDeal(db, { id: 'deal-ca-01', title: 'River Chen Project', status: 'OPEN' });
  },
  turns: [
    { role: "user", content: "What deals are currently open?" },
  ],
  assertions: [
    { type: "tool-called", toolName: "list_deals" },
    { type: "content-contains", substring: "River Chen", alternates: ["open", "deals"] },
  ],
},
```

---

## Eval CA-02: `advance-deal-stage`

```typescript
{
  id: "commerce-CA-02-advance",
  type: "commerce",
  description: "Agent advances a deal stage with explicit approval",
  preSetup: (db) => seedDeal(db, { id: 'deal-ca-02', status: 'QUALIFIED' }),
  turns: [
    {
      role: "user",
      content: "The River Chen deal is ready to move to contract. Approve and advance it to CONTRACT_SENT.",
    },
  ],
  assertions: [
    { type: "tool-called", toolName: "advance_deal_stage" },
    { type: "db-assert", query: "SELECT status FROM deals WHERE id = 'deal-ca-02'", expect: { status: 'CONTRACT_SENT' } },
    { type: "db-assert", query: "SELECT COUNT(*) as n FROM feed_events WHERE type = 'DealAdvanced'", expect: { n: 1 } },
  ],
},
```

---

## Eval CA-03: `get-customer-timeline`

```typescript
{
  id: "commerce-CA-03-timeline",
  type: "commerce",
  description: "Agent retrieves full customer activity timeline",
  preSetup: (db) => {
    seedDeal(db, { id: 'deal-ca-03', userId: 'usr-ca-03', email: 'Jordan@example.com' });
    db.prepare("INSERT OR IGNORE INTO intake_requests (id, email, user_id, status, created_at) VALUES ('ir-ca-03', 'Jordan@example.com', 'usr-ca-03', 'QUALIFIED', datetime('now', '-10 days'))").run();
  },
  turns: [
    { role: "user", content: "Show me the full history for user usr-ca-03" },
  ],
  assertions: [
    { type: "tool-called", toolName: "get_customer_timeline" },
    { type: "content-contains-any", values: ["intake", "deal", "history", "activity"] },
  ],
},
```
