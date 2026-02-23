# Sprint IP-01 — Frameworks Foundation (Human Edge + Context Pack + Spell Book)

## Goal
Transfer the three signature frameworks from the BSEAI program into Studio Ordo's business folder, adapted for professional/corporate audiences rather than university students.

## Why This Is First
These frameworks are the intellectual foundation everything else builds on. Events, workshops, marketing, and apprentice learning paths all reference them. They must exist as authoritative Studio Ordo documents before any downstream content is created.

## Source Material (from /Users/kwilliams/Projects/bseai)
- `src/content/docs/curriculum/outcomes.md` — Human Edge definitions, instructional design basis
- `src/content/docs/curriculum/overview.md` — CEO of agents thesis, Spell Book mechanism
- `src/content/docs/program/context-pack.md` — Context Pack 4-component model, rubric
- `src/content/docs/program/forty-sixty-policy.md` — 40/60 framework
- `src/content/docs/syllabi/is117.md–is482.md` — Spell Book terms v1–v8
- `src/content/docs/philosophy/stripping-thesis.md` — what AI strips away, what remains

## Deliverables

### 1. `business/studio-ordo/ip/human-edge-framework.md`
Adapt the 8 Human Edge capabilities for a professional audience:
- Reframe from "student outcomes" → "professional competencies AI cannot replace"
- Each capability gets: definition, why AI can't do it, how it shows up in engineering work, how Studio Ordo develops it
- Map capabilities to the existing offer catalog (Workshop → which capabilities, Team Program → which capabilities, Advisory → which capabilities)
- Include the assessment rubric (Exemplary/Proficient/Developing/Beginning) adapted as a "team readiness assessment" tool
- Drop all university/ABET language; keep the intellectual substance

### 2. `business/studio-ordo/ip/context-pack-method.md`
Adapt the Context Pack as a professional methodology product:
- 4 components: Project Brief, Domain Context, Evaluation Criteria, Prior Context
- Frame as "the operating method for directing AI agents" — this is the deliverable clients learn
- Include progressions: Beginner (simple project brief) → Intermediate (full 4-part) → Advanced (multi-agent orchestration)
- Template for each component that could be used in workshops or as lead magnet
- Position as the signature Studio Ordo tool: "Give me the problem. I'll construct the context, direct the agents, evaluate the output, and take responsibility."

### 3. `business/studio-ordo/ip/spell-book-professional.md`
Curate the most commercially relevant Spell Book terms for professionals:
- Select ~40 of the 60+ university terms that matter most for working engineers and leaders
- Organize by theme: Architecture (12-Factor, Conway's Law, SOLID), Reliability (error budgets, blameless postmortems, nines), Data (ACID, CAP theorem, vector embeddings), AI Systems (RAG, HITL, prompt injection, eval harness), Business (ROI, TCO, Jobs to Be Done, Fermi estimation)
- Each term: 1-sentence definition + why it matters + when to use it in conversation
- Frame as "professional vocabulary that signals competence" — the token economics argument
- This becomes a downloadable PDF / lead magnet / workshop handout

### 4. `business/studio-ordo/ip/forty-sixty-method.md`
Adapt the 40/60 policy as a team adoption framework:
- Reframe: "How much should your team hand-code vs. delegate to AI?"
- The 40% hard-way builds judgment substrate; the 60% agentic builds velocity
- Practical example: a 2-hour team session (45 min hard-way → 75 min agentic → 15 min debrief)
- Decision framework for adjusting the ratio by team maturity
- Position as the diagnostic tool used in Advisory engagements

### 5. `business/studio-ordo/ip/ai-audit-log-practice.md`
Adapt the AI Audit Log as a team accountability practice:
- What it is: document every AI interaction — what you asked, what it produced, what you accepted/rejected and why
- Why it matters: accountability, quality control, compliance, institutional learning
- Template: Date / Task / AI Tool / Prompt / Output Summary / Decision / Rationale
- Team adoption guide: how to introduce gradually, when to require, how to review
- Connection to evaluation gates and the Ordo method

### 6. `business/studio-ordo/ip/README.md`
Index document explaining the IP collection and how each framework connects to Studio Ordo's offerings.

## Adaptation Rules
- Remove all NJIT/university-specific language, ABET references, course numbers
- Reframe "student" → "practitioner" or "engineer"
- Reframe "course" → "workshop", "engagement", or "track"
- Reframe "semester" → "phase" or "module"
- Keep intellectual rigor, historical figures, and named concepts
- Maintain the anti-hype voice from the brand guide
- All content is original Keith Williams IP — not copying from any third party

## Acceptance Criteria
- [ ] 6 documents created in `business/studio-ordo/ip/`
- [ ] Each framework is self-contained and usable without university context
- [ ] Frameworks reference each other where natural (e.g., Context Pack uses Spell Book vocabulary)
- [ ] Offer catalog cross-references added (which framework applies to which offer)
- [ ] No NJIT/ABET/course-number language remains
- [ ] Documents match Studio Ordo voice-tone guide (precise, calm, anti-hype)

## Exit Gate
All 6 documents reviewed for voice consistency and completeness.
