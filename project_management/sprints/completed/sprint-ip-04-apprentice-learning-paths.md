# Sprint IP-04 — Apprentice Learning Paths + Studio Content

## Goal
Transform the BSEAI 4-year student journey and proof-of-concept projects into structured apprentice learning paths for the Studio Ordo apprenticeship system.

## Why This Sprint
The LMS has apprentice profiles, field reports, deals, and engagement tracking — but no structured learning paths. The BSEAI project contains a complete progression model (IS 117 → IS 482) with specific projects at each level. This sprint creates the content that turns the apprenticeship from an open-ended arrangement into a guided, leveled system with gates.

## Source Material (from /Users/kwilliams/Projects/bseai)
- `src/content/docs/curriculum/student-journey.md` — Jaylen narrative, semester-by-semester progression
- `src/content/docs/philosophy/why-this-program.md` — 5 PoC projects as level gates
- `keith/code_quality_calc/` — entry-level project
- `keith/is117_lesson_1_webtech/` — first-week onboarding
- `keith/design_prompt_engineer_lesson/` — research/synthesis project
- `keith/agentic_orchestration_toolkit/` — intermediate project
- `keith/hosting_llm_demo/` — advanced DevOps project
- `src/content/docs/program/context-pack.md` — Context Pack progression
- `src/content/docs/syllabi/` — skill accumulation model
- `src/content/docs/careers/skills-map.md` — role readiness mapping

## Deliverables

### 1. `business/studio-ordo/studio/learning-paths.md`
Define 4 apprentice levels with clear gates:

**Level 1: Apprentice (months 1–3)**
- Human Edge focus: Disciplined Inquiry + Professional Judgment
- Gate project: Build a professional portfolio site from scratch (adapted from IS 117 PoC)
- Gate project: Python Calculator with 100% test coverage + CI/CD (from code_quality_calc)
- Required artifacts: Context Pack v1, AI Audit Log (first 30 days), portfolio README
- Spell Book: ~15 foundational terms
- Completion criteria: passes code review, deployed, tests pass, Audit Log reviewed

**Level 2: Journeyman (months 4–8)**
- Human Edge focus: Resilience Thinking + Problem Finding
- Gate project: Design Curator Cards (from design_prompt_engineer_lesson) — the autodidactic loop
- Gate project: Build a feature for an existing system using 12-Factor principles
- Required artifacts: Context Pack v2, Failure Mode Analysis, Assumptions Log
- Spell Book: ~30 terms (cumulative)
- Completion criteria: FMA document, incident drill survival, shipped feature with tests

**Level 3: Senior Journeyman (months 9–14)**
- Human Edge focus: Epistemic Humility + Systems Thinking
- Gate project: Agentic Orchestration Toolkit rebuild (from agentic_orchestration_toolkit)
- Gate project: Full-stack DevOps deployment (from hosting_llm_demo)
- Required artifacts: Context Pack v3, Data Assumptions Document, Systems Decomposition
- Spell Book: ~45 terms (cumulative)
- Completion criteria: working agent system, production deployment, STRIDE threat model

**Level 4: Maestro Candidate (months 15–18+)**
- Human Edge focus: Accountable Leadership + Translation
- Gate project: Ship a client project through the deals pipeline (real client, real delivery)
- Gate project: Lead a community AI training session (EverydayAI format)
- Required artifacts: Context Pack v4, Demo Day presentation, Translation Brief, Field Report
- Spell Book: 60+ terms (full professional vocabulary)
- Completion criteria: client satisfaction, maestro review, community impact report

### 2. `business/studio-ordo/studio/gate-projects/` (8 files)
Detailed specifications for each gate project:
- Project description and learning objectives
- Technical requirements and acceptance criteria
- Rubric (adapted from BSEAI 4-point rubric)
- Context Pack template for the project
- Example of what "Exemplary" looks like
- Estimated time commitment
- Resources and references

### 3. `business/studio-ordo/studio/apprentice-journey.md`
Adapt the "Jaylen" student journey narrative for Studio Ordo:
- "Alex" — a junior developer who joins the studio to level up
- Month-by-month progression from Level 1 → Level 4
- Specific skills gained at each phase
- Field reports written along the way
- The transformation: from "person who writes code" to "person who directs AI systems and takes responsibility"
- Salary progression tied to level: Level 1 (basic rates) → Level 4 (full maestro rates)
- This becomes marketing content for the `/studio` page

### 4. `business/studio-ordo/studio/field-report-prompts.md`
Structured prompts for field reports at each level (the LMS already has field report submission):
- Level 1: "What did I learn?" — Models used, key insight, one mistake, one AI interaction I'm proud of
- Level 2: "What did I discover?" — Problem I investigated, assumptions I tested, what surprised me
- Level 3: "What did I build?" — System I designed, tradeoffs I navigated, data decisions I made
- Level 4: "What did I ship?" — Client outcome, what I'd do differently, how I evaluated success
- Each prompt maps to the newsletter sections: Models / Money / People / From the Field

### 5. `business/studio-ordo/studio/role-readiness-map.md`
Adapt the skills-map.md career data:
- Map each apprentice level to job readiness:
  - Level 2 complete → eligible for: Junior AI Engineer, entry-level positions ($80K–$110K)
  - Level 3 complete → eligible for: AI Product Engineer, LLM App Engineer ($110K–$150K)
  - Level 4 complete → eligible for: Forward-Deployed AI Engineer, Senior roles ($140K–$220K)
- Skills checklist per level tied to real job descriptions
- Portfolio requirements that match what employers look for

### 6. `business/studio-ordo/studio/README.md`
Index of all studio/apprenticeship content.

## Adaptation Rules
- University 4-year timeline → 12–18 month intensive professional path
- Semester → monthly phases
- Course → level/gate
- Student → apprentice
- Professor → maestro
- The progression should feel ambitious but achievable for working professionals
- Gate projects must produce real portfolio artifacts, not exercises

## Acceptance Criteria
- [ ] 4 apprentice levels defined with clear gates
- [ ] 8 gate project specifications written
- [ ] Apprentice journey narrative complete
- [ ] Field report prompts organized by level
- [ ] Role readiness map connects levels to job market
- [ ] Content references Human Edge, Context Pack, and Spell Book from IP-01
- [ ] No university language remains

## Exit Gate
Learning paths are concrete enough to onboard a real apprentice.
