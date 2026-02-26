# Sprint 19 — Homepage & Metadata Polish: Sprint Plan

**Status:** Complete ✅  
**Date:** 2026-02-24  
**Depends on:** 01-spec.md and 02-ux-design.md approved

**Results:**
- All 9 tasks completed
- 165 test files, 1425 tests, 100% passing
- Zero `cal.com` references remain in source
- Zero `LMS 219` references in sprint-scope files
- OG image generated at `public/og-default.png` (16KB)
- 5 pages migrated to `buildMetadata()` helper
- Button primitive upgraded with `asChild` support
- HomeHero CTAs use Button primitive (Title Case)
- About page Origin quote wrapped in semantic `<blockquote>`

---

## Task Sequence

Tasks are ordered by dependency. Each task includes the files to touch, what to do, and how to verify.

---

### Task 1 — Create shared constants and metadata helper

**Files:**
- Create `src/lib/constants.ts`
- Create `src/lib/metadata.ts`

**Work:**
1. Add `BOOKING_URL = "/services/request"` to constants
2. Implement `buildMetadata()` helper per the UX/UI design doc
3. Export `SITE_NAME` and `DEFAULT_DESCRIPTION` for reuse

**Verify:** TypeScript compiles, imports resolve

---

### Task 2 — Fix root metadata in layout.tsx

**Files:**
- `src/app/layout.tsx`

**Work:**
1. Replace `title.default` from `"LMS 219"` to `"Studio Ordo — AI Training That Ships"`
2. Replace `title.template` from `"%s | LMS 219"` to `"%s | Studio Ordo"`
3. Replace `description` with real marketing copy
4. Replace `openGraph` title/description/siteName with "Studio Ordo" branding
5. Add `openGraph.images: ["/og-default.png"]`
6. Replace `twitter` card/title/description with branded copy
7. Upgrade twitter card to `"summary_large_image"`

**Verify:** `npm run build`, inspect rendered `<head>` on any page

---

### Task 3 — Generate and place OG image

**Files:**
- Create `public/og-default.png`

**Work:**
1. Generate a 1200×630px branded OG image (typographic — "Studio Ordo" + tagline on light background)
2. Place at `public/og-default.png`
3. Optimize file size (target < 200KB)

**Verify:** Image loads at `http://localhost:3000/og-default.png`

---

### Task 4 — Add asChild support to primitives Button

**Files:**
- `src/components/primitives/button.tsx`

**Work:**
1. Add `@radix-ui/react-slot` dependency (check if already installed via shadcn)
2. Add `asChild?: boolean` prop to Button interface
3. Swap rendered element: `const Comp = asChild ? Slot : "button"`
4. Update existing tests if any

**Verify:** `npm test` — existing button tests pass, new `asChild` behavior works

---

### Task 5 — Replace booking URLs with shared constant

**Files:**
- `src/app/(public)/about/page.tsx`
- `src/app/(public)/studio/page.tsx`
- `src/app/(public)/apprentices/page.tsx`
- `src/app/(public)/services/page.tsx`

**Work:**
1. Import `BOOKING_URL` from `@/lib/constants`
2. Replace all `https://cal.com/alex-macaw/30min` href values with `BOOKING_URL`
3. Remove `target="_blank"` and `rel="noopener noreferrer"` (now internal link)
4. Convert `<a>` tags to `<Link>` where they aren't already

**Verify:** `grep -r "cal.com/alex-macaw" src/` returns zero matches

---

### Task 6 — Refactor HomeHero CTAs to use Button primitive

**Files:**
- `src/components/experiments/home-hero.tsx`

**Work:**
1. Import `Button` from `@/components/primitives/button`
2. Replace the primary CTA inline-styled `<Link>` with `<Button asChild intent="primary"><Link href="...">...</Link></Button>`
3. Replace the secondary CTA inline-styled `<Link>` with `<Button asChild intent="secondary"><Link href="...">...</Link></Button>`
4. Remove the now-redundant inline class strings

**Verify:** Visual comparison before/after — no visible change. `npm run build` passes.

---

### Task 7 — Refactor About page CTA + blockquote

**Files:**
- `src/app/(public)/about/page.tsx`

**Work:**
1. Import `Button` from `@/components/primitives/button` and `BOOKING_URL` from `@/lib/constants`
2. Replace the external `<a>` CTA with `<Button asChild intent="primary"><Link href={BOOKING_URL}>...</Link></Button>`
3. Wrap the Origin section's 7-paragraph quote in `<blockquote>` with `border-l-2 border-border-subtle pl-4`
4. Add `<cite>` attribution below the blockquote
5. Remove wrapping quotation marks from the text content
6. Optionally migrate to `buildMetadata()` helper

**Verify:** Visual comparison — blockquote has left border, CTA uses action-primary blue instead of inverted text. `npm run build` passes.

---

### Task 8 — Update page metadata to use helper (optional polish)

**Files:**
- `src/app/(public)/about/page.tsx`
- `src/app/(public)/studio/page.tsx`
- `src/app/(public)/apprentices/page.tsx`
- `src/app/(public)/services/page.tsx`
- `src/app/(public)/events/page.tsx` (or `page-client.tsx`)
- `src/app/(public)/newsletter/page.tsx`

**Work:**
1. Replace manual metadata exports with `buildMetadata()` calls
2. Ensure each page's title is just the page name (template adds "| Studio Ordo")

**Verify:** `npm run build`, inspect `<title>` output on each page

---

### Task 9 — Final verification

**Work:**
1. `npm test` — all tests pass
2. `npm run build` — clean build
3. Spot-check all public pages for correct `<title>`, OG tags, CTA links
4. Run QA checklist (04-qa-checklist.md)

---

## File Change Summary

| File | Action | Task |
|---|---|---|
| `src/lib/constants.ts` | Create (or append) | 1 |
| `src/lib/metadata.ts` | Create | 1 |
| `src/app/layout.tsx` | Edit metadata | 2 |
| `public/og-default.png` | Create | 3 |
| `src/components/primitives/button.tsx` | Add `asChild` | 4 |
| `src/app/(public)/about/page.tsx` | Edit CTA + blockquote + metadata | 5, 7, 8 |
| `src/app/(public)/studio/page.tsx` | Edit booking URLs + metadata | 5, 8 |
| `src/app/(public)/apprentices/page.tsx` | Edit booking URL + metadata | 5, 8 |
| `src/app/(public)/services/page.tsx` | Edit booking URL + metadata | 5, 8 |
| `src/components/experiments/home-hero.tsx` | Refactor CTA buttons | 6 |

---

## Estimated Effort

| Task | Estimate |
|---|---|
| Task 1 — Constants + helper | 5 min |
| Task 2 — Root metadata | 5 min |
| Task 3 — OG image | 10 min |
| Task 4 — Button asChild | 10 min |
| Task 5 — Booking URLs | 10 min |
| Task 6 — HomeHero refactor | 10 min |
| Task 7 — About page polish | 10 min |
| Task 8 — Metadata migration | 15 min |
| Task 9 — Final QA | 10 min |
| **Total** | **~85 min** |

---

## Test Strategy

- **Unit tests:** Existing tests must remain green. No new unit tests required (metadata is tested via build, button via existing tests).
- **Build gate:** `npm run build` must pass clean after every task.
- **Visual verification:** Before/after screenshots of HomeHero and About page CTA section.
- **Grep verification:** Zero matches for `"LMS 219"` in layout.tsx, zero matches for `"cal.com/alex-macaw"` in src/.
