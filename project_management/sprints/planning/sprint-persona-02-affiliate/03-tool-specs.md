# Sprint Persona-02: Affiliate Link & Commission Tools — Tool Specs

File: `src/lib/agent/tools/maestro-persona-affiliate.ts`

---

## Tool 1: `get_affiliate_link`

```typescript
const GetAffiliateLinkInput = z.object({});
// No input — uses caller identity
```

**Returns:**
```typescript
{ referralCode: string; referralUrl: string; createdAt: string }
```

**Logic:** SELECT from `referrals` where `user_id = callerId`. If not found, INSERT new row.
`referralUrl = process.env.NEXT_PUBLIC_BASE_URL + "/r/" + referralCode`

---

## Tool 2: `get_affiliate_stats`

```typescript
const GetAffiliateStatsInput = z.object({
  days: z.number().int().positive().default(30),
});
```

**Returns:**
```typescript
{
  clicks:        number;
  conversions:   number;
  totalEarned:   number;    // sum of pending+approved commissions
  pendingPayout: number;
  period:        string;    // "last 30 days"
}
```

See SQL in [02-architecture.md](02-architecture.md).

---

## Tool 3: `list_pending_commissions`

```typescript
const ListPendingCommissionsInput = z.object({
  status: z.enum(['pending','approved','voided','all']).default('pending'),
  limit:  z.number().int().min(1).max(100).default(25),
});
```

**Auth:**
- ADMIN/STAFF: sees all commissions matching `status` filter
- All others: sees only own commissions (`WHERE c.user_id = callerId`)

**SQL:**
```sql
SELECT c.*, r.referral_code, u.email
FROM commissions c
JOIN referrals r ON r.id = c.referral_id
JOIN users     u ON u.id = c.user_id
WHERE (:isAdmin = 1 OR c.user_id = :callerId)
  AND (:status = 'all' OR c.status = :status)
ORDER BY c.created_at DESC
LIMIT :limit;
```

---


---

## Tool 4: `void_commission`

(was Tool 5 in original spec — `approve_payout` removed) `void_commission`

```typescript
const VoidCommissionInput = z.object({
  commissionId: z.string(),
  reason:       z.string().min(5).max(300).describe("Reason for voiding"),
});
```

**ADMIN/STAFF only.** Transaction required. Cannot void already-approved commissions.

**Returns:**
```typescript
{ commissionId: string; status: 'voided'; voidedAt: string }
| { alreadyVoided: true }
```

---

## Registration in `maestro-tools.ts`
Append 4 entries.

**Deferred:** `approve_payout` — see 00-overview.md for rationale.
