# Sprint 31: Referral Fixes — UX Design

---

## `/r/[code]` Redirect

**Before:**
```
/r/AFFILIATECODE  →  302  →  /services
```

**After:**
```
/r/AFFILIATECODE  →  302  →  /card?ref=AFFILIATECODE
```

No visible UI change — this is a routing fix only.

---

## Affiliate Dashboard `ReferralCard` — QR Destination Update

**Before:**
```
QR Code encodes:  https://studioordo.com/r/MYCODE
Displayed URL:    studioordo.com/r/MYCODE
```

**After:**
```
QR Code encodes:  https://studioordo.com/card?ref=MYCODE
Displayed URL:    studioordo.com/card?ref=MYCODE
```

The card copy does not change. Only the encoded URL and displayed URL update.

---

## `/affiliate` Page — Information Additions

Add three pieces of information to the `/affiliate` page. These can be added as a section below the existing content:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [existing /affiliate content above]                           │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  Commission: 20% of the project fee on any referred project    │
│  that converts.                                                 │
│                                                                 │
│  Attribution window: 90 days from initial scan.                │
│                                                                 │
│  [if visitor is not logged in or not yet an affiliate:]         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Apply to be an affiliate →                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The `"Apply to be an affiliate →"` CTA routes to the registration or application flow for the Affiliate guild tier. If that is `/apply/affiliate`, route there. If it is `/register?role=affiliate`, route there — check the codebase during T1 to determine the correct destination.
