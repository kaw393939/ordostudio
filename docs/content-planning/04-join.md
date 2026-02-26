# `/join` Page — Content Spec

**Status:** Draft · **Last updated:** 2026-02-24
**Source file:** `src/app/(public)/join/page.tsx` + `src/components/join/guild-join-flow.tsx`

---

## Current State

The `/join` page already exists and renders a `GuildJoinFlow` component. The metadata says:
> "Three questions to find your path in Studio Ordo — Apprentice, Journeyman, Maestro Accelerator, Affiliate, or Observer."

The headline is: `"Find Your Path in the Studio."` — this is correct tone.

**Before rebuilding anything, read the `GuildJoinFlow` component** to understand what the three questions currently are and where they route. This spec describes the *target* flow — the actual component may already be close.

---

## Purpose of `/join`

This page is the **universal intake router**. Every site-wide CTA that doesn't have a specific destination ("Join the guild") should land here.

The page asks 3 questions maximum and routes the visitor to the right place in under 60 seconds. It never forces commitment — it surfaces options.

---

## The Three Audiences This Page Must Route

| Audience | Their Statement | Destination |
|----------|----------------|-------------|
| The Buyer | "I have something I need built" | `/studio` → then `/services/request` |
| The Learner | "I want to direct AI agents myself" | `/maestro` |
| The Builder/Apprentice | "I want to join the guild and start building" | Apprentice onboarding path (`/apprentices` or `/apply`) |

A fourth audience may arrive here via `/card` — someone who received an affiliate's QR card. They are not an Affiliate; they are a Buyer or Learner with a referral code already in their cookie. `/card` handles them. `/join` does not need to.

---

## Target Flow — 3 Buttons, Immediate Routing (Krug rewrite)

> **Krug audit of original spec:** 3 questions × branching sub-paths = up to 7 sequential decisions before the user reaches a destination. That is the definition of "make me think." Every extra choice doubles decision time. Every sub-question is an instruction that signals the UI failed.
>
> **The fix:** 3 buttons. Immediate routing. No sub-questions.

### The entire flow is one screen

```
HEADLINE: What brings you here?

[  I need something built      ]   → /studio
[  I want to learn this method ]   → /maestro
[  I want to join the guild    ]   → /apply
```

**Rules:**
- 3 options. Not 4. Not 5.
- Each label is under 6 words.
- Each button routes immediately. No confirmation screen.
- No parenthetical sub-labels under buttons — if a label needs explanation, the label is wrong.
- Buyer ("I need something built") goes first. Highest revenue priority.

### Why the sub-questions are cut

**Question 2 ("What's your background?")** had 3 sub-options for Learners and 3 for Builders. But all Learner sub-types land on `/maestro`. All Builder sub-types land on `/apply`. Questions that don’t change routing have no business existing.

**Question 3 ("What's your timeline?")** is the clearest offender. "Researching" users still go to `/maestro`. The newsletter offer lives on `/maestro`. This question added a step with zero routing value.

---

## Destination Routing Map

| Button | Destination | Why |
|--------|-------------|-----|
| I need something built | `/studio` | Direct to client-facing page |
| I want to learn this method | `/maestro` | All Learner sub-types — let the page sort them |
| I want to join the guild | `/apply` | All Builder sub-types — let the form capture context |

---

## Page Design Notes

- One screen. Three buttons. Nothing else.
- Full-width buttons, large tap targets — mobile first
- No progress indicator — there is only one screen, not a sequence
- No back button — there is only one screen
- No sub-labels under buttons — if a label needs explanation, rewrite the label

---

## Result State Copy

With immediate routing there are no result state screens — each button goes directly to its destination. If the component shows a brief transition confirmation, 2 lines max. First line: what they’re getting. Second line: what happens next.

**Buyer:**
```
Tell us what you need.
A studio member will scope it with you.   → /studio
```

**Learner:**
```
Maestro Training is a 4–6 week cohort.
See the curriculum and book a call.       → /maestro
```

**Builder:**
```
Apprentices join free.
We’ll review your application.            → /apply
```

---

## Meta Tags (target)

```
title: "Find Your Path — Studio Ordo"
description: "Commission work, learn to direct AI, or join as an Apprentice. Three choices."
canonical: "/join"
```

---

## What to Verify in GuildJoinFlow Component

Before touching code, read `src/components/join/guild-join-flow.tsx`:

- [ ] Does it currently show 3 buttons on one screen, or a multi-step flow? (If multi-step: flatten it.)
- [ ] Do the 3 buttons route to `/studio`, `/maestro`, `/apply`?
- [ ] Does it accept `?intent=buyer` or `?intent=learner` URL params (for pre-selection from `/card`)?
- [ ] Are the labels consistent with Apprentice / Journeyman / Maestro (not Novice / Associate)?
- [ ] Is it keyboard navigable and screen-reader labeled?

Adjust only what’s inconsistent. Don’t rebuild what already works.
