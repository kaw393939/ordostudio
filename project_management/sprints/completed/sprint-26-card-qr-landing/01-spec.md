# Sprint 26: `/card` QR Landing Page — New Build

## 1. Problem Statement

Business cards are being printed with QR codes. Currently `/r/[code]` redirects QR scans to `/services` — a page designed for someone who already knows Studio Ordo. Someone who just scanned an unfamiliar QR code at a conference has zero context. They need one scroll: what is this, and what can I do here.

From `GA-01-buyer-flow.md`:
> "`/card` does not exist."

From `05-qr-landing.md`:
> "Someone received a card from a Studio Ordo Affiliate, Journeyman, or Maestro at a meetup, conference, or direct encounter. They scanned the QR code. They've never heard of Studio Ordo and have no context."

**Sprint 26 depends on Sprint 25** — the `/card` page's primary CTAs link to `/maestro` (learner path) and `/services/request` (buyer path). Both must exist before this page is useful.

### What's Missing

1. **No `/card` route.** Visiting `/card?ref=CODE` returns 404.
2. **`/r/[code]` redirects to the wrong destination.** After this sprint, that redirect is updated to `/card?ref=CODE`.
3. **No `?ref=` cookie baking on the `/card` page.** The affiliate gets no credit if the visitor navigates away and returns later unless the `so_ref` cookie is set at page load.

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | A page exists at `/card` returning 200. |
| 2 | Page renders with no `?ref` param — blank affiliate attribution. |
| 3 | Page renders with `?ref=VALIDCODE` — displays affiliate first name: `"You were referred by [Name]."` |
| 4 | Page renders with `?ref=INVALIDCODE` — gracefully omits the attribution line, no error. |
| 5 | On page load with `?ref=CODE`, the `so_ref` cookie is set (90-day, SameSite=Lax). |
| 6 | Primary CTA `"Commission a project →"` routes to `/services/request`. |
| 7 | Secondary CTA `"Learn the method →"` routes to `/maestro`. |
| 8 | Below-fold section provides 3-sentence max description of Studio Ordo — no duplicate CTAs. |
| 9 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **Client component for cookie + affiliate name.** The page needs to read `?ref` from `searchParams`, resolve the affiliate name from the API, and set the `so_ref` cookie client-side on load. `"use client"` required.

2. **Affiliate name lookup is best-effort.** If the API returns an error or the code doesn't resolve, the page renders without the attribution line. It never shows an error state to the visitor — that degrades the landing experience.

3. **Cookie is set client-side on mount.** `document.cookie = \`so_ref=CODE; Max-Age=${90 * 86400}; path=/; SameSite=Lax\`` or via a server action. Either approach is acceptable. The cookie must be set before the visitor navigates to `/services/request`.

4. **`/r/[code]` redirect updated in this sprint.** After building `/card`, update `src/app/r/[code]/route.ts` to redirect to `/card?ref=CODE` instead of `/services`. The cookie-setting behavior in `/r/[code]` is preserved — it's a belt-and-suspenders measure. The `/card` page also sets the cookie in case the visitor bookmarks `/card?ref=CODE` directly.

5. **No more than two CTAs on this page.** Buyer CTA and learner CTA. That's it. No newsletter signup, no booking link, no "Join the Studio" — those are for `/join`. This page is the first-impression card. Two doors.

6. **Below-fold is 3 sentences.** From `05-qr-landing.md`: "The business card you're holding belongs to a Studio Ordo member." Lead with the most specific sentence. No happy talk.
