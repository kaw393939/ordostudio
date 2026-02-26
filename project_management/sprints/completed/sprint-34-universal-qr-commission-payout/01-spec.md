# Sprint 34: Universal QR Codes, Commission Accuracy, and Payout Activation

## 1. Problem Statement

Three separate issues compound into a broken promise to affiliates:

### Issue 1 — Commission rate is wrong in the code
`/api/v1/account/referral` returns `commission_rate: 0.25` (25%). `getReferralAdminReport()` calculates `commission_owed_cents` at 25% (`Math.floor(grossAccepted * 0.25)`). The correct rate per the locked business model is **20%**. Every piece of reporting and every disclosure shown to members is showing the wrong number.

### Issue 2 — Referral code is lazy-created, not pre-created
`getOrCreateReferralCode()` creates the code on the first call to `/api/v1/account/referral` (when loading the dashboard). This means:
- The code doesn't exist until the member visits their dashboard
- If someone prints physical cards before a member signs up, the code can't exist until after first login
- There's no guarantee the code is stable before someone tries to share it

The intent: everyone gets a QR code they can use immediately after registration. The code should be created at registration time, not lazily.

### Issue 3 — Tax info is not collected before payout activation
The Stripe Connect onboarding collects payment details, but Studio Ordo needs its own record of the member's tax information (legal name, address, entity type) for 1099 issuance compliance. Currently there's no step between "I want to get paid" and "here's your Stripe Connect link." There's no record of tax info on the Studio Ordo side.

The correct flow:
```
Member wishes to activate payouts
          │
          ▼
Submit tax info (legal name, entity type, address)  ← NEW step
          │
          ▼
Studio Ordo stores record
          │
          ▼
Redirect to Stripe Connect onboarding (already exists)
          │
          ▼
Stripe Connect complete → payouts_enabled = true → feed event (Sprint 33)
```

**Sprint 34 depends on:** Sprint 33 (feed events for payout status exist); Sprint 26 (`/card` QR URL corrected).

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Commission rate is `0.20` everywhere: referral API response, admin report, `ReferralCard` disclosure. |
| 2 | `getReferralAdminReport()` calculates `commission_owed_cents` at 20% (not 25%). |
| 3 | A referral code is created for a user at registration time, not lazy-created. |
| 4 | Calling `/api/v1/account/referral` immediately after registration returns a code (no first-visit-creates-it lag). |
| 5 | `POST /api/v1/account/payout-activate` accepts legal name, entity type, address, and country. Returns 200 on success, 422 on validation failure. |
| 6 | On successful `payout-activate` submission, the route returns an `onboarding_url` pointing to Stripe Connect. |
| 7 | A `payout_tax_info` record is written to the DB containing the member's legal name and entity type (SSN/EIN are held by Stripe, not us). |
| 8 | The payout activation form in the dashboard collects: legal name, entity type (Individual / LLC / S-Corp / C-Corp), address line 1, city, state/province, postal code, country. |
| 9 | The form is only shown when: user has AFFILIATE role AND Stripe Connect is not yet active. |
| 10 | A written test asserts the full commission math chain: intake submitted → deal proposal accepted at $X → commission record shows 20% → affiliate payout amount is 20% of Studio Ordo's fee (i.e., 4% of project total if Studio Ordo takes 20%). | 
| 11 | A written test asserts: new user registers → referral code exists in DB immediately (without calling the referral API first). |
| 12 | A written test asserts: unapproved user can share QR link → conversion is attributed → commission is tracked even without payout activation (held, not sent). |
| 13 | `npm run build` succeeds. All tests pass. |

---

## 3. Decisions

1. **Studio Ordo does NOT store SSN/EIN/TIN.** Stripe handles KYC. What Studio Ordo stores is only: legal name, entity type, address. This is enough to issue a 1099-NEC if needed, referencing the Stripe Connect account for the actual tax ID. Never store raw tax IDs in the app DB.

2. **Commission rate is a named constant.** Define `const AFFILIATE_COMMISSION_RATE = 0.20` in a shared constants file (e.g., `src/lib/constants/commissions.ts`). All places that compute commission import this constant. Never hardcode `0.20` or `0.25` in business logic.

3. **Referral code creation at registration is a synchronous side-effect.** When `POST /api/v1/auth/register` succeeds and the user row is inserted, call `getOrCreateReferralCode()` with the new user's ID. This is already safe — the function is idempotent (returns existing if found, creates if not). No schema change needed.

4. **`payout-activate` endpoint validates before calling Stripe.** If the form data is invalid (empty legal name, no entity type, etc.), return 422 before hitting Stripe. Only call `createStripeConnectOnboardingLinkForUser()` once local validation passes and the `payout_tax_info` record is written.

5. **Attribution is independent of payout activation.** A member can share their referral code and receive attributed conversions before they ever activate payouts. The commission is tracked and shown in the admin report as `commission_owed_cents`. It is not sent until Stripe Connect is active. This is the correct "opt-in to payouts" model — not "opt-in to attribution."

6. **Commission math definition (locked):**
   - Project value: $X
   - Studio Ordo fee (20% of project): $X × 0.20
   - Affiliate commission (20% of Studio Ordo's fee): ($X × 0.20) × 0.20 = $X × 0.04
   - Example: $40,000 project → Studio Ordo earns $8,000 → Affiliate earns $1,600
   - **Verify this model with the product owner** before the test in T8 is written. If the model is "20% of project total goes to affiliate," the math is different ($40,000 × 0.20 = $8,000 to affiliate). The `AFFILIATE_COMMISSION_RATE` constant makes changing this a single-line edit everywhere.
   - **Cross-reference:** Sprint 32 T5 encodes the `REFERRER_COMMISSION` ledger entry as `commission * AFFILIATE_COMMISSION_RATE`. Once the product owner confirms the basis (commission-of-commission vs project total), update Sprint 32's implementation and this sprint's test to use the same logic. Both must match.
   - **Sprint 32 runs independently** and may already be deployed before this sprint. If so, apply the constant and any math correction to the engagements module as part of T1.
