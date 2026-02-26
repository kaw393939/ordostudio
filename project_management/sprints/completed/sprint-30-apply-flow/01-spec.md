# Sprint 30: `/apply` Flow Improvements

## 1. Problem Statement

`/apply` currently returns 404. There is no index page at this route. Visitors arriving from Sprint 29's `"I want to join the guild."` button hit a dead end.

Beyond the missing index, the apply sub-forms have known field quality issues:

**`/apply/apprentice`:**
- `experience` field is a single-line `<Input>` — inadequate for a narrative answer
- Missing fields: current role, years of experience
- No `so_ref` cookie read — affiliate referral attribution is lost

**`/apply/affiliate`:**
- Dead `useEffect` with a TODO comment (from `GA-03-guild-member-flow.md`)
- Missing fields: `platform` (where they post/share), `audience_description` (who follows them)

From `GA-03-guild-member-flow.md`:
> "All three apply forms exist but `/apply` itself 404s. The Apprentice form is missing the two most important questions. The Affiliate form has dead code."

**Sprint 30 depends on:** Sprint 29 (`/join` routes to `/apply` — must exist before this matters to visitors).

---

## 2. Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | `/apply` returns 200 with a working index page. |
| 2 | `/apply` index shows three paths: Apprentice, Journeyman, Affiliate. |
| 3 | Each path on the `/apply` index links to the correct sub-route. |
| 4 | `/apply/apprentice`: `experience` field is a `<Textarea>`, not `<Input>`. |
| 5 | `/apply/apprentice`: `current_role` field exists (text input). |
| 6 | `/apply/apprentice`: `years_experience` field exists (number input or select). |
| 7 | `/apply/apprentice`: `so_ref` cookie value is read on load and included in form submission context. |
| 8 | `/apply/affiliate`: dead `useEffect` TODO code is removed. |
| 9 | `/apply/affiliate`: `platform` field exists. |
| 10 | `/apply/affiliate`: `audience_description` field exists (textarea). |
| 11 | `npm run build` succeeds and all tests pass. |

---

## 3. Decisions

1. **`/apply` index describes each path in plain terms.** Apprentice: you want to learn and work. Journeyman: you have experience and want project access. Affiliate: you refer work and earn commission. One sentence each. Not a skills test — a path selection.

2. **`so_ref` on Apprentice form.** Read `document.cookie` for `so_ref` in a `useEffect` (or server-side via cookies headers). Pass it as a hidden field or include in the form payload's `referral_code` field. This closes the referral attribution loop: Affiliate refers via QR → visitor lands on `/card?ref=CODE` → cookie set → visitor applies → cookie included in application.

3. **Dead `useEffect` removal.** Whatever the TODO was in `/apply/affiliate`, remove the entire dead block. If it was scaffolding for something needed, assess what it was supposed to do and implement it properly or defer it with a documented note.

4. **`/apply/journeyman` is not changed this sprint.** Sprint 30 scope is limited to: the index, Apprentice field improvements, and Affiliate dead code fixes. Journeyman form is out of scope unless audited as part of T1 and found to have the same pattern of missing fields.
