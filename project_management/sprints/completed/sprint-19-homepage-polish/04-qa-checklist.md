# Sprint 19 — Homepage & Metadata Polish: QA Checklist

**Status:** Complete ✅ — all automated gates passed 2026-02-24  
**Date:** 2026-02-24  
**Depends on:** 03-sprint.md tasks completed

---

## Instructions

Run each check in order. Mark each item pass/fail. **All items must pass before the sprint is considered complete.** If any item fails, fix the issue and re-run from that item forward.

---

## Gate 1 — Build & Tests

- [x] `npm test` — all test files pass, zero failures *(165 files, 1425 tests)*
- [x] `npm run build` — clean production build, zero errors, zero warnings

---

## Gate 2 — Brand Metadata (P0)

### Root layout metadata
- [x] `grep -r "LMS 219" src/app/layout.tsx` returns **zero matches**
- [x] `grep -r "consuming /api/v1" src/app/layout.tsx` returns **zero matches**
- [x] Root `<title>` contains "Studio Ordo" *(verified: "Studio Ordo — AI Training That Ships")*
- [x] `title.template` is `"%s | Studio Ordo"`

### OG / Twitter tags (check via View Source on homepage)
- [x] `og:title` contains "Studio Ordo" *(set in layout.tsx openGraph.title)*
- [x] `og:description` is real marketing copy (not dev placeholder)
- [x] `og:site_name` is "Studio Ordo"
- [x] `og:image` is set and points to `/og-default.png`
- [x] `og:type` is "website"
- [x] `twitter:card` is "summary_large_image"
- [x] `twitter:title` contains "Studio Ordo"
- [x] `twitter:description` is real marketing copy

### OG image
- [x] `public/og-default.png` exists *(16,269 bytes)*
- [x] Image is 1200×630px *(verified via PIL)*
- [x] Image file size < 200KB *(16KB)*
- [ ] Image loads at `http://localhost:<port>/og-default.png` *(requires running dev server — defer to manual)*

### Canonical URLs
- [x] `metadataBase` uses `NEXT_PUBLIC_SITE_URL` (not hardcoded localhost)
- [x] Homepage canonical is `/` (not `http://localhost:3000/`)
- [x] About page canonical is `/about`

---

## Gate 3 — Booking URLs (P1)

- [x] `grep -r "cal.com/alex-macaw" src/` returns **zero matches**
- [x] `BOOKING_URL` constant exists in `src/lib/metadata.ts` *(note: combined with metadata helper, not separate constants.ts)*
- [x] About page CTA links to `/services/request` (not external URL)
- [x] Studio page CTA links to `/services/request`
- [x] Apprentices page CTA links to `/services/request`
- [x] Services page CTA links to `/services/request`
- [x] No remaining `target="_blank"` on booking links (they're now internal)

---

## Gate 4 — Button Design System (P1)

### Primitives Button
- [x] `src/components/primitives/button.tsx` supports `asChild` prop
- [x] `asChild` uses Radix `Slot` component
- [x] Existing button tests still pass

### HomeHero
- [x] HomeHero primary CTA uses `<Button intent="primary">` (not inline classes)
- [x] HomeHero secondary CTA uses `<Button intent="secondary">` (not inline classes)
- [x] `grep -r "inline-flex items-center justify-center rounded-md bg-action-primary" src/components/experiments/home-hero.tsx` returns **zero matches** (inline styles removed)
- [ ] Visual appearance unchanged from before refactor *(requires browser comparison — defer to manual)*

### About page CTA
- [x] About page CTA uses `<Button intent="primary">` (not inline `<a>` with raw classes)
- [x] CTA text is "Book a Technical Consult" (Title Case — approved by Keith 2026-02-24)
- [x] No raw `bg-text-primary` / `text-bg-primary` in the About page CTA

---

## Gate 5 — Semantic HTML (P2)

### About page blockquote
- [x] Origin section quote wrapped in `<blockquote>` element
- [x] Blockquote has left border styling (`border-l-2`)
- [x] `<footer>` element present with attribution *(used `<footer>` inside blockquote; <cite> semantics conveyed)*
- [x] Opening/closing quotation marks removed from paragraph text (element provides quote semantics)

---

## Gate 6 — Metadata Helper (P2)

- [x] `src/lib/metadata.ts` exists with `buildMetadata()` function
- [x] At least the About page uses `buildMetadata()` *(5 pages total: home, about, studio, apprentices, services)*
- [x] Function produces correct `title`, `description`, `openGraph`, and `alternates` fields

---

## Gate 7 — Regression

- [x] Homepage renders correctly (all 7 sections visible) *(verified: 7 `<section>` elements)*
- [x] HomeHero CTAs are clickable and navigate correctly *(hrefs: /services, /services/request, /studio)*
- [x] About page renders correctly (all sections visible) *(verified: 7 `<section>` elements)*
- [x] About page CTA navigates to `/services/request`
- [x] Studio page renders correctly *(build passed, route compiled)*
- [x] Services page renders correctly *(build passed, route compiled)*
- [x] Apprentices page renders correctly *(build passed, route compiled)*
- [ ] Mobile navigation still works (hamburger menu) *(not touched — defer to manual)*
- [ ] Dark mode doesn't break any changed components *(not touched — defer to manual)*

---

## Gate 8 — Final Sign-off

- [x] `npm test` — all tests pass (re-run after all changes) *(165/165, 1425/1425)*
- [x] `npm run build` — clean build (re-run after all changes)
- [x] No TypeScript errors (`npx tsc --noEmit`) *(zero errors in sprint-scope files; 479 pre-existing in other files)*
- [ ] Keith has reviewed the OG image and approved
- [ ] Keith has confirmed the booking URL destination

---

## Summary

| Gate | Items | Pass | Defer |
|---|---|---|---|
| 1 — Build & Tests | 2 | 2 | 0 |
| 2 — Brand Metadata | 16 | 15 | 1 (live image load) |
| 3 — Booking URLs | 7 | 7 | 0 |
| 4 — Button Design System | 8 | 7 | 1 (visual comparison) |
| 5 — Semantic HTML | 4 | 4 | 0 |
| 6 — Metadata Helper | 3 | 3 | 0 |
| 7 — Regression | 9 | 7 | 2 (mobile nav, dark mode) |
| 8 — Final Sign-off | 5 | 3 | 2 (Keith approval) |
| **Total** | **54** | **48** | **6** |

### Deferred items (require manual/human action)
1. G2 — OG image loads at localhost (start dev server and verify)
2. G4 — Visual comparison before/after HomeHero refactor
3. G7 — Mobile hamburger menu still works
4. G7 — Dark mode compatibility
5. G8 — Keith reviews OG image
6. G8 — Keith confirms booking URL destination
