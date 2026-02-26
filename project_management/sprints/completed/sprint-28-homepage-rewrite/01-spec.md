# Sprint 28: Homepage Rewrite

## 1. Problem Statement

The homepage is the highest-traffic page on the site. It currently fails both types of visitors:

**Buyers:** The hero does not communicate what Studio Ordo builds or who it builds it for. "Canon 3-card block" (Section 03) explains internal guild philosophy. The "90-Day Transformation" section (Section 04) addresses a learner's journey, not a buyer's project timeline.

**Learners:** There is no visible path to `/maestro` — the highest-revenue product — anywhere above the fold.

From `GA-01-buyer-flow.md`:
> "The homepage doesn't have a clear buyer entry or learner entry. Both audiences arrive and have to guess where to go."

From `01-homepage.md`:
> "The homepage should do one thing: route people to the right door. Two doors. Commission a project. Enroll in Maestro. That's it."

**Sprint 28 depends on:**
- Sprint 24 (CTA label conventions fixed)
- Sprint 25 (/maestro exists, so the `"Enroll in Maestro →"` tile works)
- Sprint 27 (/studio rewritten as buyer-facing, so the `"Commission a project →"` tile doesn't land on a mixed-audience page)

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Hero heading: `"Bring order to AI in software delivery."` |
| 2 | Hero subhead is two lines — the two-sentence spec from `01-homepage.md`. |
| 3 | Hero has exactly two tiles: `"Commission a project →"` → `/studio` and `"Enroll in Maestro →"` → `/maestro`. |
| 4 | Proof point below tiles: `"23 years teaching engineers · 10,000+ students"` |
| 5 | "Canon 3-card block" (Section 03) is removed. |
| 6 | "90-Day Transformation" section (Section 04) is removed. |
| 7 | `HomeHero` component is updated (was audited read-only in Sprint 24 T4). |
| 8 | `/studio` tile uses `"Commission a project →"` label (matches Sprint 24 GA decision). |
| 9 | `/maestro` tile uses `"Enroll in Maestro →"` label. |
| 10 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **Hero is the full-page above-fold.** No secondary headline, no tagline stack above the main heading. `"Bring order to AI in software delivery."` is the single H1. Done.

2. **Two tiles, not two buttons.** Tiles (card-style, equal visual weight) communicate that these are two different doors for two different people — not a primary/secondary choice between options. A buyer shouldn't wonder if they should click the learner button. Equal tiles signal "pick your path."

3. **Hero subhead: two sentences only.** The two sentences tell the buyer what the company does and tell the learner what they'll get. They don't overlap. Read `01-homepage.md` for the locked copy.

4. **`HomeHero` component is the target.** Sprint 24 T4 was a read-only audit of `HomeHero`. Sprint 28 is the full rewrite. Read the Sprint 24 T4 audit findings in the spec before modifying `HomeHero` to understand what prop modifications are needed.

5. **Sections 03 and 04 are deleted, not moved.** The Canon 3-card and 90-Day Transformation content lives nowhere else on the public site after this sprint. The components may remain in the repo as dormant code — don't delete the component files unless they are exclusively used here.

6. **No "About" content on the homepage.** Proof point is stats-only. No paragraph about Studio Ordo's history or philosophy on the homepage. That's for `/studio` and `/maestro`.
