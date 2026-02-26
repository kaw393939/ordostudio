# Sprint Map: Sprints 24–34

**Last updated:** 2026-02-25  
**Status:** All 11 sprint packages written. Ready for implementation.

---

## 1. Execution Order

Sprints must be executed in dependency order. Sprints marked **PARALLEL-SAFE** can run alongside any sprint that doesn't share their files.

```
                    ┌─────────────────────────────────────────┐
                    │  PARALLEL-SAFE (no page/route deps)     │
                    │  Sprint 32 — Admin Engagements          │
                    └─────────────────────────────────────────┘

Sprint 24 (CTA fixes — string edits only, no deps)
    │
    ▼
Sprint 25 (/maestro — new page)
    │
    ├──► Sprint 26 (/card QR landing — needs /maestro)
    │         │
    │         ▼
    │    Sprint 31 (referral fixes — needs /card to exist)
    │
    └──► Sprint 27 (/studio rewrite — needs S24 conventions done)
              │
              ▼
         Sprint 28 (homepage rewrite — needs S25 + S27)
              │
              ▼
         Sprint 29 (/join replacement — needs S25 + S27)
              │
              ▼
         Sprint 30 (/apply flow — needs S29)
              │
              ▼
         Sprint 33 (feed events — needs feed_events table + S26/31 URL fixes)
              │
              ▼
         Sprint 34 (QR + commission + payout — needs S33)
```

**Recommended implementation sequence:**

| Step | Sprint | Focus | Can run in parallel with |
|------|--------|-------|--------------------------|
| 1 | 24 | CTA string fixes | — |
| 2 | 25 | `/maestro` new page | 32 |
| 3 | 26 | `/card` QR landing | 27, 32 |
| 4 | 27 | `/studio` rewrite | 26, 32 |
| 5 | 28 | Homepage hero rewrite | 32 |
| 6 | 29 | `/join` → 3 buttons | 30 prep, 32 |
| 7 | 30 | `/apply` index + form fixes | 32 |
| 8 | 31 | Referral redirect fixes | 32 |
| 9 | 32 | Admin engagements module | any |
| 10 | 33 | Activity feed events | — |
| 11 | 34 | QR + commission + payout | — |

---

## 2. Cross-Sprint Dependencies (Carry Tasks)

| Task | Origin | Carry Target | Condition |
|------|--------|-------------|-----------|
| `/r/[code]` redirect update | S26 T4 | S31 T1 (verify) | Done in S26; S31 T1 is a no-op if so |
| `ReferralCard` QR URL fix | S26 T4 / S31 T2 | S34 T3 (verify) | Done by S26+S31; S34 T3 is final confirm |
| `/api/v1/referrals/resolve` endpoint | S26 T5 | S31 T4 | Build in S26 or defer; S31 T4 is the named carry slot |
| `AFFILIATE_COMMISSION_RATE` constant | S34 T1 | S32 T4/T5 update | When S34 runs, update all `0.20` literals in S32's code |

---

## 3. Commission Math — Locked Model

> **Product owner must confirm which basis before Sprint 34 T8 test is written.**

| Variable | Value | Note |
|----------|-------|------|
| Studio Ordo platform fee | 20% of project value | `project_value × 0.20` |
| Affiliate commission | 20% of Studio Ordo's fee | `(project_value × 0.20) × 0.20` |
| Net affiliate rate on project | 4% of project total | `project_value × 0.04` |

**Example ($40,000 project):**
- Studio Ordo earns: `$40,000 × 0.20 = $8,000`
- Affiliate earns: `$8,000 × 0.20 = $1,600`
- Ledger: `PLATFORM_REVENUE = $8,000`, `REFERRER_COMMISSION = $1,600`

**Alternative model (if confirmed by product owner):**
- Affiliate earns 20% of project total directly: `$40,000 × 0.20 = $8,000`
- If this model is used, update `AFFILIATE_COMMISSION_RATE` in Sprint 34 T1 and `REFERRER_COMMISSION` in Sprint 32 T5.

**Constant location (Sprint 34 T1):** `src/lib/constants/commissions.ts`

---

## 4. DB Migration Map

All DB migrations use raw SQL + better-sqlite3. No Prisma.

| Table | Sprint | File |
|-------|--------|------|
| `feed_events` | 33 T2 | DB init script (`src/cli/db.ts` or equivalent) |
| `payout_tax_info` | 34 T4 | Same DB init script |
| `engagements` | 32 T2 | Same DB init script |

All three tables use `CREATE TABLE IF NOT EXISTS` with `INTEGER`/`TEXT` column types and explicit `CHECK` constraints. No Prisma schema files.

---

## 5. Key Constants and File Locations

| Symbol | File | Sprint created |
|--------|------|---------------|
| `AFFILIATE_COMMISSION_RATE` | `src/lib/constants/commissions.ts` | 34 T1 |
| `writeFeedEvent()` | `src/lib/api/feed-events.ts` | 33 T2 |
| `listFeedEventsForUser()` | `src/lib/api/feed-events.ts` | 33 T2 |
| `getOrCreateReferralCode()` | `src/lib/api/referrals.ts` | exists (extend in 34 T2) |
| `BOOKING_URL` | `src/lib/metadata.ts` | exists |
| `openCliDb()` | `src/cli/db.ts` | exists |

---

## 6. P0 Bugs Already Identified in Live Code

These bugs exist in the current codebase and will be fixed by the sprints noted.

| Bug | File | Fixed in |
|-----|------|---------|
| `commission_rate: 0.25` in API response | `src/app/api/v1/account/referral/route.ts` | S34 T1 |
| `getReferralAdminReport()` calculates at 25% | `src/lib/api/referrals.ts` | S34 T1 |
| `/r/[code]` redirects to `/services` | `src/app/r/[code]/route.ts` | S26 T4 |
| `ReferralCard` exists but is never rendered on dashboard | `src/app/(public)/dashboard/page.tsx` | S33 T7 |
| Referral code lazy-created (not at registration) | `src/app/api/v1/auth/register/route.ts` | S34 T2 |
| No feed events for guild/referral/payout events | `src/lib/api/feed.ts` + feed route | S33 T1–T6 |
| No tax info step before Stripe Connect | missing route | S34 T4–T6 |

---

## 7. QA Sign-Off Summary

Each sprint has a `04-qa-checklist.md`. A sprint is considered **DONE** when:
1. All checklist items are checked ✅
2. `npx vitest run` passes
3. `npm run build` passes
4. Any carry tasks are documented with target sprint

---

## 8. Sprint Status

| Sprint | Files | Status |
|--------|-------|--------|
| 24 | 4/4 | ✅ Written |
| 25 | 4/4 | ✅ Written |
| 26 | 4/4 | ✅ Written |
| 27 | 4/4 | ✅ Written |
| 28 | 4/4 | ✅ Written |
| 29 | 4/4 | ✅ Written |
| 30 | 4/4 | ✅ Written |
| 31 | 4/4 | ✅ Written |
| 32 | 4/4 | ✅ Written |
| 33 | 4/4 | ✅ Written |
| 34 | 4/4 | ✅ Written |
