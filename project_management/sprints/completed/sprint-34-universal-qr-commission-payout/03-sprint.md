# Sprint 34: Universal QR / Commission / Payout — Sprint Plan

## 1. Tasks

### T1: Create Commission Rate Constant
- **File:** Create `src/lib/constants/commissions.ts`
  ```ts
  /** The commission rate paid to affiliates. 20% of Studio Ordo's project fee. */
  export const AFFILIATE_COMMISSION_RATE = 0.20;
  ```
- **Then update all hardcoded rates:**
  - `src/lib/api/referrals.ts`: `getReferralAdminReport()` — change `0.25` to `AFFILIATE_COMMISSION_RATE`
  - `src/app/api/v1/account/referral/route.ts`: change `commission_rate: 0.25` to `commission_rate: AFFILIATE_COMMISSION_RATE`
  - `src/app/(admin)/engagements/` — any server actions or form calculations computing `totalValue * 0.20` or `commission * 0.20` should import `AFFILIATE_COMMISSION_RATE` instead of using a numeric literal.
- **Grep to confirm:** `grep -rn "0\.25\|commission_rate\|\* 0\.20\|\* 0\.2\b" src/` — review all matches and fix any remaining hardcoded rates. The engagements module (Sprint 32) uses `0.20` directly for the referrer commission calculation; update those too.

---

### T2: Pre-Create Referral Code at Registration
- **File:** `src/app/api/v1/auth/register/route.ts`
- **Action:** After the user row is successfully inserted and before returning the 201 response, call `getOrCreateReferralCode()`:
  ```ts
  // After user creation succeeds:
  try {
    getOrCreateReferralCode({ userId: newUser.id, requestId: crypto.randomUUID() });
  } catch (e) {
    // Non-fatal. Log and continue. The code will be lazy-created on first dashboard visit.
    console.error("Failed to pre-create referral code at registration:", e);
  }
  ```
- **Why non-fatal catch:** Registration must succeed even if referral code creation fails. The `getOrCreateReferralCode()` function is idempotent — if it fails here, the code is created on first dashboard visit. The try/catch ensures a DB edge case doesn't break registration.

---

### T3: Verify Referral API URL (verification only)
- **File:** `src/app/api/v1/account/referral/route.ts`
- **Status:** This should already be done — Sprint 26 T4 updated `/r/[code]/route.ts` and Sprint 31 T2 updated the `ReferralCard` URL. This task is a final confirmation.
- **Action:** Confirm `url` in the API response is `\`/card?ref=${referral.code}\`` (not `/r/${referral.code}`). If for any reason it was not updated, apply the fix here.
- **Pass condition:** QR code encodes `https://studioordo.com/card?ref=CODE`, not `/r/CODE`.

---

### T4: Create `payout_tax_info` Table Migration
- **File:** DB schema / migration (same place as Sprint 33 T2's `feed_events` table)
- **Schema:**
  ```sql
  CREATE TABLE IF NOT EXISTS payout_tax_info (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL UNIQUE,
    legal_name   TEXT NOT NULL,
    entity_type  TEXT NOT NULL CHECK(entity_type IN ('INDIVIDUAL','LLC','S_CORP','C_CORP')),
    address_line1 TEXT NOT NULL,
    city         TEXT NOT NULL,
    state        TEXT NOT NULL,
    postal_code  TEXT NOT NULL,
    country      TEXT NOT NULL DEFAULT 'US',
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  ```
- **Note:** `UNIQUE` on `user_id` — one tax info record per user. Use INSERT OR REPLACE if they re-submit.

---

### T5: Create `POST /api/v1/account/payout-activate` Route
- **File:** `src/app/api/v1/account/payout-activate/route.ts`
- **Schema (Zod):**
  ```ts
  const schema = z.object({
    legal_name:    z.string().min(2),
    entity_type:   z.enum(["INDIVIDUAL", "LLC", "S_CORP", "C_CORP"]),
    address_line1: z.string().min(3),
    city:          z.string().min(2),
    state:         z.string().min(2),
    postal_code:   z.string().min(3),
    country:       z.string().length(2).default("US"),
  });
  ```
- **Handler logic:**
  1. Auth check (require session)
  2. Parse + validate body (422 on validation failure)
  3. Write to `payout_tax_info` (INSERT OR REPLACE)
  4. Append audit log: `api.payout.taxinfo.submit`
  5. Call `createStripeConnectOnboardingLinkForUser()` to get `onboarding_url`
  6. Return 200 with `{ onboarding_url }`

---

### T6: Build Payout Activation UI Component
- **File:** `src/components/dashboard/payout-activation.tsx`
- **Action:** `"use client"` component. Renders the two-step UI from `02-ux-design.md`:
  - Step 1: "Set up payouts" button (GET `/api/v1/account/stripe-connect` to check current status)
  - Step 2: Tax info form (POST `/api/v1/account/payout-activate`)
  - On success: `window.location.href = data.onboarding_url`
  - Shows field-level errors from 422 response
- **Props:** `stripeStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE"` (passed from dashboard page which already fetches stripe-connect status)
- The component renders:
  - If `COMPLETE`: "✓ Active" state (no form)
  - If `IN_PROGRESS`: "Resume Stripe setup →" button (re-calls POST to get a fresh onboarding_url)
  - If `NOT_STARTED`: Full tax info form

---

### T7: Add Payout Activation Component to Account Page
- **File:** `src/app/(public)/dashboard/page.tsx` (or wherever the account/settings section lives)
- **Action:** Import and conditionally render `PayoutActivation` when `isAffiliate` is true.
  If the stripe-connect status is already fetched for the feed injection (Sprint 33 T6), pass it as a prop. Otherwise, the `PayoutActivation` component can fetch it internally.

---

### T8: Write Commission Math and Attribution Tests
- **File:** `src/app/__tests__/e2e-commission-math.test.ts`

  **Test 1: Commission constant is 20%**
  ```ts
  import { AFFILIATE_COMMISSION_RATE } from "@/lib/constants/commissions";
  expect(AFFILIATE_COMMISSION_RATE).toBe(0.20);
  ```

  **Test 2: Admin report calculates commission at 20%**
  - Set up an accepted proposal for $10,000 attributed to a referral code
  - Call `getReferralAdminReport()` 
  - Assert `commission_owed_cents` = `$10,000 × 0.20 × 100` = `200000` (or the correct model amount — verify with product owner which basis is used)

  **Test 3: Referral code pre-exists immediately after registration**
  ```ts
  // Register user
  // Query referral_codes table directly
  const row = db.prepare("SELECT * FROM referral_codes WHERE user_id = ?").get(newUserId);
  expect(row).toBeTruthy();
  ```

  **Test 4: Unapproved user gets attributed conversion (code works before affiliate approval)**
  - Register user (no AFFILIATE role yet)
  - Submit intake with user's `so_ref` code
  - Assert `referral_conversions` row exists for the code owner
  - Assert commission is tracked in admin report

  **Test 5: `payout-activate` returns 422 for missing fields**
  - POST to `/api/v1/account/payout-activate` with empty body
  - Assert 422

  **Test 6: `payout-activate` writes tax info and returns `onboarding_url`**
  - POST with valid payload
  - Assert 200 with `onboarding_url` in response
  - Assert `payout_tax_info` row exists in DB with correct `legal_name` and `entity_type`
  - Assert audit log entry `api.payout.taxinfo.submit` exists

---

### T9: Verify + Build
  1. `npx vitest run` — all new tests pass, no existing tests broken.
  2. `npm run build` — no errors.
  3. Manual: newly registered user → `/dashboard` → `ReferralCard` shows immediately (code pre-created).
  4. Manual: QR code in `ReferralCard` encodes `https://studioordo.com/card?ref=CODE`.
  5. Manual: `ReferralCard` disclosure reads "20%" not "25%".
  6. Manual: Affiliate user → account page → payout section shows tax form → submit → redirects to Stripe Connect.
  7. Manual: admin referral report shows `commission_owed_cents` at 20%.

---

## 2. Dependency Graph

```
T1 (commission constant)
          │
          ├──► fixes referrals.ts (admin report)
          └──► fixes referral/route.ts (API response)

T2 (pre-create code at registration — independent)
T3 (fix referral URL — may be no-op if S26/S31 done)

T4 (payout_tax_info table)
          │
          ▼
T5 (payout-activate route)
          │
          ▼
T6 (PayoutActivation UI component)
          │
          ▼
T7 (mount on account page)

T8 (tests — depends on T1, T2, T4, T5)
          │
          ▼
     T9 (verify + build)
```
