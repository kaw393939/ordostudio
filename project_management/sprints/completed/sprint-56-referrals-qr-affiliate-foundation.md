# Sprint 56 — Referral / Affiliate Foundation (QR + Cards) + Admin Reporting

## Goal
Create a tracked referral foundation for Studio Ordo: members can refer leads and receive 25% commission (reporting first; payouts later).

## Scope

### Referral identifiers
- A member has a referral code.
- Generate referral URLs and QR targets.

Member-facing UI (Swiss / corporate):
- A “Referral card” view that contains:
  - referral URL (copy button)
  - QR code (printable)
  - short disclosure text (what is tracked)
  - commission rate statement (25%)

Rules:
- Make the referral value obvious in one sentence.
- Make tracking disclosure obvious in one sentence.

### Tracking
- Track:
  - Referral link visits
  - Conversions (consult request, training inquiry, studio application)

### Admin reporting
- Admin dashboard/report:
  - Referrals by member
  - Conversions
  - Commission owed (25%)

Admin report layout standards:
- Summary cards (totals) + table (detail).
- Table columns: member, clicks, conversions, conversion rate, commission owed.
- Export format documented and consistent.

### Compliance & trust
- Update Privacy Policy if tracking introduces cookies/analytics.

Trust UI requirements:
- Do not hide tracking. Include a short disclosure near the referral card.
- If cookies are introduced, provide the minimal consent affordance consistent with policy.

## Acceptance Criteria
- [x] Referral codes exist and are stable.
- [x] Tracking records conversions.
- [x] Admin report shows totals and commission calculation.
- [x] Member referral card is easy to use (copy URL and download/print QR).
- [x] Disclosure language is present and readable.
- [x] Tests cover attribution rules.
- [x] Lint/tests/build pass.
