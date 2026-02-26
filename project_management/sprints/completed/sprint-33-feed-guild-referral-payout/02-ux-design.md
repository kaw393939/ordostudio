# Sprint 33: Activity Feed — UX Design

## Feed Card Inventory

The `ActionFeed` currently renders three card types:
- `UpcomingEventCard` — for `AccountRegistration` and `EngagementTimelineItem`
- `ActionRequiredCard` — for `FollowUpAction`
- `ReminderCard` — fallback for everything else

New item types will render as `ActionRequiredCard` (when action is needed) or `ReminderCard` (when informational). No new card components are required.

---

## New Feed Items — What They Look Like

### Role Request Submitted
```
┌─────────────────────────────────────────────────────────────────┐
│  📋  Application submitted                    [date]            │
│  Your Affiliate application is under review.                   │
│  We'll notify you when it's been reviewed.                     │
└─────────────────────────────────────────────────────────────────┘
```
- Card type: `ReminderCard` (no action needed yet)
- Feed item type: `RoleRequestUpdate`
- No action URL

---

### Role Request Approved
```
┌─────────────────────────────────────────────────────────────────┐
│  ✓   Your Affiliate application was approved.   [date]         │
└─────────────────────────────────────────────────────────────────┘
```
- Card type: `ReminderCard`
- Feed item type: `RoleRequestUpdate`
- No action URL (the "activate payout" item is a separate card below)

---

### Role Request Rejected
```
┌─────────────────────────────────────────────────────────────────┐
│  ✗   Your Affiliate application was not approved.  [date]      │
│  Questions? Contact us at studio@studioordo.com                │
└─────────────────────────────────────────────────────────────────┘
```
- Card type: `ReminderCard`
- Feed item type: `RoleRequestUpdate`

---

### Activate Payout — Action Required (dynamic, not stored)
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠   Action required                                           │
│  Activate your payout account to receive commissions.          │
│  [Set up payouts →]  → /account                                │
└─────────────────────────────────────────────────────────────────┘
```
- Card type: `ActionRequiredCard`
- Feed item type: `FollowUpAction` (reuses existing type — matches existing card handling)
- Appears when: user has AFFILIATE role AND `stripe_connect.status !== 'COMPLETE'`
- Disappears when: payout setup is confirmed complete
- This item is injected at feed-assembly time, not stored in DB

---

### Referral Converted
```
┌─────────────────────────────────────────────────────────────────┐
│  ↗   Referral converted               [date]                   │
│  Code MYCODE — a new lead came through your referral link.     │
│  Commission pending engagement completion.                      │
└─────────────────────────────────────────────────────────────────┘
```
- Card type: `ReminderCard`
- Feed item type: `ReferralActivity`
- No PII about the lead
- Commission is described as "pending engagement completion" — accurate because commission is only triggered on deal close

---

### Payout Account Active
```
┌─────────────────────────────────────────────────────────────────┐
│  ✓   Payout account active.           [date]                   │
│  Commissions will be sent automatically when deals close.      │
└─────────────────────────────────────────────────────────────────┘
```
- Card type: `ReminderCard`
- Feed item type: `PayoutStatus`

---

## Dashboard — ReferralCard Placement

The `ReferralCard` component is moved from its dormant location to the dashboard page, rendered below `ActionFeed` for **all authenticated users**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                      │
│                                                                 │
│  [ActionFeed ── events, actions, role status, referral events] │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  Your referral code                                            │
│  [ReferralCard ── code, QR, copy URL, download QR]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Every account has a referral code. The `ReferralCard` gets the code from `/api/v1/account/referral` which already calls `getOrCreateReferralCode()` — so the code is generated on first visit and stable thereafter. The card renders immediately for all roles.
