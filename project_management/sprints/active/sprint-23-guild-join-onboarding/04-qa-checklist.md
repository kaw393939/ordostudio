# Sprint 23: Guild Join Onboarding QA Checklist

## 1. Route & Page Shell

- [ ] `/join` returns 200 (not 404).
- [ ] Page title reads: **"Find Your Path in the Studio."** (with period — Sage voice, declarative).
- [ ] Page subtitle reads: **"Answer three questions. See what fits."** — not "five minutes" or any unverifiable time promise.

---

## 2. Question Flow — Krug Compliance

- [ ] Step 1 is visible on initial load; steps 2 and 3 are not in the DOM.
- [ ] Progress indicator (●──○──○ style) is visible at the top of each step.
- [ ] "Continue" button is disabled (or a no-op) until an answer is selected.
- [ ] Selecting q1 and clicking "Continue" advances to step 2.
- [ ] Selecting q2 and clicking "Continue" advances to step 3.
- [ ] Button label on step 3 reads **"See My Paths →"** (not "Continue") — rewards commitment.
- [ ] "← Back" on step 2 returns to step 1 with prior selection preserved.
- [ ] "← Back" on step 3 returns to step 2 with prior selection preserved.
- [ ] At no step is there more than one primary forward action.
- [ ] Completing all 3 questions renders the results section.

---

## 3. Path Card Routing Logic

- [ ] `q1 = 'craft'` → Apprentice card shown; Maestro Accelerator card NOT shown.
- [ ] `q1 = 'expertise'` → Maestro Accelerator card shown; Apprentice card NOT shown.
- [ ] `q1 = 'projects'` → Journeyman card shown.
- [ ] `q1 = 'company'` → Affiliate card shown.
- [ ] `q2 = 'observe'` → only Observer card shown (override; all paid paths suppressed).
- [ ] Observer card is shown for every other combination of answers.

---

## 4. Path Card Content & CTAs (Creator / Commitment)

- [ ] Each visible card has a `Badge` with the path name.
- [ ] Each visible card renders using only 3 type roles: `type-title`, `type-body-sm`, `type-meta`.
- [ ] Each visible card has exactly **one** CTA button: "Book a Path Consult →".
- [ ] Each CTA `href` contains the `BOOKING_URL` value (imported from `@/lib/metadata`).
- [ ] Each CTA `href` contains a `?path=` query param with the correct path key.

---

## 5. Influence Compliance — Cialdini & Archetype

### Reciprocity
- [ ] Observer card copy communicates free, no-commitment value **first** — before any CTA.
- [ ] Observer card meta line reads: "Join when you're ready. Or don't." — no pressure, no teaser.
- [ ] Observer content is described as **complete in itself**, not as a lesser tier or teaser.

### Authority
- [ ] Apprentice card renders an `authorityLine` with sourced, verifiable credential copy
      (e.g., "23 years · 10,000+ engineers trained.") — not a superlative.
- [ ] Authority line uses `type-meta` styling (subordinate to the offer — Swiss hierarchy).

### Scarcity (Genuine Only)
- [ ] Maestro Accelerator card includes a cohort/capacity note (e.g., "Cohort-based · Limited by maestro capacity.").
- [ ] The scarcity note does NOT include a countdown timer.
- [ ] The scarcity note does NOT say "X seats left" unless that is a verified, current operational fact.
- [ ] If no cohort date is finalized, cohort date is omitted entirely — not fabricated.

### Unity
- [ ] Footer link reads **"Join the Studio →"** (official CTA verb per `one-page-brand-sheet.md`) — not "Join the Guild."
- [ ] Affiliate card copy emphasizes that the affiliate's own identity is "primary"; Studio Ordo is "on the back of the card."

### Anti-patterns (Permanently Banned)
- [ ] No path card uses words like "transformative," "game-changing," "revolutionary," or unverifiable superlatives.
- [ ] No card copy implies "you'll be left behind if you don't act."
- [ ] No manufactured scarcity, no countdown timers, no artificial "hurry" signals.
- [ ] All credential claims are specific and verifiable (sourced in `influence-strategy.md §2.4`).

---

## 6. Swiss / Bauhaus Compliance

- [ ] Each path card uses ≤3 type roles. Badge is a UI signifier and does not count.
- [ ] All body text in cards is left-aligned (not centered).
- [ ] No decorative elements added (borders, shadows, icons) beyond the design system primitives.
- [ ] Card layout is single-column (no multi-column card grid that would break on mobile).
- [ ] Type hierarchy within each card is unambiguous: title > body > meta.

---

## 7. Footer & Studio Page Changes

- [ ] Footer contains "Join the Studio →" link on all public pages (home, studio, events).
- [ ] Footer link points to `/join`.
- [ ] Studio page hero has a tertiary text link: **"Not sure which path fits you? →"**
- [ ] Tertiary link uses `type-meta text-text-muted` — subordinate, does not compete with primary CTAs.
- [ ] Tertiary link points to `/join`.

---

## 8. Archetype Checklist (from `influence-strategy.md §7`)

Run before marking T7 complete:

- [ ] **Sage first:** Does every claim on the `/join` page teach something true? Is every authority claim sourced or bounded?
- [ ] **Creator present:** Does each path card reference a tangible artifact (portfolio, Context Pack, framework)?
- [ ] **Hero earned:** Where aspirational (Apprentice card), does the copy show the work required — not just the reward?
- [ ] **Anti-hype clean:** Would an experienced engineer read this page without cringing?
- [ ] **Genuinely useful:** Would the Observer path provide real value to someone who never pays anything?
- [ ] **Influence transparent:** If someone identified the Cialdini tactics, would they respect them?
- [ ] **Swiss design aligned:** Clean, precise, content-forward, no ornamental noise?

---

## 9. Tests & Build

- [ ] All 13 unit tests in `src/components/join/__tests__/guild-join-flow.test.tsx` pass.
- [ ] `npx vitest run` passes with no new failures across the whole suite.
- [ ] `npm run build` completes without errors.
