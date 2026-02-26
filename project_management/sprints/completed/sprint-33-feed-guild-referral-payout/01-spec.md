# Sprint 33: Activity Feed — Guild, Referral, and Payout Events

## 1. Problem Statement

The dashboard `ActionFeed` is wired to three sources: event registrations, engagement timeline items, and follow-up actions. All other business-critical events are invisible to the member:

| Event | Current state |
|-------|--------------|
| Role request submitted | Email sent to admin. Nothing in member's feed. |
| Role request approved / rejected | Email sent to member. Nothing in the feed that persists. |
| Affiliate approved → payout not activated | Nothing tells them to take action. |
| Referral converted | Tracked in DB. Member never sees it in their dashboard. |
| Stripe Connect onboarding complete | Status visible only by navigating to account settings. |

From the dashboard page code, the role-check logic already computes `isAffiliate`, `isAffiliateOnly`, and `isOperatorDashboard` — but none of those states create feed items. The `ReferralCard` component exists but is never rendered anywhere on the dashboard. The `FeedItem` type already declares `OnboardingProgress`, `SubscriptionEvent`, and `TriageTicket` as valid types — none are populated.

**The result:** A member who was just approved as an Affiliate has no feed item telling them to activate payouts. A member who just generated a referral conversion has no confirmation it was attributed. The dashboard is silent on the events that determine their income.

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | When a role request is submitted, a `RoleRequestUpdate` feed item appears in the member's feed: `"Application submitted — pending review."` |
| 2 | When an admin approves a role request, a `RoleRequestUpdate` feed item appears: `"Your [Role] application was approved."` |
| 3 | When an admin rejects a role request, a `RoleRequestUpdate` feed item appears: `"Your [Role] application was not approved."` |
| 4 | When a role request for `AFFILIATE` is approved and Stripe Connect is NOT yet set up, an `ActionRequired` feed item appears: `"Activate your payout account to receive commissions."` with action URL `/account` (where Stripe Connect onboarding lives). |
| 5 | When a referral converts (intake submitted with `so_ref` cookie), a `ReferralActivity` feed item appears for the code owner: `"A referral converted."` with no PII about the lead. |
| 6 | When Stripe Connect onboarding is completed (`payouts_enabled = true`), a `PayoutStatus` feed item appears: `"Payout account active. Commissions will be sent automatically."` |
| 7 | All new feed items are sorted correctly (newest first) alongside existing items. |
| 8 | Feed items for role requests, referral conversions, and payout status have written unit tests that assert: correct type, correct title text, correct `actionUrl` where applicable. |
| 9 | Existing feed tests continue to pass. |
| 10 | `npm run build` succeeds. |

---

## 3. Decisions

1. **New feed item types extend `FeedItem`, not replace it.** Add `RoleRequestUpdate`, `ReferralActivity`, `PayoutStatus` to the union type. Keep existing types unchanged.

2. **Feed items for role status are written to a `feed_events` table at the time the status changes.** The admin route already calls `updateRoleRequestStatus()`. That function (or the route) should write a feed event immediately on approval/rejection. This is more reliable than querying `role_requests` status dynamically on every feed load.

3. **Referral conversion feed items are written when `recordReferralConversionForIntake()` is called.** The function already writes the conversion record — add a `feed_events` row for the code owner at the same time.

4. **Payout status feed items are written by a webhook handler or a status-check trigger when Stripe reports `payouts_enabled = true`.** If no webhook exists yet, the `refreshStripeConnectAccountForUser()` function is the right place to detect state transitions and write the feed event on first `payouts_enabled = true`.

5. **"Activate payout" action-required item is computed dynamically, not stored.** When the feed route builds the response, it checks: `isAffiliate && stripeConnectStatus !== 'COMPLETE'`. If true, inject one `ActionRequired` item. This is simpler than a stored event and ensures it disappears automatically once they complete onboarding.

6. **No PII in referral conversion feed items.** The feed item says `"A referral converted."` The code is included for correlation (`"Referral code MYCODE converted."`), but the lead's name, email, and contact info are never included. The member can see conversion counts in the referral report — not in the feed.

7. **The `ReferralCard` is shown on the dashboard for ALL authenticated users** (not just affiliates). Everyone gets their QR code. This aligns with the broader Sprint 34 decision. The feed integration in Sprint 33 must still work regardless of role.
