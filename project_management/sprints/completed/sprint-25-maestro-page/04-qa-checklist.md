# Sprint 25: `/maestro` Page — QA Checklist

## 1. Route

- [ ] `/maestro` returns HTTP 200.
- [ ] Page `<title>` reads: **"Maestro Training — Studio Ordo"**
- [ ] Page `<meta name="description">` reads: "Eight weeks. Direct AI in software delivery. Build a practice or sharpen a method."

---

## 2. Hero Section

- [ ] `<h1>` reads: **"Direct the machine. Build the practice."**
- [ ] Subhead reads: **"Eight weeks. Your expertise, re-oriented for agentic workflows."**
- [ ] Primary CTA button reads: **"Book your discovery call."** (period, not exclamation mark)
- [ ] Primary CTA `href` is `BOOKING_URL` (no source param on this button — format cards handle sourcing)

---

## 3. Who This Is For

- [ ] Section heading reads: **"Who this is for"**
- [ ] Section body is exactly 2 sentences.
- [ ] Body does NOT use nested clauses or "Are you a..." framing.
- [ ] Body does NOT contain a list.

---

## 4. Checklist

- [ ] Section heading reads: **"What you get"**
- [ ] Exactly 5 items.
- [ ] Rendered as a `<ul>` list — NOT a multi-column grid.
- [ ] Item 5 includes "Revenue share" language.
- [ ] No item uses superlatives ("transformative", "game-changing", etc.)

---

## 5. Format Cards

- [ ] Section heading reads: **"Choose your format."** (with period)
- [ ] Two cards render: **Cohort program** and **Advisory retainer**
- [ ] Cohort card shows price range: **$3,000 – $5,000**
- [ ] Advisory card shows price range: **$1,500 – $2,500 / month**
- [ ] Cohort card CTA `href` contains `?source=maestro-cohort`
- [ ] Advisory card CTA `href` contains `?source=maestro-advisory`
- [ ] No "most popular" or manufactured-urgency badge on either card.
- [ ] Cohort card does NOT show a specific cohort date (unless one is confirmed and hardcoded intentionally).

---

## 6. FAQ

- [ ] Section heading reads: **"Questions we get."** (not "Common questions.")
- [ ] Exactly 4 Questions answered.
- [ ] First question is about whether engineering background is required.
- [ ] Last question covers the 80/20 revenue share split.
- [ ] Each answer leads with the direct response — no question restatement, no preamble.
- [ ] FAQ is rendered as `<dl>` (or equivalent semantic structure) — NOT an accordion component.

---

## 7. Close Section

- [ ] Section headline reads: **"Built with the method."** (statement — not a question)
- [ ] Close CTA reads: **"Book your discovery call."** → `BOOKING_URL`
- [ ] Secondary CTA reads: **"Read the framework →"** → `/insights`
- [ ] No third CTA or additional links in the close section.

---

## 8. Build & Tests

- [ ] `npx vitest run` — no new failures.
- [ ] `npm run build` — completes without errors.
- [ ] Page is NOT linked from nav or footer yet (those sprints come later — just confirm it's accessible by direct URL).
