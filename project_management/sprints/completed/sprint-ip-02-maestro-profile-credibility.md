# Sprint IP-02 — Maestro Profile + Credibility Engine

## Goal
Transfer Keith Williams' professional profile, proof points, and credibility assets from the BSEAI project into Studio Ordo's business folder as the foundation for the "first maestro" positioning.

## Why This Sprint
Studio Ordo's brand guide says proof points are "20+ years teaching engineers · 10,000+ students" but the actual evidence is thin. The BSEAI project contains a massive credibility archive — 23-year career narrative, 5 proof-of-concept projects, student outcomes, international experience, startup exit, and the "vibe coding" case study. This sprint packages all of that into commercially usable assets.

## Source Material (from /Users/kwilliams/Projects/bseai)
- `keith/me.txt` — full bio, EverydayAI Newark, "Second Renaissance" essay, Swiss Design case study
- `src/content/docs/philosophy/why-this-program.md` — 5 PoC projects, progression table, career timeline
- `src/content/docs/philosophy/acceleration-thesis.md` — the "something big" framing
- `incoming_info/something_big.md` — Matt Shumer's urgency essay (reference for positioning, not to copy)
- `src/content/docs/evidence/industry-voices.md` — CEO quotes, METR data
- `src/content/docs/stakeholders/for-industry.md` — graduate capabilities comparison table

## Deliverables

### 1. `business/studio-ordo/maestro/keith-williams-profile.md`
The authoritative maestro profile for the platform:
- 23 years at NJIT, 10,000+ students, 8 courses created
- Career arc: TRS-80 → AmeriCorps → CTO (acquired by Anthem Ventures) → Zambia e-government → NJIT Senior Lecturer → BS in Enterprise AI founder → Studio Ordo
- Students at Amazon, Google, JPMorgan, Goldman Sachs
- 1,837+ professional connections
- The "Director of the Center for Enterprise AI" credential
- Written in third-person for use on the website, proposals, and marketing materials
- Two versions: short (3 paragraphs for bios) and full (complete narrative)

### 2. `business/studio-ordo/maestro/proof-of-craft.md`
The 5 proof-of-concept projects repackaged as portfolio evidence:
- IS 117 Lesson 1 → "How I teach beginners: emotional scaffolding + muscle memory"
- Python Calculator → "What production-quality looks like: 100% test coverage, CI/CD, quality gates"
- Design Curator Cards → "The autodidactic loop: how I teach people to teach themselves"
- Agentic Orchestration Toolkit → "AI orchestration from scratch: SOLID principles for agent systems"
- Hosting Platform → "Full-stack DevOps: Terraform to Traefik to Let's Encrypt"
- The 10-hour Swiss design build → "What I can ship in a day with AI: $0 cost, Lighthouse 100/100"
- Each project: what it demonstrates, what a client should take from it, link to source

### 3. `business/studio-ordo/maestro/acceleration-brief.md`
Adapt the acceleration thesis and METR data as a sales/content asset:
- Broadway 1900→1913 analogy (horses to cars in 13 years, no physical infrastructure barrier)
- METR capability doubling: 7 months → 4.3 months → 2.9 months
- Key benchmarks: SWE-bench 1.96%→81.42%, bar exam, MATH 100%
- CEO voices: Amodei (50% entry-level at risk), Altman (displacement is palpable), Huang ($600B+ capex)
- The productivity imperative: MIT RCT +40% faster, +18% quality, largest gains for lowest-baseline workers
- Traditional programmer postings -51%, AI postings +68%
- NYC #1 AI market: 5,201 openings, +87% YoY
- Frame as: "The case for investing in AI training now" — useful for proposals, newsletter, and sales conversations
- Include source citations with tier ratings

### 4. `business/studio-ordo/maestro/career-outcomes-data.md`
Package the salary and career data for use in marketing:
- Entry-level salary ranges by role ($110K–$150K)
- Mid-level ranges ($150K–$220K)
- Senior ranges ($180K–$350K+)
- BLS medians with growth projections
- AI salary premium (+15–50% over traditional)
- The 5 target roles: AI Product Engineer, Forward-Deployed AI Engineer, AI Deployment Engineer, LLM Application Engineer, AI Software Engineer
- Skills-to-role mapping table
- "Only 48% of AI projects reach production" — deployment skills are the bottleneck
- Capital deployment: $600B+ hyperscaler capex 2026

### 5. `business/studio-ordo/maestro/differentiator-matrix.md`
The competitive comparison adapted for Studio Ordo:
- Studio Ordo graduate vs. generic AI training graduate (comparison table)
- What other training programs teach vs. what Studio Ordo teaches
- The "nobody produces the middle" positioning
- Why Studio Ordo (specs/tests/evals/audit) vs. prompt engineering courses vs. tool tutorials vs. bootcamps
- The apprenticeship model as differentiator (shipped artifacts, not certificates)

### 6. `business/studio-ordo/maestro/README.md`
Index explaining how these maestro assets are used across the platform.

## Adaptation Rules
- Keith's university title is context; Studio Ordo is the independent brand
- University affiliation mentioned as credibility, not as the business
- All salary data sourced and cited (BLS, LinkedIn, etc.)
- Anti-hype voice — data over adjectives
- The "something big" urgency is real but frame it through data, not panic

## Acceptance Criteria
- [ ] 6 documents created in `business/studio-ordo/maestro/`
- [ ] Keith's profile is ready to use on website, in proposals, and in marketing
- [ ] Acceleration brief has all key statistics with source citations
- [ ] Career data is organized for easy insertion into marketing pages
- [ ] No unattributed claims — every number has a source
- [ ] Voice matches Studio Ordo brand guide

## Exit Gate
All documents reviewed for accuracy and voice consistency.
