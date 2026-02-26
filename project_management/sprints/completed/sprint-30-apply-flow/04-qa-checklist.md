# Sprint 30: `/apply` Flow — QA Checklist

## 1. `/apply` Index Page

- [ ] `/apply` returns HTTP 200.
- [ ] H1 reads: **"Apply to the guild."**
- [ ] Exactly three path cards: Apprentice, Journeyman, Affiliate.
- [ ] `"Apply as Apprentice →"` (or card click) → `/apply/apprentice`.
- [ ] `"Apply as Journeyman →"` (or card click) → `/apply/journeyman`.
- [ ] `"Apply as Affiliate →"` (or card click) → `/apply/affiliate`.

---

## 2. `/apply/apprentice` Form

- [ ] `experience` field is a `<textarea>`, not a single-line input.
- [ ] `current_role` field exists (text input).
- [ ] `years_experience` field exists (number input or select).
- [ ] `current_role` and `years_experience` have readable labels.
- [ ] Set cookie `so_ref=TESTCODE` manually; reload page; confirm referral code is present in form submission payload (check network request on submit).
- [ ] No error if `so_ref` cookie is absent.

---

## 3. `/apply/affiliate` Form

- [ ] No dead `useEffect` / TODO block in rendered output or console errors.
- [ ] `platform` field exists with label referencing "where you share content or refer work".
- [ ] `audience_description` field exists as a textarea.
- [ ] Form submits without JavaScript errors.

---

## 4. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
