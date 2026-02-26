# Sprint 24: CTA Audit Fixes — QA Checklist

## 1. Homepage §01

- [ ] Section 01 `<h2>` reads: **"AI is automating execution. What remains is direction."**
- [ ] "The Double Stripping is here." does NOT appear anywhere on the homepage.

---

## 2. Homepage §02

- [ ] Section 02 `<h2>` reads: **"The 40/60 Method"** (not "Split").
- [ ] Section 02 body does NOT contain: "A 90-day high-intensity transformation."
- [ ] Section 02 body starts with: "40% manual understanding."
- [ ] Section 02 CTA reads: **"Commission a project →"** (not "Hire an Associate").
- [ ] Section 02 CTA `href` is still `/services/request` (unchanged).

---

## 3. `/join` Page

- [ ] Page `<meta name="description">` reads: "What brings you here? Three choices. Immediate routing to the right place."
- [ ] Old description ("Three questions to find your path...") does NOT appear in page source.

---

## 4. Sections NOT Changed This Sprint

Confirm these are unchanged (they belong to Sprint 28):

- [ ] `HomeHero` component is unchanged.
- [ ] Homepage §03 (Canon block) is unchanged.
- [ ] Homepage §04 ("90-Day Transformation") is unchanged.
- [ ] `/studio` page content is unchanged.

---

## 5. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
