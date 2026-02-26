# Sprint 27: `/studio` Rewrite — Client-Facing Only

## 1. Problem Statement

The `/studio` page currently mixes two audiences that have incompatible decision states:
1. **Buyers** — engineering directors, CTOs, product leads who need to commission software
2. **Learners / Guild candidates** — people interested in the Maestro course or joining the guild

The page's current state (from `GA-01-buyer-flow.md`):
> "References to the guild hierarchy and the Bottega historical framing appear in the primary buyer path. The page is doing two jobs and doing neither well."

Specific content that does not belong on a buyer-facing page:
- Bottega historical narrative (Leonardo/Verrocchio)
- `StudioBottegaModel` component — shows guild hierarchy to someone trying to hire
- "You're not learning to code" section — addresses a learner objection, not a buyer's
- `RecommendedEvents` component — recruiting feed on a client services page
- `"Get the Context Pack Starter Kit →"` — lead-gen link, wrong audience

From `02-studio.md`:
> "When a buyer visits /studio, they need to know three things: what you build, who you build it for, and what it costs to start. Nothing else."

**Sprint 27 depends on:** Sprint 24 (CTA label conventions done), Sprint 25 (/maestro exists so cross-links work).

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/studio` returns 200. |
| 2 | Page hero reads: `"Commission a project."` |
| 3 | Hero subhead reads: `"AI-capable engineers. Spec-driven method. Audit-logged deliverables."` |
| 4 | Hero CTA reads `"Start a project →"` → `/services/request`. |
| 5 | "What We Build" section lists exactly 5 items in buyer-language (no guild jargon). |
| 6 | "Who We Work With" section describes CTOs/engineering directors/product leads. |
| 7 | Proof point appears: `"23 years teaching engineers · 10,000+ trained."` |
| 8 | "How We Work" section frames 40/60 as buyer assurance (not recruiting pitch). |
| 9 | `StudioBottegaModel` component is removed from this page. |
| 10 | `RecommendedEvents` component is removed from this page. |
| 11 | "You're not learning to code" section is removed. |
| 12 | Bottega/Leonardo/Verrocchio historical narrative is removed. |
| 13 | `"Get the Context Pack Starter Kit →"` link is removed. |
| 14 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **Remove, don't refactor.** `StudioBottegaModel` and `RecommendedEvents` are not going to other pages — they're being removed from the public buyer path entirely. Don't move them, delete their usage from this page. The components themselves can remain in the codebase as dormant if they're used elsewhere; just don't render them here.

2. **40/60 framing stays — as buyer assurance.** Current content positions 40% spec / 60% build as a recruiting pitch about guild method. Reframe it: "We spend 40% of engagement time in spec. That means fewer surprises at delivery." Same ratio, different recipient.

3. **No learner cross-links on this page.** The Studio page is for buyers. It doesn't say "Also, want to learn?" A buyer who's also interested in Maestro will find it through `/join` or `/maestro` via the nav. Don't split their attention.

4. **"Start a project →" not "Commission a project →".** On the Homepage hero tile, it's `"Commission a project →"` → `/studio`. On `/studio` itself, the CTA goes to `/services/request`. At that second step, `"Start a project →"` is the right label — it's an action instruction, not a category label.

5. **Proof point is consistent with the rest of the site.** Same 3 numbers used across /maestro, /card, and /studio: "23 years · 10,000+ students". On /studio minor variation is acceptable: "23 years teaching engineers · 10,000+ trained."
