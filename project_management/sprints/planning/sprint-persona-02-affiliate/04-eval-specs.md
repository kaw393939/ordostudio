# Sprint Persona-02: Affiliate Link & Commission Tools — Eval Specs

Eval file: `src/evals/persona-affiliate.eval.ts`
Seed helper: `src/evals/fixtures/affiliate-seeds.ts`

---

## Seed Helper: `affiliate-seeds.ts`

```typescript
export function seedAffiliateFixtures(db: Database) {
  db.prepare(`INSERT OR IGNORE INTO users (id,email,role,created_at) VALUES
    ('u-aff-1',   'affiliate@test.com', 'ASSOCIATE', datetime('now','-20 days')),
    ('u-admin-2', 'admin2@test.com',    'ADMIN',     datetime('now','-90 days'))
  `).run();

  db.prepare(`INSERT OR IGNORE INTO referrals (id,user_id,referral_code,created_at) VALUES
    ('ref-1','u-aff-1','AFF001',datetime('now','-20 days'))
  `).run();

  db.prepare(`INSERT OR IGNORE INTO referral_conversions
    (id,referral_id,conversion_type,converted_at) VALUES
    ('rc-1','ref-1','CLICK',  datetime('now','-5 days')),
    ('rc-2','ref-1','CLICK',  datetime('now','-3 days')),
    ('rc-3','ref-1','INTAKE', datetime('now','-2 days'))
  `).run();

  db.prepare(`INSERT OR IGNORE INTO commissions
    (id,referral_id,user_id,amount,status,created_at) VALUES
    ('com-1','ref-1','u-aff-1', 40.00,'pending', datetime('now','-2 days')),
    ('com-2','ref-1','u-aff-1',  0.00,'voided',  datetime('now','-10 days'))
  `).run();
}
```

---

## Eval P2-01: `get-affiliate-link`

**Goal:** Affiliate asks for their referral link; tool returns code and URL.

```typescript
{
  id: "persona-affiliate-P2-01-get-link",
  description: "Affiliate retrieves their referral link",
  callerId: "u-aff-1",
  callerRole: "ASSOCIATE",
  preSetup: (db) => seedAffiliateFixtures(db),
  turns: [
    { role: "user", content: "What's my referral link?" },
  ],
  assertions: [
    { type: "tool-called", toolName: "get_affiliate_link" },
    { type: "content-contains", substring: "AFF001" },
    { type: "content-matches-regex", pattern: /https?:\/\//i },
  ],
},
```

---

## Eval P2-02: `view-commissions`

**Goal:** Affiliate asks about pending commissions; tool returns correct amount.

```typescript
{
  id: "persona-affiliate-P2-02-commissions",
  description: "Affiliate views their pending commissions — correct amount shown",
  callerId: "u-aff-1",
  callerRole: "ASSOCIATE",
  preSetup: (db) => seedAffiliateFixtures(db),
  turns: [
    { role: "user", content: "How much commission do I have pending?" },
  ],
  assertions: [
    {
      type: "tool-called",
      toolName: "get_affiliate_stats",
      alternateTools: ["list_pending_commissions"],
    },
    // $40 pending commission
    { type: "content-matches-regex", pattern: /\$40|40\.00|40 dollar/i },
    // Should NOT show other affiliates' commissions
    { type: "content-not-contains", substring: "admin2@test.com" },
  ],
},
```

---

## Eval P2-03: `payout-approve`

**Goal:** Admin approves a pending commission; DB row updated and audit logged.

```typescript
{
  id: "persona-affiliate-P2-03-approve-payout",
  description: "Admin approves commission — DB updated, audit logged",
  callerId: "u-admin-2",
  callerRole: "ADMIN",
  preSetup: (db) => seedAffiliateFixtures(db),
  turns: [
    { role: "user", content: "Approve the commission com-1." },
  ],
  assertions: [
    { type: "tool-called", toolName: "approve_payout" },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM commissions WHERE id='com-1' AND status='approved'",
    },
    {
      type: "db-row-exists",
      sql: "SELECT id FROM audit_log WHERE action='COMMISSION_APPROVED' AND target_id='com-1'",
    },
    { type: "content-matches-regex", pattern: /approved/i },
  ],
},
```
