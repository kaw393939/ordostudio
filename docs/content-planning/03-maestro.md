# `/maestro` Page — Content Spec (NEW)

**Status:** Draft · **Last updated:** 2026-02-24
**Route:** `src/app/(public)/maestro/page.tsx` (does not exist yet)

---

## What This Page Does

This is the **primary revenue page** for Studio Ordo's training business.

It exists to answer one question for the person who lands on it:

> "I'm a senior professional. AI is changing my field fast. I don't want to learn to code. I need to understand how to direct AI agents, evaluate their output, and make good decisions with the results. Is this for me?"

The answer the page delivers: **Yes. Here is exactly what you get, how it works, what it costs, and how to start.**

---

## Target Audience

**Not:** Developers learning to code, bootcamp students, beginners.

**Yes:**
- **Scientists, researchers, lab directors** who need to spec AI analysis pipelines and evaluate results
- **Product directors, project managers** who need to spec and review AI-built features without writing the code
- **Doctors, clinical leads** in health systems adopting AI who need to evaluate vendor claims
- **Founders, operators** who are running AI-using teams and need to stop rubber-stamping agent output
- **Engineering directors** who rose from IC, approved Copilot, and now can't evaluate what their team is producing

**Anthropic's own data (from acceleration-brief.md):** Anthropic is explicitly shifting hiring away from junior engineers toward senior engineers with "taste and intuitions." This audience of senior professionals IS the market.

**The Jack Clark signal (from Ezra Klein transcript):**
> "You have to be a product manager, not a coder."
This is the permission structure for this audience to seek training. They're not failing — they're ahead.

---

## Tone

Calm, credentialed, precise. No urgency theater. No "before it's too late."

This audience respects: sourced data, explicit criteria, credentials that check out, and a person willing to be specific about what they will and won't do.

---

## Page Structure

### Hero

```
LABEL:    Maestro Training · Studio Ordo

HEADLINE: You're already a senior professional.
          Now learn to direct the machine.

SUBHEAD:  Maestro Training is a 4–6 week cohort for the professionals
          who spec the work, evaluate the output, and are accountable
          for the result.

PROOF:    23 years teaching engineers · 10,000+ students

PRIMARY CTA:   [Book a Discovery Call]    → BOOKING_URL
SECONDARY CTA: [See the curriculum →]     → #curriculum
```

---

### 01 — Who This Is For

**Headline:** This program is not for developers. It’s for directors.

**Body (2 sentences max):**
> You supervise AI-augmented work but weren’t trained to evaluate what it’s actually producing. Maestro Training teaches the evaluation layer: how to spec work so it executes reliably, how to catch bad output, and how to own the result.

**Checklist — "This is you if:"**

```
□  You approve AI-generated work but can’t fully evaluate it
□  You brief AI agents or developers and the output keeps missing
□  You manage a team using AI and can’t assess what they’re producing
□  You’re in a regulated field where AI output needs an audit trail
□  You’re a founder who needs the work done and needs to know if it’s right
```

---

### 02 — What You Learn to Do

**Headline:** Four capabilities. Provable at the end.

**Four-item list with detail:**

**Spec the work.**
> Write a Context Pack: the brief, the domain context, the evaluation criteria, and the constraints. You’ll write one that actually executes.

**Evaluate the output.**
> Apply the criteria you wrote — pass or fail, and why. You leave with a repeatable rubric.

**Direct the iteration.**
> When output fails evaluation, diagnose why, revise the spec, re-evaluate. The professional who does this is not replaceable.

**Log the decisions.**
> An AI Audit Log documents every significant accept/reject/modify decision. This is the accountability artifact — evidence you were in the loop.

---

### 03 — Curriculum

**Anchor:** `#curriculum`
**Headline:** What the 4–6 weeks look like.

**Phase table:**

| Week | Phase | What You Build |
|------|-------|----------------|
| 1 | Foundation | Write your first Context Pack for a real domain problem. Understand the 40/60 split. |
| 2 | Evaluation | Build an evaluation rubric for your Context Pack. Run an AI agent against it. Grade the output. |
| 3 | Iteration | Take a failing evaluation. Diagnose why. Revise the spec. Re-evaluate. |
| 4 | Audit | Produce an AI Audit Log for a complete build cycle. Defend your decisions. |
| 5–6 (optional) | Advanced application | Apply to your actual domain problem. Maestro reviews and critiques. Portfolio-ready artifact. |

**Deliverables — what you leave with:**
- One complete Context Pack (domain-specific to your field)
- One evaluation rubric for that Context Pack
- One AI Audit Log documenting a complete decision cycle
- Maestro critique and feedback documentation

---

### 04 — Format + Pricing

**Headline:** Choose your format.

**Two-tile layout:**

```
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│  COHORT PROGRAM                    │  │  1:1 ADVISORY                      │
│  4–6 weeks · 4–6 participants      │  │  Ongoing monthly engagement        │
│                                    │  │                                    │
│  Weekly sessions with Keith.       │  │  Direct access to Keith.           │
│  Peer cohort doing real work.      │  │  Applied to your exact domain.     │
│  Portfolio artifact required.      │  │  Retainer-based, cancel monthly.   │
│                                    │  │                                    │
│  $3,000 – $5,000                   │  │  $1,500 – $2,500/month             │
│                                    │  │                                    │
│  [Apply for next cohort →]         │  │  [Book a discovery call →]         │
│  → /services/request               │  │  → BOOKING_URL                     │
└────────────────────────────────────┘  └────────────────────────────────────┘

Not sure which fits? Book a 30-minute call. → BOOKING_URL
```

**Pricing notes:**
- Do not hide the price. Marcus Chen (enterprise buyer) and Priya Sharma (individual) both make faster decisions with pricing visible.
- Cohort pricing shown as a range because it varies by the domain application (some require more preparation).
- These are the prices from the business model conversation. Confirm with Keith before publishing.

---

### 05 — Why This Isn't Prompt Engineering

**Headline:** This is not about better prompts.

**Body (from differentiator-matrix.md):**

> Prompts are a detail. They expire when the model changes.
>
> Maestro Training teaches the engineering operating system: specs, tests, evaluation gates, and accountability. A Context Pack works with GPT-4, Claude, Gemini, or whatever ships next year — because the method is about the problem, not the tool.

**Comparison row (3 columns):**

| Prompt Engineering Course | YouTube / Udemy Tutorial | Maestro Training |
|--------------------------|--------------------------|------------------|
| Teaches you what to type | Teaches you what to click | Teaches you how to direct |
| Expires when models change | Self-assessed | Evaluated against explicit criteria |
| No accountability artifact | No ongoing relationship | Context Pack + AI Audit Log |
| "I can use ChatGPT" | "I watched a tutorial" | "I ran a build cycle and here's the evidence" |

---

### 06 — Proof

**Headline:** Built with the method.

**Pull from `keith-williams-profile.md`:**

> In February 2026, Keith built a complete production portfolio site in approximately 10 hours. 200+ AI interactions. 28,000 words of generated content. Lighthouse scores: 100/100 across Performance, Accessibility, Best Practices, and SEO. A traditional agency would estimate $15,000–$30,000 and 3–4 weeks.

> This was not a demo. It was the Context Pack method — one person, directing AI agents with precise context, producing professional-grade output with measurable quality.

**Keith bio (condensed, from keith-williams-profile.md):**

> Keith Williams has spent 23 years teaching engineers at NJIT. He trained over 10,000 students — many now at Amazon, Google, JPMorgan, Goldman Sachs. He designed the BS in Enterprise AI program. Studio Ordo is the independent translation of that work into professional practice.

**Two-column proof strip:**

| Credential | Data |
|-----------|------|
| Years teaching engineers | 23 |
| Students taught | 10,000+ |
| Institutions (students' employers) | Amazon, Google, JPMorgan, Goldman Sachs, PSEG, Verizon, hundreds more |
| Years programming | 40+ (since 1983) |
| AI research (intensive) | 2+ years (since late 2022) |

---

### 07 — FAQ

**Headline:** Questions we get.

> Cut every answer’s first sentence if it restates the question. Stop after the real point lands.

**Q: I'm not technical. Will I be lost?**
> No. This program isn't about writing code — it's about directing work and evaluating the result.

**Q: How is this different from hiring a developer who uses AI?**
> A developer who uses AI still produces output you can't evaluate. This teaches you to grade what you receive.

**Q: I'm already getting decent results with AI tools. Why do this?**
> "Decent" without evaluation criteria is the risk. This teaches you what "good" looks like before you start — so you know if the output passed or failed.

**Q: Will this still apply when the models change?**
> Yes. The method is model-agnostic. Context Packs and evaluation criteria work the same way regardless of which model executes.

**Q: What's the time commitment?**
> Cohort: 4–6 weekly sessions (~3 hours each) plus artifact work between sessions. Advisory: flexible.

---

### Close

```
HEADLINE:  Book your discovery call.

PRIMARY CTA:   [Book a Discovery Call]   → BOOKING_URL
SECONDARY CTA: [Apply for next cohort →] → /services/request

SMALL TEXT: Need something built first? Commission a project → /studio
```

---

## Meta Tags (target)

```
title: "Maestro Training — Direct AI Agents | Studio Ordo"
description: "4–6 week cohort for senior professionals who need to spec AI work, evaluate output, and take accountability. $3,000–$5,000."
canonical: "/maestro"
```

---

## Additional Content Assets Needed Before Build

- [ ] Proof-of-craft portfolio items (read `business/studio-ordo/maestro/proof-of-craft.md` — these need to be ready before the page ships)
- [ ] Confirm pricing with Keith: $3,000–$5,000 cohort / $1,500–$2,500/month advisory
- [ ] Confirm cohort schedule (first cohort date, number of seats)
- [ ] Decision: separate "Apply" form vs. use `BOOKING_URL` for intake

---

## Component Plan

| Component | Notes |
|-----------|-------|
| `MaestroHero` | New component — headline + two routing tiles + proof strip |
| `MaestroPricing` | Two-tile pricing display (cohort vs. advisory) |
| `MaestroCurriculum` | Phase table + deliverables checklist |
| `MaestroFAQ` | Accordion or inline Q&A |
| `MaestroProof` | Keith bio + stats + the one-evening story |

Or: ship as a single-file page component first (no sub-components), extract only when the page is proven.
