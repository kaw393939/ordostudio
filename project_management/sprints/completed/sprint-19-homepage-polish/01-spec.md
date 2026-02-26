# Sprint 19 — Homepage & Metadata Polish: Spec

**Status:** Approved ✅  
**Date:** 2026-02-24  
**Author:** GitHub Copilot + Keith Williams

---

## Business Objective

Make the public-facing site look like a finished product, not a development prototype. Right now the root metadata leaks "LMS 219 UI consuming /api/v1 HAL APIs" into every social share and search result that doesn't override it. The homepage itself is strong content-wise but has structural issues (ad-hoc button styling, hardcoded booking URLs, missing OG image) that undermine professional credibility.

**Success metric:** A visitor who shares any page on LinkedIn, Twitter, or Slack sees branded Studio Ordo copy and a preview image — never "LMS 219."

---

## Problems Addressed

### P0 — Brand-damaging (fix before any marketing push)

1. **Root metadata exposes internal project name.** `layout.tsx` title defaults to "LMS 219", description says "LMS 219 UI consuming /api/v1 HAL APIs". Every page that doesn't override these inherits dev copy in `<title>`, OG tags, and Twitter cards.

2. **No OG image.** Social shares render with no preview image on any page.

3. **Canonical URLs resolve to localhost.** `metadataBase` falls back to `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is unset. Dev environments produce `localhost` canonical tags that could leak to production if env var is misconfigured.

### P1 — Professional credibility

4. **Booking URL points to wrong person.** "Book a Technical Consult" links to `cal.com/alex-macaw/30min` in 5 places across 4 files. Should point to Keith Williams or a generic Studio Ordo booking page.

5. **CTA button bypasses design system.** The HomeHero and About page CTA buttons use inline Tailwind classes that duplicate the primitives Button component's styling. Drift is inevitable.

6. **Two competing Button components.** `src/components/primitives/button.tsx` (design-system tokens) and `src/components/ui/button.tsx` (shadcn stock tokens) coexist with incompatible APIs and token sets.

### P2 — Structural hygiene

7. **Booking URL is hardcoded in 5 places.** No shared constant — a URL change requires finding and editing 4 files.

8. **About page quote lacks semantic markup.** A 7-paragraph first-person quote uses `<div>` + `<p>` + italic class instead of `<blockquote>`.

9. **No shared metadata helper.** Each page manually constructs OG/canonical metadata, duplicating patterns.

---

## In Scope

| # | Item | Category |
|---|---|---|
| 1 | Replace root metadata in `layout.tsx` with Studio Ordo branding | P0 |
| 2 | Generate and configure a default OG image | P0 |
| 3 | Validate `NEXT_PUBLIC_SITE_URL` is set and canonical URLs are correct | P0 |
| 4 | Fix booking URL to correct destination; extract to shared constant | P1 |
| 5 | Replace ad-hoc CTA button classes with `<Button>` primitive in HomeHero and About page | P1 |
| 6 | Consolidate or clearly separate the two Button components (primitives vs shadcn) | P1 |
| 7 | Wrap About page quote in `<blockquote>` | P2 |
| 8 | Create a shared metadata helper for consistent OG/canonical patterns | P2 |

---

## Out of Scope

- New pages or routes
- Homepage content rewrites (the copy is good)
- Hero A/B test changes (feature flags stay as-is)
- Image optimization pipeline (just the OG image for now)
- Production deployment or CI/CD changes
- About page content restructuring beyond the `<blockquote>` fix

---

## Acceptance Criteria

1. `npm run build` produces zero warnings about metadata.
2. Every public page's `<title>` contains "Studio Ordo" — never "LMS 219".
3. Every page has a valid OG image, OG title, and OG description in the rendered HTML.
4. Twitter card meta shows "Studio Ordo" branding with a preview image.
5. `grep -r "LMS 219" src/app/layout.tsx` returns zero matches.
6. `grep -r "cal.com/alex-macaw" src/` returns zero matches; all booking links use the shared constant.
7. HomeHero CTAs render using the `<Button>` primitive component, not inline class strings.
8. About page CTA renders using the `<Button>` primitive component.
9. About page "Origin" quote is wrapped in `<blockquote>`.
10. All existing tests pass (`npm test`).
11. No Lighthouse regression on homepage (performance score ≥ current baseline).

---

## Key Decisions Needed (before UX/UI phase)

- [x] **Booking URL:** Use the existing `/services/request` route. ✅ Approved 2026-02-24
- [x] **OG Image:** Static typographic image. ✅ Approved 2026-02-24
- [x] **Button consolidation:** Keep both — primitives as design-system button, shadcn as internal. ✅ Approved 2026-02-24
- [x] **CTA casing:** Title Case ("Book a Technical Consult"). ✅ Approved 2026-02-24

---

## Dependencies

- `NEXT_PUBLIC_SITE_URL` environment variable must be set correctly in production
- OG image file must be generated/placed in `public/`
- Booking URL decision from Keith

---

## Risk

| Risk | Mitigation |
|---|---|
| Changing root metadata affects all page titles | Template pattern `"%s | Studio Ordo"` preserves per-page titles |
| Button refactor breaks existing styling | Visual regression test on homepage before/after |
| OG image size/format issues on different platforms | Test with LinkedIn, Twitter, and Slack preview debuggers |
