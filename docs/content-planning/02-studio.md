# `/studio` Page — Content Plan

**Status:** Draft · **Last updated:** 2026-02-24
**Source file:** `src/app/(public)/studio/page.tsx`

---

## The Problem with the Current Page

The current `/studio` page tries to be two things at once:

1. An **apprenticeship recruitment page** — "Join the Bottega, learn by shipping, graduate through the levels"
2. A **client-facing services page** — "Book a Technical Consult, commission work"

These two audiences want completely different things. The engineering director who wants to commission a project does not want to read about Leonardo da Vinci's apprentice training. The developer who wants to learn does not want to be shown a consulting rate card.

**The split:**
- Client-facing content → `/studio` (this page)
- Training program content → `/maestro` (new page)

---

## Target Audience for `/studio`

**Primary:** The Buyer — director, founder, VP who needs something built and wants a vetted, AI-capable team.

**Secondary:** The affiliate or Journeyman who wants to understand how project work flows through the guild before committing.

**Not for this page:** Someone who wants to enroll in training. Route them to `/maestro`.

---

## Target Page Structure

### Hero

```
LABEL:    Studio Ordo
HEADLINE: Commission work from a vetted AI-capable team.
SUBHEAD:  Every project arrives specced, gets built under review, and ships with an audit log.
PROOF:    23 years teaching engineers · 10,000+ students

PRIMARY CTA:   [Commission a Project]  → /services/request
SECONDARY CTA: [Book a discovery call] → BOOKING_URL

SMALL LINK:   Not sure what you need? → /join
```

---

### 01 — How the Guild Works

**Headline:** How Studio Ordo delivers.

**Four-step flow (horizontal or numbered list):**

| Step | Label | Description |
|------|-------|-------------|
| 1 | You scope it | Submit a brief. We turn it into a Context Pack — project requirements, domain context, evaluation criteria. |
| 2 | We staff it | A Journeyman or Maestro picks it up from the work board. You see who you're working with before you commit. |
| 3 | They build it | 40/60 method. Every session logged. AI Audit Log documents accept/reject/modify decisions. |
| 4 | You evaluate it | Work delivered against the original evaluation criteria. You can grade the output. |

**Note:** This section explains the guild model without requiring the client to understand the training hierarchy. Client doesn't need to know about Apprentices.

---

### 02 — What You Get

**Headline:** Every project comes with:

**Checklist or grid format:**

- **Context Pack** — A written spec of exactly what was built and why. Readable by any engineer who comes after.
- **AI Audit Log** — A documented record of every AI accept/reject/modify decision during the build. Compliance-ready.
- **Evaluation Evidence** — The build measured against the criteria you defined at the start.
- **The Work** — Production-grade code or artifact, not a demo.

**Design note:** This section directly addresses the Marcus Chen persona anxiety: "I can't prove they're helping." The audit log and evaluation evidence are the proof.

---

### 03 — What We Build

**Headline:** What the guild builds.

**Target list (buyer language — no jargon a VP Engineering would Google):**
- Automating internal reporting and data pipelines
- Building AI-assisted tools your team actually uses
- Evaluating AI vendor claims with a structured test harness
- Implementing review workflows so AI output gets checked before it ships
- Capability assessments: where your team is now, what they need next

**Rule:** Don’t list work the studio hasn’t done. Add items as proof points exist.

---

### 04 — Proof (The Portfolio)

**Headline:** Built with the method.

Reference content from `business/studio-ordo/maestro/proof-of-craft.md` — pull 2–3 portfolio projects with:
- What was built
- Context Pack approach used
- Outcome / evaluation result

**Also include:** The "one evening" story from keith-williams-profile.md:
> In February 2026, Keith built a complete Swiss-design portfolio website in approximately 10 hours — 200+ AI interactions, 28,000 words of generated content. Lighthouse: 100/100 across all four metrics. A traditional agency would estimate $15,000–$30,000 and 3–4 weeks for equivalent work.

This is a proof-of-method story, not self-promotion. It demonstrates what a trained AI director produces.

---

### 05 — The Guild Guarantee

**Headline:** Our standard.

**Body:**
> Every project that runs through Studio Ordo follows the same method: a written spec before any build begins, evaluation criteria defined before the first line of code, and an AI Audit Log documenting every significant decision. If we can't meet your evaluation criteria, we renegotiate scope before delivery — not after.

This section does not need a CTA. It's a trust statement.

---

### Close

```
HEADLINE:  Ready to commission work?
SUBHEAD:   Tell us what you need. We'll scope it and introduce you to the right team member.

PRIMARY CTA:   [Commission a Project]  → /services/request
SECONDARY CTA: [Or join as a Journeyman] → /join
```

---

## What to REMOVE from Current Page

| Current Section | Action | Reason |
|----------------|--------|--------|
| "The Studio Apprenticeship" hero with training program bullets | REMOVE / REPLACE | Confuses buyer audience |
| Bottega hierarchy (Novice/Apprentice/Journeyman/Maestro tiers as training levels) | MOVE to /maestro | This is training program content, not client content |
| "Alex's Story" apprentice narrative | MOVE to /maestro | Student journey has no value for a client |
| "CEO of Agents" section | MOVE to /maestro or homepage | Training-side content |
| Four gate projects in the training pipeline | MOVE to /maestro | Not relevant to buyers |
| Cal.com booking link (BOOKING_URL) | KEEP as secondary CTA | Fine, just de-emphasize |
| Jack Clark quote | KEEP on homepage (it's already there) or keep here as supporting proof — both is fine |
| "Get the Context Pack Starter Kit" link | KEEP as tertiary link | Good entry point for buyers who want to understand the method |

---

## What to KEEP from Current Page

| Current Section | Action | Note |
|----------------|--------|------|
| Bottega concept paragraph (da Vinci, real work, maestro) | KEEP but condense | Good brand story — keep one paragraph, cut the training detail |
| Jack Clark quote | KEEP | Perfect proof point |
| "Book a Technical Consult" CTA | KEEP, relabel to "Book a discovery call" | Approved CTA |
| "Not sure which path fits you?" link to /join | KEEP | Good routing escape valve |

---

## Meta Tags (target)

```
title: "Commission a Project — Studio Ordo Guild"
description: "AI-capable engineers, spec-driven method, audit-logged deliverables. Commission work or book a discovery call."
canonical: "/studio"
```

Current: `"A decentralized guild model. Learn by shipping, graduate to independent contractor, and leverage our affiliate network."` — This is about the training program. Completely wrong for a client-facing page.

---

## Component File References

| Component | File | Change |
|-----------|------|--------|
| Studio page | `src/app/(public)/studio/page.tsx` | Full rewrite |
| StudioBottegaModel | `src/components/studio/studio-bottega-model.tsx` | Move to /maestro — don't render on /studio |
| RecommendedEvents | `src/components/studio/recommended-events.tsx` | Review — keep only if events are client-relevant |
