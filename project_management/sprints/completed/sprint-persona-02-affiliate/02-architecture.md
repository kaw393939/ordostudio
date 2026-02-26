# Sprint Persona-02: Affiliate Link & Commission Tools — Architecture

## Data Model

```
referrals
  id, user_id (affiliate), referral_code, created_at

referral_conversions
  id, referral_id, intake_id, conversion_type (CLICK|INTAKE|DEAL),
  converted_at

commissions
  id, referral_id, user_id (beneficiary), amount, status
  (pending|approved|voided), created_at, approved_at, voided_at,
  void_reason
```

## `get_affiliate_link` Upsert Pattern

```typescript
const existing = db.prepare(
  "SELECT * FROM referrals WHERE user_id = ?"
).get(callerId);

if (existing) return existing;

// Generate random code
const code = generateShortCode();  // e.g. "abc123"
db.prepare(`
  INSERT INTO referrals (id, user_id, referral_code, created_at)
  VALUES (?, ?, ?, datetime('now'))
`).run(generateId(), callerId, code);
```

## `get_affiliate_stats` SQL

```sql
SELECT
  COUNT(DISTINCT rc.id) FILTER (WHERE rc.conversion_type='CLICK')   AS clicks,
  COUNT(DISTINCT rc.id) FILTER (WHERE rc.conversion_type='INTAKE')  AS conversions,
  SUM(c.amount)         FILTER (WHERE c.status IN ('pending','approved'))
                                                                     AS total_earned,
  SUM(c.amount)         FILTER (WHERE c.status='pending')            AS pending_payout
FROM referrals r
LEFT JOIN referral_conversions rc ON rc.referral_id = r.id
  AND rc.converted_at >= datetime('now', '-' || :days || ' days')
LEFT JOIN commissions c ON c.referral_id = r.id
WHERE r.user_id = :userId;
```

## `approve_payout` + `void_commission` Auth + Idempotency

```typescript
// approve_payout
db.transaction(() => {
  const c = db.prepare("SELECT * FROM commissions WHERE id=?").get(commissionId);
  if (!c) throw new Error("COMMISSION_NOT_FOUND");
  if (c.status === "approved") return { alreadyApproved: true };
  if (c.status === "voided")   throw new Error("CANNOT_APPROVE_VOIDED");

  db.prepare(`
    UPDATE commissions SET status='approved', approved_at=datetime('now') WHERE id=?
  `).run(commissionId);
  writeAuditLog(db, "COMMISSION_APPROVED", commissionId, actorId);
})();

// void_commission
db.transaction(() => {
  const c = db.prepare("SELECT * FROM commissions WHERE id=?").get(commissionId);
  if (!c) throw new Error("COMMISSION_NOT_FOUND");
  if (c.status === "approved") throw new Error("CANNOT_VOID_APPROVED");
  if (c.status === "voided")   return { alreadyVoided: true };

  db.prepare(`
    UPDATE commissions
    SET status='voided', voided_at=datetime('now'), void_reason=?
    WHERE id=?
  `).run(reason, commissionId);
  writeAuditLog(db, "COMMISSION_VOIDED", commissionId, actorId);
})();
```

## `commission_rate` Bug Fix (carry from Maestro-01)

In `src/app/api/v1/referral/**` — verify `commission_rate: 0.04` (not 0.25).
This is a **pre-condition** for this sprint, not a task here.

## File Map

```
src/lib/agent/tools/
  maestro-persona-affiliate.ts   ← NEW
src/lib/agent/
  maestro-tools.ts               ← MODIFIED (+5 tools → 42 total)
src/evals/
  persona-affiliate.eval.ts      ← NEW
src/evals/fixtures/
  affiliate-seeds.ts             ← NEW
```
