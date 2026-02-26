# Homepage (`/`) — Content Plan

**Status:** Draft · **Last updated:** 2026-02-24
**Source file:** `src/app/(public)/page.tsx`

---

## What's Broken Now

| Issue | Location | Impact |
|-------|----------|--------|
| Hero headline deployed ("Stop writing code") ≠ approved copy | HomeHero component | First impression misaligns |
| Sub-headline "Liberal Arts Crash Course" is off-brand | HomeHero component | Damages credibility with enterprise buyers |
| "Hire an Associate" (×3) points at two different URLs | Sections 02 + 05 + 06 | Breaks trust, signals disorganized operation |
| "The Double Stripping" used as a section headline with no definition | Section 01 | Jargon gates; insider term used in wrong position |
| Section 03 (The Canon) has no section number | Between 02 and 04 | Structural inconsistency |
| Meta description ("Eight capabilities… 23 years, 10,000+ engineers") is serviceable but cold | `<head>` | Not meaningfully different from a brochure |
| Two audiences (enterprise buyer + individual learner) share the same hero with no routing split | Full page | Conversion leaks for both audiences |
| "The 90-Day Transformation" headline below the fold doesn't connect to the hero | Section 04 | Narrative thread breaks |

---

## Approved Hero Copy (from `messaging-guide.md` and `web-homepage-system.md`)

**Hero (locked):**
- Headline: `Bring order to AI in software delivery.`
- Subhead: `Training for the people who direct AI. Work for the teams that need it done.`
- Two routing tiles — commands, not questions:
  - `Commission a project →` → `/studio`
  - `Enroll in Maestro Training →` → `/maestro`
- Proof strip: `23 years teaching engineers · 10,000+ students`

> Tile labels must be verb phrases. "Need work done?" is a question — forces two cognitive steps. The tile IS the action. Lead with the verb.

---

## Target Page Structure

### Hero (viewport 1 — above fold)

```
HEADLINE:  Bring order to AI in software delivery.
SUBHEAD:   Training for the people who direct AI.
           Work for the teams that need it done.

  ┌────────────────────────────┐  ┌────────────────────────────┐
  │  Commission a project  →   │  │  Enroll in Maestro      →  │
  └────────────────────────────┘  └────────────────────────────┘

  23 years teaching engineers · 10,000+ students
```

Tiles are verb phrases only. No question labels ("Need work done?") — questions force two cognitive steps: answer the question, then read the action. The tile IS the action.

"Enroll in Maestro" not "Maestro Training" — noun phrases are not CTAs.

**Component:** Rewrite `HomeHero`.

---

### 01 — The Context (re-labeled from "The Human Edge")

**Section number:** `01 — The Moment`
**Headline:** `AI is automating execution. What remains is direction.`

**Body text (4 sentences, no padding):**

> AI capability doubles every three to four months. Traditional developer postings are down 51%. AI-skill postings are up 68%. The professionals who stay valuable are the ones directing the machine, not writing the boilerplate.

**Cut:** "The Anthropic co-founders are telling the industry to prepare" — narrates the stats instead of letting them land.

**8 capabilities grid** — KEEP. Scannable. Each card is one line.

**"Double Stripping" is jargon. It may not appear as a standalone headline or pull quote.** Rule: if it’s used at all, it stays inside a sentence with an inline definition: *"AI is stripping out syntax work, and commodity training is stripping out judgment — a double stripping."* Or cut it entirely and let the data carry the section.

**CTA:** `See the framework →` → `/insights` — keep

---

### 02 — The Method

**Section number:** `02 — The Method`
**Headline:** `The 40/60 Method`

**Body text — answer the headline’s implied question in the first sentence:**
> 40% manual understanding. 60% AI-directed execution. Every Studio Ordo engagement — training or client work — runs on this ratio.

**Cut entirely:**
- `"A 90-day high-intensity transformation."` — bootcamp marketing, off-brand
- `"The structured approach Studio Ordo uses..."` — happy talk

**Method steps:** KEEP (Spec → Tests → Build → Evaluate → Audit).

**CTA:** CHANGE `"Hire an Associate →"` to `"Commission a project →"` → `/services/request`

---

### 03 — The Canon (RE-NUMBER, add section marker)

**Section number:** `03 — The Canon`
**Content:** Keep the three-column grid (The Canon / The 10% Rule / The Application). Good.
**Issue to fix:** Add `<p className="type-meta text-text-muted">03 — The Canon</p>` to the section — this section currently has no number marker.

---

### 04 — The Program

**Section number:** `04 — The Program`
**Headline:** CHANGE `"The 90-Day Transformation"` → `"The 90-Day Studio Program"`
**Phase grid:** Keep (Foundation / Director / Maestro). Works.
**CTA to add:** `"See program details →"` → `/maestro`

This section currently has no CTA. That's a leak — after reading about the 3-phase program, the reader has no next step visible.

---

### 05 — The Guild

**Section number:** `05 — The Guild`
**Headline:** Keep `"A Teaching Hospital for the AI Era"` — good

**Content change:** The four-tile hierarchy (Novice / Apprentice / Associate / Maestro) is fine conceptually but the labels are confusing — the /studio page and the /maestro page use a different set of labels (Apprentice / Journeyman / Maestro). THESE NEED TO MATCH.

Reconcile labels (see [06-cta-audit.md](./06-cta-audit.md) for full label audit):
- Level 1: **Apprentice** (entry, free)
- Level 2: **Journeyman** (employed, experienced dev)
- Level 3: **Maestro** (senior director of AI agents)

**CTAs — CHANGE BOTH:**
- `"Join the studio →"` → `/join` ← Keep this one, label is approved
- `"Hire an Associate →"` → `/studio` ← CHANGE to `"Commission a project →"` → `/services/request`

---

### 06 — Proof

**No section number currently.** Add `06 — Proof`.

**Keep:** Keith Williams bio tile. Good.
**Keep:** "The data is clear" stats tile. Good.
**Keep:** Jack Clark quote.

**CTA change:** Remove `"Hire an Associate →"` → `/services/request` and move to the Client tile (right tile). Replace with:
- Right tile CTA: `"Commission a project →"` → `/services/request`

---

### Close — Get the Ordo Brief

Keep as-is. Clean close.

---

## Meta Tags (target)

```
title: "Studio Ordo — AI Orchestration Training + Project Guild"
description: "Learn to direct AI agents, or commission expert work. 23 years teaching engineers · 10,000+ students."
canonical: "/"
```

Current: `"Studio Ordo — We Train What AI Can't Automate"` → Acceptable but doesn't reflect the two-line business.

---

## Component File References

| Component | File | Change Required |
|-----------|------|----------------|
| HomeHero | `src/components/experiments/home-hero.tsx` | Rewrite hero content |
| Homepage page | `src/app/(public)/page.tsx` | CTA labels, section numbers, capability section label, level labels |

---

## What NOT to Change

- The 8 capabilities grid — strong content, keep
- The Jack Clark quote — perfect, keep
- The Keith Williams bio — keep
- The stats (METR, Indeed, UMD) — keep, already sourced
- The method steps (Spec/Tests/Build/Evaluate/Audit) — keep
- "Get the Ordo Brief" close — keep
