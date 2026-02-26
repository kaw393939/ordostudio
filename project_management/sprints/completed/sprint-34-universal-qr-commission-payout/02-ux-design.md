# Sprint 34: Universal QR / Commission / Payout — UX Design

---

## 1. ReferralCard Updates (Already on Dashboard from Sprint 33)

After Sprint 33, `ReferralCard` is visible on the dashboard for all users. The card URL must now be corrected. The `url` field from `/api/v1/account/referral` currently returns `/r/${code}`. It must return `/card?ref=${code}`.

**Before:**
```
Referral URL: studioordo.com/r/MYCODE
QR encodes:   https://studioordo.com/r/MYCODE
Disclosure:   "...earn 25% commission..."
```

**After:**
```
Referral URL: studioordo.com/card?ref=MYCODE
QR encodes:   https://studioordo.com/card?ref=MYCODE
Disclosure:   "...earn 20% commission..."
```

---

## 2. Payout Activation Flow

### Step 1 — Trigger (from feed item / account settings)

The "Activate your payout account." feed item (from Sprint 33) links to `/account`. On the account page, the payout section shows the activation form when the user is AFFILIATE + Stripe Connect not yet active.

```
┌─────────────────────────────────────────────────────────────────┐
│  Payout Setup                                                   │
│                                                                 │
│  To receive commission payments, we need your payment          │
│  and basic tax information.                                     │
│                                                                 │
│  We use Stripe to process payouts securely. Your bank          │
│  details are never stored with Studio Ordo.                     │
│                                                                 │
│  [Set up payouts →]   (button — opens Step 2 form)             │
└─────────────────────────────────────────────────────────────────┘
```

---

### Step 2 — Tax Info Form

```
┌─────────────────────────────────────────────────────────────────┐
│  Before we connect your payout account                          │
│                                                                 │
│  Legal name (as it appears on tax filings)                     │
│  [text input]                                                   │
│                                                                 │
│  Entity type                                                    │
│  ○ Individual / Sole proprietor                                 │
│  ○ LLC                                                          │
│  ○ S-Corp                                                       │
│  ○ C-Corp                                                       │
│                                                                 │
│  Address                                                        │
│  [Address line 1]                                               │
│  [City]  [State / Province]  [Postal code]                     │
│  [Country]                                                      │
│                                                                 │
│  ──────────────────────────────────────────                     │
│  Studio Ordo stores your legal name and entity type to         │
│  satisfy 1099-NEC reporting requirements. We do not            │
│  store your SSN or EIN — that is collected by Stripe during   │
│  the payout account setup.                                      │
│  ──────────────────────────────────────────                     │
│                                                                 │
│  [Continue to payout setup →]  (submits form, then redirects  │
│                                  to Stripe Connect onboarding) │
└─────────────────────────────────────────────────────────────────┘
```

**On submit:**
1. POST to `/api/v1/account/payout-activate` with the form data
2. If 422: show field-level validation errors inline
3. If 200: redirect to `data.onboarding_url` (Stripe Connect)

---

### Step 3 — After Stripe Connect

After the member returns from Stripe Connect (`returnUrl: /account`), the payout section shows their current status:

```
┌─────────────────────────────────────────────────────────────────┐
│  Payout Setup                                                   │
│                                                                 │
│  Status: In progress — complete Stripe verification             │
│  [Resume Stripe setup →]                                        │
└─────────────────────────────────────────────────────────────────┘
```

Or, if `payouts_enabled = true`:

```
┌─────────────────────────────────────────────────────────────────┐
│  Payout Setup                                                   │
│                                                                 │
│  ✓ Active — Stripe Connect verified                            │
│  Commissions are sent automatically when deals close.          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Commission Disclosure — Updated Copy

In `ReferralCard` and in any copy on the `/affiliate` page, replace "25%" with "20%":

**Before:** `"Refer a lead and earn 25% commission when work is sold."`
**After:** `"Refer a lead and earn 20% commission when work is sold."`

**Disclosure on payout form:**
> "Studio Ordo stores your legal name and entity type to satisfy 1099-NEC reporting requirements. We do not store your SSN or EIN — that is collected by Stripe during payout account setup."
