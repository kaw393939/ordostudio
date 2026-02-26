# Sprint 38: Onboarding Workflow — UX Design

## Dashboard Onboarding Checklist (new users only)

```
┌─────────────────────────────────────────────────────┐
│  Welcome to Studio Ordo                             │
│  Complete these steps to activate your account.    │
│                                                     │
│  ☐  Complete your profile              [Do this →] │
│  ☐  Order your QR business card        [Do this →] │
│  ☑  Set up payout account              ✓ Done       │
│                                                     │
│  2 of 3 steps complete                              │
└─────────────────────────────────────────────────────┘
```

- Appears at TOP of dashboard (above ActionFeed, ReferralCard, PayoutActivation)
- Each incomplete required task has "Do this →" button linking to the relevant page
- Completed tasks: strike-through text + "✓ Done"
- Progress indicator: "N of M steps complete"
- Widget hidden after all required tasks complete (48h grace display then gone)

## Staff Provision Button (in CRM contact detail)

```
  [Approve & Create Account]   ← only visible when status = QUALIFIED
```

Clicking shows confirmation dialog with the contact's email, then calls POST /crm/contacts/:id/provision.
