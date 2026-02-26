# Sprint 27: `/studio` Rewrite — QA Checklist

## 1. Route

- [ ] `/studio` returns HTTP 200.
- [ ] No 500 errors after removing guild content.

---

## 2. Hero

- [ ] Heading reads: **"Commission a project."** — with period.
- [ ] Subhead reads: **"AI-capable engineers. Spec-driven method. Audit-logged deliverables."**
- [ ] CTA reads: **"Start a project →"**
- [ ] CTA href is `/services/request` (not `/contact`, not `/studio/request`, not `/apply`).

---

## 3. What We Build

- [ ] Section heading reads: **"What We Build"**
- [ ] Exactly 5 list items.
- [ ] List item 1: "Line-of-business web applications"
- [ ] List item 2: "Internal tooling and workflow automation"
- [ ] List item 3: "AI-integrated features for existing products"
- [ ] List item 4: "API development and system integrations"
- [ ] List item 5: "Codebase audits and spec remediation"
- [ ] No guild vocabulary ("Journeyman", "Apprentice", "Maestro", "guild") in this section.

---

## 4. Who We Work With

- [ ] Section heading reads: **"Who We Work With"**
- [ ] Copy mentions engineering directors, CTOs, product leads.

---

## 5. Proof Point

- [ ] Proof point text includes "23 years" and "10,000+".
- [ ] Proof point is styled `type-meta text-text-muted`.

---

## 6. How We Work

- [ ] Section heading reads: **"How We Work"**
- [ ] Copy references 40% spec, 60% build.
- [ ] Framing is buyer-assurance ("deliverables match what was agreed"), not recruiting pitch.

---

## 7. Removed Content — Verify Absent

- [ ] `StudioBottegaModel` is NOT rendered on this page.
- [ ] `RecommendedEvents` is NOT rendered on this page.
- [ ] Search for "Bottega" on rendered page — zero results.
- [ ] Search for "Leonardo" on rendered page — zero results.
- [ ] Search for "Verrocchio" on rendered page — zero results.
- [ ] Search for "You're not learning" on rendered page — zero results.
- [ ] Search for "Context Pack" on rendered page — zero results.
- [ ] No `"Get the Context Pack Starter Kit →"` link anywhere on the page.

---

## 8. No Learner CTAs

- [ ] No link to `/maestro` on this page.
- [ ] No link to `/join` on this page.
- [ ] No link to `/apply` on this page.
- [ ] No "Join the guild" or "Enroll" copy anywhere.

---

## 9. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
