# Sprint 24: Site-Wide CTA Audit Fixes

## 1. Problem Statement

Every user flow in the site depends on correct CTA labels and routing. The gap analysis (`GA-01`, `GA-02`, `06-cta-audit.md`) identified several broken or retired CTAs that are actively misdirecting traffic before any new pages can be built.

This sprint is a pre-condition for all subsequent work. Building `/maestro` and `/card` while the homepage still reads `"Hire an Associate →"` means every new page competes with wrong signals already in place.

### P0: Retired / Wrong CTAs in Live Code

1. **`"Hire an Associate →"` on homepage §02.** The label refers to a role that doesn't exist in the approved guild hierarchy. It routes to `/services/request` — correct destination, wrong concept. Misleads both buyers and learners.
2. **Section 01 headline: `"The Double Stripping is here."`** Jargon. A first-time visitor stops and thinks "what does that mean?" — a question mark that costs trust (per `01-homepage.md`).
3. **Section 02 heading: `"The 40/60 Split"`** — content plan specifies `"The 40/60 Method"`.
4. **Section 02 opener: `"A 90-day high-intensity transformation."`** — bootcamp marketing language; off-brand per `01-homepage.md`.
5. **`/join` page metadata description** still lists: `"Apprentice, Journeyman, Maestro Accelerator, Affiliate, or Observer"` — pre-unified model. Needs update to reflect single Affiliate type and simplified routing.
6. **`/r/[code]` redirect** sends QR card scans to `/services` — correct once `/card` exists, but the content plan confirms the target is `/card?ref=CODE`. Flagged in this sprint; implemented in Sprint 31 after `/card` is built.

### P1: Missing CTAs

7. **No `"Commission a project →"` CTA exists anywhere in the public site.** This is the primary buyer CTA per `06-cta-audit.md`. It must exist on the homepage before `/studio` is rewritten.
8. **No `"Enroll in Maestro →"` CTA on homepage hero.** Primary learner CTA. Hero tiles must be created. (Hero tile build is Sprint 28 — this sprint preps the label spec and audits what `HomeHero` currently renders.)

---

## 2. Acceptance Criteria

| # | Criterion | File |
|---|-----------|------|
| 1 | Homepage §01 headline changed to `"AI is automating execution. What remains is direction."` | `page.tsx` |
| 2 | Homepage §02 heading changed to `"The 40/60 Method"` | `page.tsx` |
| 3 | Homepage §02 `"A 90-day high-intensity transformation."` sentence removed | `page.tsx` |
| 4 | Homepage §02 CTA changed from `"Hire an Associate →"` to `"Commission a project →"` | `page.tsx` |
| 5 | `/join` page metadata description updated to reflect simplified flow | `join/page.tsx` |
| 6 | All tests pass and `npm run build` succeeds | — |

---

## 3. Decisions

1. **Scope limit.** This sprint does not rewrite page sections — it fixes labels, headlines, and one sentence only. Full section rewrites are Sprint 27 (studio) and Sprint 28 (homepage). Mixing them creates merge conflicts and makes QA harder to scope.

2. **Hero tiles not in this sprint.** The `HomeHero` component and complete hero spec (two tiles: `"Commission a project →"` / `"Enroll in Maestro →"`) are Sprint 28. `HomeHero` is an experiment component; examining it to understand what it currently renders is a T1 task but modifying it is deferred.

3. **`/r/[code]` redirect not changed this sprint.** Target route (`/card`) doesn't exist yet. It will be changed in Sprint 31 after Sprint 26 builds `/card`.

4. **No new components.** This sprint is string edits only — no new files, no new components. Every change is either a string literal or a link `href` in an existing file.
