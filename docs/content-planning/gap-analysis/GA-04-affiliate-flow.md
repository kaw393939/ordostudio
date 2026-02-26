# GA-04 — Affiliate Flow
**User type:** The lowest guild tier. Someone who refers buyers or learners to Studio Ordo — shares their referral link and QR card, earns commission on conversions.  
**Entry points:** `/affiliate` (info page), `/join` → "I want to join the guild", `/card` QR scan (as the card-giver, not the recipient)  
**Revenue goal:** Commission attribution — Affiliate earns a share when a referred project or training enrollment closes.

**Definition (locked):** There is one Affiliate type. An Affiliate is a guild member at the entry tier. They refer work. They get a referral code and QR card. Companies wanting team training are buyers — they go through `/services/request`, not a separate affiliate path.

---

## Flow Map

```
/affiliate (info page)
     │
     ├── [Already has account] → /dashboard → ReferralCard
     │
     └── [New user] → /register → /login → /apply/affiliate
                                                │
                                                ▼
                                      /dashboard?applied=affiliate
                                                │
                                                ▼
                              [Admin: /admin/approvals → APPROVE]
                                                │
                                                ▼
                                      /dashboard → ReferralCard
                                      (shows code, QR, copy link)
```

---

## Page 1 — `/affiliate`

**File:** `src/app/(public)/affiliate/page.tsx`

### What exists
- Correct overall framing: "Share Studio Ordo, get attribution, get paid."
- How it works: 3-step list (sign up, copy link, track)
- "What to share" card: events, studio model, newsletter
- "Rules of the road" card (full content not read)
- CTAs: "Open my dashboard" and "Create an account"

### What's needed
| Item | Gap |
|------|-----|
| Commission rate | Page does not state what affiliates earn. `ReferralPayload` in dashboard has `commission_rate` — surface this prominently on the info page. |
| What triggers a commission | Is it a project commission? A Maestro Training enrollment? A paid event registration? Not stated — needs to be defined and published. |
| Cookie attribution window | How long does the `so_ref` cookie last? (90 days per `r/[code]/route.ts`.) Should be stated on this page. |
| "Get your referral link" CTA | No "apply" or "get started" path visible — just "Open my dashboard" (assumes account exists). Add a link to `/register?role=affiliate` for new visitors. |

---

## Page 2 — `/apply/affiliate`

**File:** `src/app/(public)/apply/affiliate/page.tsx`

### What exists
- Form: `website` (URL) + `audienceSize` (text)
- Incomplete: `useEffect` has TODO comments about fetching role ID — code has placeholder comments that were never resolved
- POSTs to `/api/v1/roles/request` with `requested_role_name: "AFFILIATE"`, `context: { website, audienceSize }`
- On success: redirects to `/dashboard?applied=affiliate`

### What's needed
| Item | Gap |
|------|-----|
| `useEffect` dead code | The `useEffect` is empty with TODO comments — a developer reading this will be confused. Either complete it or remove it. |
| Form fields | `website` + `audienceSize` are generic. Consider: what does the admin reviewer actually need to evaluate an affiliate application? Add: `platform` (newsletter / community / employer / other), `audience_description`. |
| Terms | Affiliate programs typically require explicit commission disclosure acceptance — not present |
| `so_ref` attribution | If a corporate affiliate refers an individual affiliate, that chain isn't tracked |

### What to remove
- The empty `useEffect` with TODO comments (dead code)

---

## Page 3 — `/dashboard` (affiliate view)

**File:** `src/app/(public)/dashboard/page.tsx` + `referral-card.tsx`

### What exists
- `isAffiliate` role detection
- `isAffiliateOnly` flag for dashboard subtitle: "Share your referral link, track attribution, and get paid."
- `ReferralCard` component:
  - Fetches referral payload from `/api/v1/account/referral`
  - Shows: code, URL, commission rate, disclosure statement
  - Generates QR code (via `qrcode` npm package)
  - Copy-to-clipboard button

### What's needed
| Item | Gap |
|------|-----|
| QR code destination | `ReferralCard` generates QR from `referral.url` — currently that URL points to `/r/CODE` which redirects to `/services`. After `/card` is built, the referral URL should be `/card?ref=CODE` |
| Conversion tracking | Dashboard shows `code`, `url`, `commission_rate` but no conversion count or earnings total — affiliate has no visibility into how many referrals have converted |
| Payment status | No payout status displayed — affiliates can't see when commissions are approved or paid |

---

## Page 4 — `/r/[code]` Referral Redirect

**File:** `src/app/r/[code]/route.ts`

### What exists
- GET handler: records click, sets `so_ref` cookie (90-day), redirects to `/services`

### What's needed
| Item | Change |
|------|--------|
| Redirect destination | `/services` → `/card?ref=CODE` (once `/card` is built) |

---

## Admin: Referrals (`/admin/referrals`)

**File:** `src/app/(admin)/admin/referrals/page.tsx`

### What exists
- Report view: per-affiliate row with clicks, conversions, conversion rate, gross accepted amount, commission owed
- Totals row
- `focusedCode` for drilling into a specific affiliate

### What's needed
| Item | Gap |
|------|-----|
| Commission approval workflow | Report shows `commission_owed_cents` but there's no approve/pay button on this page — that lives in `/admin/ledger`. The connection between this view and the ledger isn't surfaced. |
| Attribution source | Report doesn't show which product the conversions came from (project vs. training vs. event) |
| Affiliate detail | No drill-down to see individual conversion events for a code |

---

## Admin: Ledger (`/admin/ledger`)

**File:** `src/app/(admin)/admin/ledger/page.tsx`

### What exists
- List of ledger entries: `PROVIDER_PAYOUT`, `REFERRER_COMMISSION`, `PLATFORM_REVENUE`
- Status: EARNED → APPROVED → PAID → VOID
- Bulk approve action
- Export link

### What's needed
| Item | Gap |
|------|-----|
| Project commission entry creation | How does a 20% project commission get entered into the ledger? No UI for creating ledger entries from a completed project — entries presumably come from the deals/commercial system |
| Payment method | No payment method (bank transfer, PayPal, etc.) collected from affiliate at apply time or in dashboard |

---

## What to Remove from the Codebase

| Item | Reason |
|------|--------|
| GuildJoinFlow Q1 option `"company"` | "I represent a company or team" was the Corporate Affiliate path. Removed. Companies booking team training are buyers — they go through `/services/request`. |
| GuildJoinFlow result card `"Corporate Affiliate"` | Same — no longer a distinct type. |
| `BOOKING_URL?path=affiliate` CTA from wizard | Replaced: companies go to `/services/request`, individuals go to `/apply/affiliate`. |
