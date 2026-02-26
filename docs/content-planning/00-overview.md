# Studio Ordo — Content Planning Overview

**Status:** Planning (pre-build) · **Date:** 2026-02-24

This folder maps out every content and routing change before a single line of site code is touched. The goal is to get the story right, then build it.

---

## The Business Model (locked)

Two revenue lines. Everything on the site must serve one of these:

1. **Maestro Training** — Teach senior professionals to direct AI agents. Small cohorts + 1:1 advisory. $3,000–$5,000 cohort / $1,500–$2,500/month ongoing.
2. **Project Commissions** — Studio Ordo takes 20% of all guild work. Journeymen and Maestros do the work. Clients commission through the studio.

Teaching and training is an **investment**, not a revenue center. The Apprentice program builds the talent pool that executes client work and earns commissions.

---

## The Three Audiences

Every person who arrives at the site is one of these three. The site must route them cleanly within one scroll.

| Audience | Who They Are | What They Want | Revenue Path |
|----------|-------------|----------------|--------------|
| **The Buyer** | Director, VP, founder who needs work done | Commission a project, hire a Journeyman | Project commission |
| **The Learner** | Senior professional who wants to direct AI | Maestro training, 1:1 advisory | Maestro Training revenue |
| **The Builder** | Dev/non-traditional professional wanting to level up or affiliate | Join as Apprentice, get a QR card, earn commissions | Commission pipeline seeding |

---

## Information Architecture — Current vs. Target

### Current State (broken)

```
/            ← Mixes all three audiences, broken CTA labels, wrong hero copy
/studio      ← Tries to be both a "join" page and a "hire" page simultaneously
/join        ← Exists (GuildJoinFlow component) — mostly correct but needs tightening
/affiliate   ← Exists but unclear entry path
/services/request ← Appointment scheduler, exits to cal.com
```

### Target State

```
/            ← Routes all three audiences. Single clear action per viewport.
/maestro     ← NEW. The Buyer and Learner revenue page. Book a consult or enroll.
/studio      ← REWRITTEN. Client-facing. Commission a project. Showcase the guild.
/join        ← REFINED. Three-path intake. Routes to /maestro, /studio, or /apprentice.
/card        ← NEW. QR code landing page. One scroll. Two CTAs.
/services/request ← Kept. Client project intake form. (Downstream target from /studio and /maestro)
```

---

## Page Inventory — Work Required

| Page | Route | Action | Priority | Doc |
|------|-------|--------|----------|-----|
| Homepage | `/` | Rewrite: fix hero, fix CTAs, clarify audience routing | HIGH | [01-homepage.md](./01-homepage.md) |
| Studio | `/studio` | Rewrite: client-facing only, remove training overlap | HIGH | [02-studio.md](./02-studio.md) |
| Maestro (NEW) | `/maestro` | Build from scratch: training page + advisory | HIGH | [03-maestro.md](./03-maestro.md) |
| Join | `/join` | Refine: GuildJoinFlow already exists, tighten messaging | MEDIUM | [04-join.md](./04-join.md) |
| Card (NEW) | `/card` | Build: QR landing page for business cards | MEDIUM | [05-qr-landing.md](./05-qr-landing.md) |
| CTA Audit | site-wide | Fix "Hire an Associate" and CTA routing | HIGH | [06-cta-audit.md](./06-cta-audit.md) |

---

## The Core Narrative (one paragraph, site-wide)

> AI is automating execution. The professionals who thrive are the ones who can direct the machine — spec the work, evaluate the output, and take responsibility for the result. Studio Ordo trains that capability. If you need work done now, we commission it through the guild.

Everything on the site is a variation of this paragraph. If a section doesn't come back to this, it gets cut.

---

## Approved Language (from messaging-guide.md — do not deviate)

### Use
- "specs," "tests," "evaluation," "review," "audit," "reliability"
- "method," "workflow," "guardrails"
- "direct AI agents" not "use AI"
- "Context Pack" (always capitalized)
- "AI Audit Log" (always capitalized)
- "40/60 Method" or "40/60 split"

### Do Not Use
- "magic," "revolutionary," "unlimited," "automagical"
- "AGI is here" hype
- "Hire an Associate" (not in the approved CTA system)
- "Liberal Arts Crash Course" (off-brand, damaging)
- "Double Stripping" above the fold without definition (jargon for insiders only)

---

## Proof Points (sourced, approved for site use)

All from `business/studio-ordo/maestro/acceleration-brief.md` and `career-outcomes-data.md`:

- "23 years teaching engineers · 10,000+ students" (use consistently, per messaging-guide)
- AI capability doubles every ~3–4 months (METR, Feb 2026)
- Traditional dev job postings down 51% (Indeed, 2023–2024)
- AI-skill postings up 68% (UMD Smith School, Q4 2022–Q4 2024)
- MIT RCT: 40% faster completion, 18% higher quality with AI assistance
- SWE-bench: 1.96% → 81.42% (2023→2026)
- Jack Clark (Anthropic): "guild-style philosophy of maintaining human excellence" (The Ezra Klein Show, Feb 2026)
- Keith: 200+ AI interactions, built production portfolio site in one evening (Feb 2026)

---

## CTAs — Approved System

| CTA Label | Destination | Who It's For |
|-----------|-------------|-------------|
| Commission a project | `/services/request` | The Buyer |
| Book a discovery call | `/services/request` (or cal.com link) | The Buyer / The Learner |
| Enroll in Maestro Training | `/maestro` | The Learner |
| Join the guild | `/join` | The Builder / Apprentice |
| Get the Context Pack | `/resources/context-pack` | Any |
| Subscribe to the Brief | `/newsletter` | Any |

**Retire immediately:** "Hire an Associate" (inconsistent routing, not in approved system)

---

## Krug Design Laws (pass/fail tests for every page)

From *Don't Make Me Think* (Steve Krug). These are not guidelines.

### 1. The Trunk Test
Drop someone on any page with the header covered and URL stripped. They must answer in 5 seconds:
- What site is this?
- What page am I on?
- What can I do from here?
- Where am I relative to everything else?

If they can't answer all four, the page fails. Run this test before every page ships.

### 2. Don't Make Me Think
Every CTA, headline, and nav label must be instantly understood — no parsing, no re-reading. If someone pauses to figure out what a label means, it fails.

**Question marks add cognitive load.** Every ambiguous term, duplicate CTA label, or unexplained jargon is a question mark. Each one costs trust. Count them on every page. Target: zero.

### 3. Happy Talk Must Die
Any sentence that doesn't add information gets cut. Common offenders:
- "Welcome. Here's how it works."
- "Great! Tell us what you're building."
- "Studio Ordo is a [thing you can see on the page]."
- "Before we get started…"

Rule: if the first sentence of a block can be deleted without losing meaning, delete it.

### 4. Instructions Must Die
If a component needs a paragraph of instructions to use, redesign the component. The join flow is the primary risk — a routing tool that needs explanation has already failed.

### 5. Billboard Design — 3-Second Scan
Headlines must work as standalone sentences at a glance:
- PASS: `Commission work from a vetted AI-capable team.`
- PASS: `You're already a senior professional. Now learn to direct the machine.`
- FAIL: `The Double Stripping is here.` (requires prior knowledge)
- FAIL: `The Bottega Model` (requires cultural context, no verb, no value)

### 6. Omit Needless Words
Cut every paragraph by 50% on first pass. Then cut again. Subordinate clauses, parenthetical explainers, and "this is designed to..." framing go first.

### 7. Minimize Choices
Every additional option on a page doubles time to decide. More than 3 choices on a single screen = redesign the screen. The join flow is the test case: 3 buttons, immediate routing, no sub-branches.

### 8. Put the Right Answer First
Users satisfice — they pick the first reasonable option, not the best one. The audience most likely to convert goes first. On the homepage hero, The Buyer comes before The Builder.

---

## Design Constraints (from design-system.md, swiss-bauhaus-ui-spec.md)

- Strict grid, left alignment, whitespace — no ornamental gradients
- One primary CTA per viewport
- Numbered sections
- Proof always near a decision point
- No vague promises — show artifacts
- Mobile: single column, primary CTA always visible above fold
