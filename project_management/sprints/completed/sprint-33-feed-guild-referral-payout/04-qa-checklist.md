# Sprint 33: Activity Feed — QA Checklist

## 1. Role Request Events in Feed

- [ ] Submit a role request (Affiliate, Apprentice, or Journeyman) → dashboard feed shows a `RoleRequestUpdate` item with text **"Application submitted — pending review."**
- [ ] Admin approves role request → member's feed shows item: **"Your [Role] application was approved."**
- [ ] Admin rejects role request → member's feed shows item: **"Your [Role] application was not approved."**
- [ ] Approval/rejection feed item appears **without requiring page reload** — or appears on next feed load.
- [ ] Role request feed items are sorted with newest first.

---

## 2. Payout Activation Action Item

- [ ] Member with AFFILIATE role who has NOT set up Stripe Connect sees a `FollowUpAction` feed item: **"Activate your payout account."**
- [ ] That item has `actionUrl` pointing to `/account`.
- [ ] Member who HAS completed Stripe Connect (`payouts_enabled = true`) does NOT see the "Activate" item.
- [ ] Non-AFFILIATE users do NOT see the "Activate payout" feed item.
- [ ] After completing Stripe Connect, a `PayoutStatus` feed item appears: **"Payout account active."**

---

## 3. Referral Conversion Events in Feed

- [ ] A referral conversion (intake submitted with affiliate's `so_ref` cookie) creates a `ReferralActivity` feed item visible to the code owner.
- [ ] Feed item title: **"Referral converted."**
- [ ] Feed item description references the referral code (e.g., "Code MYCODE").
- [ ] Feed item description does NOT contain: lead's email, lead's name, lead's company, or any contact PII.

---

## 4. ReferralCard on Dashboard

- [ ] `ReferralCard` is visible on the dashboard for ALL authenticated users — including users with no guild role.
- [ ] `ReferralCard` shows a referral code.
- [ ] `ReferralCard` shows a QR code that encodes `/card?ref=CODE` (not `/r/CODE`).  
- [ ] `ReferralCard` has "Copy URL" button — copies the full referral URL to clipboard.
- [ ] `ReferralCard` has "Download QR" link — downloads a PNG of the QR code.
- [ ] `ReferralCard` calls `getOrCreateReferralCode()` — second visit gets the same code, not a new one.

---

## 5. Automated Tests

- [ ] **Test 1:** Role request submission → feed item with `type === "RoleRequestUpdate"` and `"pending review"` in title. ✅ passes
- [ ] **Test 2:** Role request approval → feed item with `"approved"` in title. ✅ passes
- [ ] **Test 3:** Affiliate approval + no Stripe Connect → `FollowUpAction` item `"Activate your payout account."` in feed. ✅ passes
- [ ] **Test 4:** Affiliate approval + `payouts_enabled = true` → NO "Activate" item in feed. ✅ passes
- [ ] **Test 5:** Referral conversion → `ReferralActivity` item in code owner's feed. ✅ passes
- [ ] **Test 6:** Referral conversion feed item body has NO lead email or name. ✅ passes
- [ ] **Test 7:** Stripe Connect `payouts_enabled` transition → `PayoutStatus` item in feed. ✅ passes
- [ ] All existing feed tests (`src/app/api/v1/me/__tests__/feed-api.test.ts`) still pass.
- [ ] All existing referral attribution tests (`src/app/__tests__/e2e-referrals-attribution.test.ts`) still pass.

---

## 6. Build

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
