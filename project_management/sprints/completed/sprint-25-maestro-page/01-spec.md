# Sprint 25: `/maestro` Page — New Build

## 1. Problem Statement

The Maestro Training program is the highest-revenue product in the business model ($3,000–$5,000 cohort / $1,500–$2,500/month advisory). It currently has **zero public surface**. No page exists at `/maestro`. No link points to it. The homepage hero (post-Sprint 28) will send learners here. The `/join` page (post-Sprint 29) will route learners here. Both of those sprints are blocked without this page existing.

From `GA-02-learner-flow.md`:
> "This is the primary acquisition page for the highest-revenue product."

### What's Missing

1. **No `/maestro` route.** Visiting `/maestro` returns 404.
2. **No training product page.** The only training-adjacent public page is `/services/advisory`, which describes a B2B advisory product for engineering leadership, not an individual Maestro Training program.
3. **No booking entry point for Maestro Training.** All training CTAs currently point to `BOOKING_URL` with no path context. `/maestro` creates the entry point and passes `?source=maestro` so the booking tool has context.

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | A page exists at `/maestro` returning 200. |
| 2 | Page `<title>` is `"Maestro Training — Studio Ordo"`. |
| 3 | Hero headline: `"Direct the machine. Build the practice."` |
| 4 | Hero subhead: `"Eight weeks. Your expertise, re-oriented for agentic workflows."` |
| 5 | Primary CTA: `"Book your discovery call."` → `BOOKING_URL` |
| 6 | "Who This Is For" section renders — two sentences max, no nested clauses. |
| 7 | Checklist section renders — 5 items using `<ul>` or similar, NOT a multi-column grid. |
| 8 | "Choose your format." section renders two format cards: Cohort and Advisory with pricing. |
| 9 | FAQ section renders 4 questions. Headline: `"Questions we get."` |
| 10 | Close section headline: `"Built with the method."` CTA: `"Book your discovery call."` → `BOOKING_URL` |
| 11 | Sub-CTA at close: `"Read the framework →"` → `/insights` |
| 12 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **Server component.** No interactive state needed on this page. Pure server component — no `"use client"`. Faster load, better SEO score.

2. **`BOOKING_URL` from `@/lib/metadata`.** All booking CTAs use the existing constant. Append `?source=maestro-cohort` or `?source=maestro-advisory` so the booking tool can distinguish intent.

3. **Format cards use existing `Card` primitive.** Two cards side-by-side (or stacked on mobile) for Cohort vs Advisory. No new primitives needed.

4. **FAQ uses plain section + `<dl>` or Card per item.** No accordion — that's extra complexity for 4 items. Expanded answers, full text visible.

5. **No cohort date hardcoded.** If no next cohort date is confirmed, the cohort card reads "Cohort-based · Next cohort dates available on booking call." No fabricated urgency.

6. **"Who This Is For" — 2 sentences, no list.** Per `03-maestro.md`: the previous 2-paragraph version with nested clauses was cut. Direct. Hard cap.

7. **This page is for Maestro Training applicants only.** It is not the `/studio` client page. No project commission content belongs here. If a visitor arrives here wanting to commission work, the nav routes them to `/studio`.

8. **`/maestro` is a new directory.** Create `src/app/(public)/maestro/page.tsx`. No layout override needed — inherits `(public)/layout.tsx`.
