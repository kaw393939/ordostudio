# Sprint IP-03 — Event & Workshop Catalog (Teaching IP → Bookable Events)

## Goal
Transform the 8 BSEAI course structures, historical figure profiles, and teaching exercises into a catalog of bookable Studio Ordo events and workshops for professionals.

## Why This Sprint
The LMS has a full events system (create, register, deliver, track) but the content catalog is thin. The BSEAI syllabi contain 8 semesters of structured teaching content — exercises, historical narratives, signature assessments, and frameworks — that can be compressed into half-day and full-day professional workshops. This sprint creates the content blueprints; a later system sprint will seed them as actual events in the database.

## Source Material (from /Users/kwilliams/Projects/bseai)
- `src/content/docs/syllabi/is117.md–is482.md` — 8 complete syllabi with schedules, exercises, assessments
- `src/content/docs/curriculum/core-studio-spine.md` — accumulation model
- `src/content/docs/center/community.md` — community training event format
- `src/content/docs/program/forty-sixty-policy.md` — lab session structure
- `src/content/docs/curriculum/implementation-plan.md` — Demo Day format + rubrics
- `keith/design_prompt_engineer_lesson/` — Design Curator Cards exercise
- `keith/agentic_orchestration_toolkit/` — orchestration exercise
- `keith/code_quality_calc/` — code quality exercise
- Framework documents from IP-01 (Human Edge, Context Pack, Spell Book, 40/60, AI Audit Log)

## Deliverables

### 1. `business/studio-ordo/events/workshop-catalog.md`
Master catalog of 8 workshops, each derived from a BSEAI studio course:

**Workshop 1: "Ask Better Questions" (from IS 117 — Disciplined Inquiry)**
- Duration: Half-day (3 hours)
- Audience: Engineers, team leads, product managers
- What they learn: Issue trees, hypothesis-first thinking, Five Whys, Warren Berger's beautiful questions
- Exercise: Apply structured inquiry to a real team problem — produce a question hierarchy
- Spell Book terms introduced: First principles, separation of concerns, CRC critique
- Deliverable: Written inquiry framework for one real problem
- Human Edge: Disciplined Inquiry

**Workshop 2: "AI Accountability in Practice" (from IS 118 — Professional Judgment)**
- Duration: Half-day (3 hours)
- Audience: Teams adopting AI-assisted coding
- What they learn: AI Audit Log discipline, when to accept/reject AI output, technical debt awareness
- Exercise: Pair exercise — complete a task with AI, document every decision in the Audit Log format
- Spell Book terms: Technical debt, broken windows, DRY, YAGNI, KISS, MVP
- Deliverable: Completed AI Audit Log + team adoption plan
- Human Edge: Professional Judgment

**Workshop 3: "Design for Failure" (from IS 218 — Resilience Thinking)**
- Duration: Full-day (6 hours)
- Audience: Engineering teams, SREs, DevOps
- What they learn: 12-Factor App, incident drills, Failure Mode Analysis, error budgets, blameless postmortems
- Exercise: Live incident drill — instructor breaks a system, team diagnoses and recovers
- Spell Book terms: Twelve-Factor, SOLID, infrastructure as code, error budget, blameless postmortem
- Deliverable: Failure Mode Analysis document + incident response playbook
- Human Edge: Resilience Thinking

**Workshop 4: "Find the Right Problem" (from IS 265 — Problem Finding)**
- Duration: Half-day (3 hours)
- Audience: Product managers, engineering managers, consultants
- What they learn: Jobs to Be Done, 5 Whys root cause, Assumptions Log, Fermi estimation, ROI analysis
- Exercise: Apply JTBD + 5 Whys to a real business problem, estimate with Fermi
- Spell Book terms: 5 Whys, JTBD, essential vs. accidental complexity, business model canvas, Fermi estimation
- Deliverable: Problem analysis package (assumptions log + ROI estimate)
- Human Edge: Problem Finding

**Workshop 5: "Data Architecture for AI" (from IS 331 — Epistemic Humility)**
- Duration: Full-day (6 hours)
- Audience: Data engineers, backend engineers, AI engineers
- What they learn: SQL fluency, graph databases, vector embeddings, hybrid retrieval (SQL + graph + vector), CAP theorem
- Exercise: Build a hybrid knowledge system prototype (PostgreSQL + graph + vector)
- Spell Book terms: relational model, ACID, normalization, CAP theorem, knowledge graph, vector embeddings, cosine similarity, hybrid retrieval
- Deliverable: Data Assumptions Document + working hybrid retrieval prototype
- Human Edge: Epistemic Humility

**Workshop 6: "Systems-Level AI Architecture" (from IS 390 — Systems Thinking)**
- Duration: Full-day (6 hours)
- Audience: Senior engineers, architects, engineering managers
- What they learn: Conway's Law, leverage points, STRIDE threat modeling, system decomposition, Zero Trust
- Exercise: Decompose a real system into components, identify leverage points, run STRIDE analysis
- Spell Book terms: Conway's Law, leverage points, Liskov Substitution, code smells, STRIDE, Zero Trust, iron triangle
- Deliverable: Systems decomposition document + threat model
- Human Edge: Systems Thinking

**Workshop 7: "Ship & Present" (from IS 425 — Accountable Leadership / Demo Day)**
- Duration: Half-day (3 hours)
- Audience: Teams preparing for stakeholder reviews, demo days, project handoffs
- What they learn: Structured demo format, evidence-based presentation, evaluating AI systems for production, blameless postmortem analysis
- Exercise: Each team prepares and delivers a 10-minute structured demo, receives rubric-based feedback
- Spell Book terms: Stochastic Parrots, HITL, eval harness, prompt injection, blameless postmortem, error budget
- Deliverable: Demo Day rubric-scored presentation + improvement plan
- Human Edge: Accountable Leadership

**Workshop 8: "Teach AI to Your Team" (from IS 482 — Translation / Train-the-Trainer)**
- Duration: Full-day (6 hours)
- Audience: Internal AI champions, L&D leaders, team leads responsible for AI adoption
- What they learn: Feynman technique, cognitive load theory, curriculum design, how to evaluate AI literacy, pre/post assessment
- Exercise: Design and dry-run a 30-minute AI training session for their team
- Spell Book terms: Feynman technique, cognitive load, curse of knowledge, scaffolding, ZPD, formative assessment
- Deliverable: Training curriculum + Translation Brief + pre/post assessment plan
- Human Edge: Translation

### 2. `business/studio-ordo/events/workshop-details/` (8 files)
One detailed file per workshop with:
- Full description and learning objectives (Bloom's-aligned)
- Detailed agenda with time blocks
- Materials list (templates, handouts)
- Prerequisites
- What participants produce (artifacts)
- FAQ / objections handling
- Pricing tier mapping (which existing offer it falls under)
- Context Pack template for the session
- Spell Book terms handout content

### 3. `business/studio-ordo/events/historical-figures-content.md`
Content asset: the ~50 historical figure profiles from all 8 Spell Book versions, adapted as:
- "The people who built what you use every day" — short profiles for newsletter, social, or workshop intros
- Organized by theme: Web Pioneers, Software Craftsmen, Data Visionaries, AI Pioneers, Systems Thinkers, Educators
- Each profile: name, contribution, why it matters today, one memorable story/quote
- Usable as: workshop ice-breakers, newsletter content, social media posts, website "inspiration" section

### 4. `business/studio-ordo/events/team-program-blueprint.md`
Map the 8 workshops into the existing 4–6 week Team Program format:
- Week 1: "Ask Better Questions" (Inquiry) + "AI Accountability" (Judgment)
- Week 2: "Design for Failure" (Resilience)
- Week 3: "Find the Right Problem" (Problem Finding)
- Week 4: "Systems-Level AI Architecture" (Systems Thinking)
- Week 5: "Ship & Present" (Accountable Leadership)
- Week 6 (optional): "Teach AI to Your Team" (Translation)
- Each week: pre-work, session, deliverable, Human Edge capability
- Maps to Context Pack progression (simple → advanced over 6 weeks)

### 5. `business/studio-ordo/events/community-event-format.md`
Adapt the IS 482 community training format for EverydayAI Newark / Studio Ordo community events:
- Target: small business owners, nonprofit staff, teachers, municipal employees
- 3-hour format: What AI Is/Isn't → Hands-on Exercises → Privacy/Security → Q&A
- Materials: provided, open-licensed
- Follow-up: resource list, community of practice invitation
- Connection to paid offerings (corporate training packages)

### 6. `business/studio-ordo/events/README.md`
Index of all event content with cross-references to frameworks (IP-01) and maestro assets (IP-02).

## Adaptation Rules
- University week-by-week schedules compressed to workshop-length sessions
- "Student" → "participant" or "practitioner"
- Assessment → "deliverable" or "artifact participants take home"
- Demo Day → "Ship & Present" (reusable branded format)
- Maintain 40/60 structure where applicable (hands-on time vs. directed time)
- Each workshop must produce a tangible takeaway artifact

## Acceptance Criteria
- [ ] Master workshop catalog with 8 workshops documented
- [ ] 8 detailed workshop files in `workshop-details/`
- [ ] Historical figures content organized by theme
- [ ] Team Program blueprint maps workshops to multi-week engagement
- [ ] Community event format documented
- [ ] All workshops reference Human Edge capabilities and Spell Book terms
- [ ] No university/course-number language remains
- [ ] Each workshop has a clear artifact/deliverable

## Exit Gate
Workshop catalog is complete enough to be used for event creation in the LMS.
