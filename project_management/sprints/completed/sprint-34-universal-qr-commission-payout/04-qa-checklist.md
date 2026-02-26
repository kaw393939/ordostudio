# Sprint 34: Universal QR / Commission / Payout — QA Checklist

## 1. Commission Rate Accuracy

- [ ] `/api/v1/account/referral` returns `commission_rate: 0.2` (not `0.25`).
- [ ] `ReferralCard` disclosure reads **"earn 20% commission"** — no "25%" anywhere.
- [ ] Admin referral report `commission_owed_cents` is calculated at 20%.
- [ ] Grep result: `grep -r "0\.25" src/lib/api/referrals.ts` returns zero matches.
- [ ] `AFFILIATE_COMMISSION_RATE` constant is imported in all commission-computing code paths (not hardcoded inline).

---

## 2. Universal QR — Code Pre-Creation

- [ ] Register a brand-new user.
- [ ] Without visiting `/dashboard`, query the `referral_codes` table — the user has a referral code already.
- [ ] Calling `/api/v1/account/referral` returns the same code (idempotent — does not create a second one).
- [ ] Registration still succeeds even if the referral code creation step fails (non-fatal error handling confirmed in code review).

---

## 3. ReferralCard URL

- [ ] QR code in `ReferralCard` encodes: `https://studioordo.com/card?ref=MYCODE`.
- [ ] Copyable referral URL in `ReferralCard` shows: `studioordo.com/card?ref=MYCODE`.
- [ ] No occurrence of `/r/MYCODE` as the referral URL in the dashboard.

---

## 4. Payout Activation — Tax Info Form

- [ ] Payout section visible on account page when user has AFFILIATE role AND Stripe Connect is `NOT_STARTED`.
- [ ] Form fields present: legal name, entity type (4 options), address line 1, city, state, postal code, country.
- [ ] Submitting with empty legal name returns validation error — form does not submit to Stripe.
- [ ] Submitting with valid data POSTs to `/api/v1/account/payout-activate`.
- [ ] On 200 response: browser redirects to the Stripe Connect onboarding URL.
- [ ] On 422 response: field-level errors displayed inline.
- [ ] Legal notice visible on form: Studio Ordo does NOT store SSN or EIN.

---

## 5. Payout Activation — Data Persistence

- [ ] After submitting the tax info form, a row exists in `payout_tax_info` with the correct `legal_name` and `entity_type`.
- [ ] Audit log contains an entry with action `api.payout.taxinfo.submit`.
- [ ] Re-submitting the form (e.g., user wants to update) replaces the existing row, not creates a duplicate.

---

## 6. Payout Status States

- [ ] Stripe Connect `status: NOT_STARTED` → tax info form shown.
- [ ] Stripe Connect `status: IN_PROGRESS` (details submitted, not verified) → "Resume Stripe setup →" button shown, no form.
- [ ] Stripe Connect `payouts_enabled: true` → "✓ Active" state shown, no form, no button.
- [ ] Non-AFFILIATE users → payout section not shown at all.

---

## 7. Attribution Without Payout Activation

- [ ] User has AFFILIATE role, no Stripe Connect set up.
- [ ] Someone scans their QR → `/card?ref=CODE` → sets `so_ref` cookie → submits intake.
- [ ] Admin report shows `conversions >= 1` and `commission_owed_cents > 0` for that user.
- [ ] Commission is tracked even though payouts are not yet activated.
- [ ] User sees the referral conversion in their feed (from Sprint 33).

---

## 8. Automated Tests

- [ ] **Test 1:** `AFFILIATE_COMMISSION_RATE === 0.20`. ✅ passes
- [ ] **Test 2:** Admin report commission math at 20%. ✅ passes
- [ ] **Test 3:** Referral code exists in DB immediately after registration. ✅ passes
- [ ] **Test 4:** Conversion attributed to user who has no AFFILIATE role yet. ✅ passes
- [ ] **Test 5:** `payout-activate` returns 422 on empty payload. ✅ passes
- [ ] **Test 6:** `payout-activate` returns 200 + `onboarding_url` + writes `payout_tax_info` + audit entry. ✅ passes
- [ ] All Sprint 33 feed tests still pass.
- [ ] All pre-existing referral attribution tests still pass.

---

## 9. Build

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
