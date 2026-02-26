# Sprint 29: `/join` Replacement — QA Checklist

## 1. Route

- [ ] `/join` returns HTTP 200.
- [ ] No 500 errors from removed wizard component.

---

## 2. Heading

- [ ] H1 reads: **"What brings you here?"**
- [ ] No subtitle present (or if present, it is one sentence and not promotional).

---

## 3. Three Buttons

- [ ] Exactly **three** option cards/buttons on the page — no more, no fewer.
- [ ] Button 1 label: **"I need something built."** → `/studio`
- [ ] Button 1 description: `"Building an AI-assisted tool or internal product."`
- [ ] Button 2 label: **"I want to learn this method."** → `/maestro`
- [ ] Button 2 description: `"The Maestro course on directing AI in software work."`
- [ ] Button 3 label: **"I want to join the guild."** → `/apply`
- [ ] Button 3 description: `"Apprentice, Journeyman, or Affiliate."`
- [ ] All three buttons have equal visual weight (no primary/secondary hierarchy).

---

## 4. Wizard Removed — Verify Absent

- [ ] No progress dots / step indicators visible.
- [ ] No question prompts (Q1, Q2, Q3) visible.
- [ ] No select dropdowns or radio inputs visible.
- [ ] No "Corporate Affiliate" text anywhere on the page.
- [ ] No "observer" result card visible.
- [ ] No `BOOKING_URL?path=affiliate` link anywhere on the page.
- [ ] Page renders as a server component (no `"use client"` in the `/join/page.tsx` import chain).

---

## 5. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
- [ ] `/apply` 404 is acceptable at this stage (Sprint 30 will fix it).
