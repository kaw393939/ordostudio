# Sprint 31: Referral Fixes — QA Checklist

## 1. `/r/[code]` Redirect

- [ ] `GET /r/ANYCODE` returns a 302 redirect.
- [ ] Redirect destination is `/card?ref=ANYCODE`.
- [ ] Old redirect to `/services` is gone (verify by checking route file).

---

## 2. Affiliate Dashboard `ReferralCard`

- [ ] QR code displayed in `ReferralCard` encodes: `https://studioordo.com/card?ref=MYCODE` (not `/r/MYCODE`).
- [ ] Displayed/copyable referral URL shows: `studioordo.com/card?ref=MYCODE`.
- [ ] No URL contains `/r/` in the affiliate dashboard after this change.

---

## 3. `/affiliate` Page

- [ ] Commission rate appears: **"20% of the project fee"**.
- [ ] Attribution window appears: **"90 days"**.
- [ ] `"Apply to be an affiliate →"` CTA is visible.
- [ ] CTA routes to `/apply/affiliate` (or equivalent registration path).

---

## 4. Affiliate Name Resolution Endpoint

- [ ] `GET /api/v1/referrals/resolve?code=VALIDCODE` returns 200 with `{ first_name: "..." }`.
- [ ] `GET /api/v1/referrals/resolve?code=UNKNOWNCODE` returns 404.
- [ ] Visiting `/card?ref=VALIDCODE` shows `"You were referred by [Name]."` attribution line.
- [ ] Visiting `/card?ref=UNKNOWNCODE` shows no attribution line (no error state).

---

## 5. Full Referral Loop (End-to-End)

- [ ] Scan QR → `/r/CODE` → `/card?ref=CODE` → `so_ref` cookie set → `/services/request` page accessible with cookie intact.
- [ ] Visit `/card?ref=CODE` directly → `so_ref` cookie set.

---

## 6. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
