# Sprint 23: Guild Join Onboarding Spec

## 1. Problem Statement

Studio Ordo operates across five distinct relationship types — Apprentice, Journeyman, Maestro
Accelerator candidate, Affiliate, and Observer — yet every public surface funnels every visitor to a
single "Book a Technical Consult" CTA. This fails in three measurable ways:

### P0: No Path Entry Point
1. **No routing mechanism.** There is no page where a visitor answers a few questions and is shown the
   path that matches their situation. A potential Maestro candidate and a first-week career changer
   see the same page and the same button. Most bounce rather than self-select.
2. **Dead-end CTAs for non-apprentices.** The footer, studio page, and homepage all reference one
   booking link. A corporate affiliate lead, a domain expert considering the Maestro Accelerator, or a
   curious observer has no legible door.

### P1: Commitment Ladder Has No First Rung
3. **No micro-commitment before the consult.** Cialdini's commitment ladder (`influence-strategy.md
   §2.2`) calls for graduated steps. The current site jumps from "read a paragraph" to "book a 1-hour
   call." The `/join` self-assessment is the missing rung: 3 answers → path card → consult. Each
   step earns the next.
4. **Reciprocity has no home.** The Observer path (free, no commitment) exists operationally but has
   no public URL. Visitors who aren't ready to buy should receive genuine value before being asked for
   anything — that is the Reciprocity principle, and it is currently absent from the top of the funnel.

### P2: Highest-LTV Segment Is Invisible
5. **Maestro Accelerator has no public surface.** The Accelerator is the highest-LTV path (established
   practitioners re-orienting for agentic work), documented in `business/studio-ordo/maestro/` and
   validated by the Jack Clark/Ezra Klein analysis
   (`business/studio-ordo/ip/ezra-klein-jack-clark-analysis.md`). It currently has zero
   discoverability.

---

## 1b. Strategic Context (Why This Page Matters Now)

On February 24, 2026, Ezra Klein published an interview with Jack Clark — co-founder and Head of
Policy at Anthropic, the company building Claude Code. In 98 minutes, Clark said the sentence that
validates every architectural decision Studio Ordo has made:

> *"We're going to have to figure out what artisanal skills we want to almost develop… maybe a
> guild-style philosophy of maintaining human excellence in, and how organizations choose how to
> teach those skills."*
> — Jack Clark, Co-founder, Anthropic

This is not a sympathetic academic. This is the person building the AI systems. He used the word
**guild**. He used the phrase **maintaining human excellence**. This is Studio Ordo, described by
the man building the thing that makes Studio Ordo necessary.

Clark also named the problem the `/join` page solves: the failure mode he called **"junk food
work"** — outputs that look productive from outside while accumulating no judgment, no taste, no
capability. And he named what taste requires: doing the work yourself first, which is Gate 1 of
the Studio curriculum.

The `/join` page is the public entry point to the only structured program that is, word for word,
what the co-founder of Anthropic said needs to exist. The page must communicate this without
hyperbole and without squandering the credibility.

**What this means for the implementation:**
- The Maestro Accelerator card is the most strategically important path to surface (domain experts
  re-orienting for the agentic era — exactly Clark's framing). Do not bury it.
- The Observer card exists to give the "junk food work" audience a genuine first step that isn't
  junk. It must deliver real value.
- The question flow should feel like the beginning of a professional conversation, not a marketing
  quiz. Sage voice throughout: calm, direct, no hype.
- Source: `business/studio-ordo/ip/ezra-klein-jack-clark-analysis.md`

---

## 2. Acceptance Criteria

| # | Criterion | Archetype | Cialdini Principles |
|---|-----------|-----------|---------------------|
| 1 | A page exists at `/join` with the title "Find Your Path in the Studio." | Sage | Authority — the studio has a structured system for this |
| 2 | The page presents a 3-question self-assessment using progressive disclosure (one question at a time). | Sage | Commitment/Consistency — micro-commitment ladder begins here |
| 3 | Based on answers, matching path cards render: Apprentice, Journeyman, Maestro Accelerator, Affiliate, Observer. | Sage + per-path archetype | Social Proof — matching paths feel like recognition, not sales |
| 4 | The Maestro Accelerator card includes a genuine cohort/capacity signal (not manufactured scarcity). | Sage | Scarcity (genuine) — cohort size limited by maestro capacity |
| 5 | The Observer card communicates zero-commitment free value first and has no booking CTA pressure. | Sage (gentle) | Reciprocity — free, complete, no obligation |
| 6 | Each paid path card (Apprentice, Journeyman, Maestro Accelerator, Affiliate) has exactly one CTA: "Book a Path Consult →" linking to `BOOKING_URL?path={key}`. The Observer card uses a different CTA: "Follow the Work →" linking to `/newsletter`. No booking pressure on the zero-commitment path. | Creator | Commitment/Consistency — consult is the natural next step for paid paths. Reciprocity — Observer CTA delivers, not solicits. |
| 7 | The footer includes a "Join the Studio →" link (official CTA verb) pointing to `/join`. | Sage | Unity — "Join the Studio" is the registered CTA verb per `one-page-brand-sheet.md` |
| 8 | The Studio page hero includes a tertiary text link to `/join` for undecided visitors. | Sage | Commitment — lower-barrier alternative to booking |
| 9 | No path card uses hype language, unverifiable claims, or manufactured urgency. | Sage | Anti-pattern compliance — see `influence-strategy.md §5` |
| 10 | All existing tests pass and `npm run build` succeeds. | — | — |

---

## 3. Decisions

1. **Client component.** The 3-question flow requires local state (step index + answers). `join/page.tsx`
   will be `"use client"`. No server actions or DB tables needed.

2. **Reuse `BOOKING_URL` for paid paths.** Apprentice, Journeyman, Maestro Accelerator, and Affiliate cards append `?path={key}` to `BOOKING_URL` from `@/lib/metadata`. The Observer card does NOT use `BOOKING_URL` — its CTA links to `/newsletter`, which already exists. Routing an Observer answer to a booking page contradicts Consistency: the visitor just said they're not ready to decide.

3. **No per-path sub-routes this sprint.** We do not create `/join/apprentice`, `/join/maestro`, etc.
   Routing is visual only. Individual path pages are a future sprint.

4. **Existing primitives only.** `Button`, `Card`, `Badge`, `PageShell`, `Link` from
   `@/components/primitives`. No new installs. Swiss spec: ≤3 type roles per card.

5. **Progressive disclosure — one question at a time (Krug).** From *Don't Make Me Think*: show one
   obvious action per screen. A full 3-question form on first load violates this. Each step has one
   clearly primary action ("Continue →"), one clearly secondary action ("← Back"), and nothing else.

6. **Observer always rendered (Reciprocity).** Regardless of answers, the Observer card renders last.
   This keeps the zero-commitment free path permanently visible — never hidden by the routing logic.
   The free path must be genuinely complete in itself, not a teaser (see `influence-strategy.md §2.1`
   guardrail).

7. **Genuine scarcity only (Sage constraint).** The Maestro Accelerator card includes a cohort/capacity
   note only if true at implementation time. The q3 (timeline) answer drives the urgency note copy:
   `q3 = 'now'` → "Cohort forming now — limited by maestro capacity."
   `q3 = 'sorting'` or `'planning'` → "Cohort-based · Limited by maestro capacity."
   No countdown timers. No fabricated "X seats left" (`influence-strategy.md §2.6`).
   q3 must influence rendered output — collecting an answer with no effect on the result wastes the visitor's time (Krug).

8. **CTA verb alignment.** Footer link reads "Join the Studio →" to match the official CTA verb system
   (`one-page-brand-sheet.md`). "Join the Guild" is acceptable in page body copy where guild context is
   already established, but the nav-level tap target must use the registered verb.

9. **Swiss typography per card.** Each path card uses ≤3 type roles: `type-title` (path name),
   `type-body-sm` (description + bullets), `type-meta` (label/badge area). The Badge is a UI affordance,
   not a typographic role, and does not count toward the 3-role limit.

---

## 4. Influence Architecture (Implementer Reference)

Maps each path card to its archetype, Cialdini layers, and voice register. Use this as the copy
brief for T2 (GuildJoinFlow) and T3 (GuildPathCard).

| Path | Archetype | Primary Cialdini | Secondary Cialdini | Voice |
|------|-----------|------------------|--------------------|-------|
| Apprentice | Hero + Creator | Unity — "I am a Studio Ordo apprentice" is an identity | Commitment — gate projects are public commitments | Aspirational but earned. Show the work required, not just the reward. Anti-hype. |
| Journeyman | Creator | Commitment/Consistency — progression from Apprentice | Social Proof — advance by demonstrating mastery | Peer-to-peer. Respectful of existing skill. Not a promotion pitch. |
| Maestro Accelerator | Sage + Creator | Authority — deep expertise re-oriented, not replaced | Scarcity — genuine cohort constraint | Collegial. Sage-to-Sage. No condescension. "Your expertise has a new application." |
| Affiliate | Sage + Explorer | Reciprocity — Studio invests in their success first | Unity — they extend their practice, not replace it | Business partner tone. Their identity stays front. Studio Ordo is on the back of the card. |
| Observer | Sage (gentle) | Reciprocity — free, complete, no obligation | Liking — warm, zero-pressure invitation | Open door. Never "you'll be left behind if you don't commit." Give first, ask never. |
