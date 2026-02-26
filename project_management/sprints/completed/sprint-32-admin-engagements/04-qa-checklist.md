# Sprint 32: Admin Engagements — QA Checklist

## 1. Engagements List Page

- [ ] `/admin/engagements` returns 200 with real UI (not the stub).
- [ ] "No engagements dashboard yet" stub text is gone.
- [ ] Tab filter: All / Project Commissions / Maestro Training renders.
- [ ] `"+ New Engagement"` button is visible and links to the new engagement form.
- [ ] Existing engagements (if any) appear in the table with: name, type, value, commission, status.

---

## 2. New Engagement Form

- [ ] Project Commission form includes: client name, project type, total value.
- [ ] Commission field auto-calculates at **20%** of total value and is read-only.
- [ ] Referral code field is present (optional).
- [ ] Maestro Training form includes: student, track (cohort/advisory), rate, cohort start date, payment status.
- [ ] Form submission creates the engagement record and redirects to the list or detail page.

---

## 3. Engagement Detail + Completion

- [ ] Engagement detail page shows all fields.
- [ ] `"Mark as Completed"` button is present on active engagements.
- [ ] Clicking `"Mark as Completed"` sets engagement status to Completed.
- [ ] On completion of a Project Commission: a `PLATFORM_REVENUE` ledger entry is created for the commission amount.
- [ ] On completion with a `referralCode` set: a `REFERRER_COMMISSION` ledger entry is created at 20% of the commission amount.
- [ ] On completion of a Maestro Training enrollment: a `PLATFORM_REVENUE` ledger entry is created for the enrollment fee.
- [ ] Completing an already-Completed engagement does not duplicate ledger entries.

---

## 4. Commission Math

- [ ] Project value: $40,000 → Commission: $8,000 (20%).
- [ ] With referral: `REFERRER_COMMISSION` = $1,600 (20% of $8,000).
- [ ] No hardcoded dollar amounts in the UI — all derived from the engagement record.

---

## 5. Build & Tests

- [ ] `engagements` table exists in DB (SQL migration applied to local DB).
- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
