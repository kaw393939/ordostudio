# Team Program Blueprint — 6-Week Enterprise Engagement

## Overview

The Team Program takes the 8 individual workshops and sequences them into a 6-week engagement designed for intact engineering teams (6–20 people). Each week builds on the previous, and the team produces a cumulative portfolio of artifacts that demonstrate measurable capability growth.

**Format:** One session per week (half-day or full-day as indicated)
**Team Size:** 6–20 participants (one intact team or cross-functional cohort)
**Pricing:** See workshop-catalog.md for Team Program bundle pricing
**Delivery:** On-site or remote (on-site recommended for full-day sessions)

---

## Program Structure

### Week 1 — Inquiry & Judgment (Full Day)

**Morning: Ask Better Questions (Disciplined Inquiry)**
- Participants learn the Question Audit technique
- Practice: decompose a real team challenge into sub-questions
- Artifact: Question Audit document for a real project

**Afternoon: AI Accountability (Professional Judgment)**
- Introduce the Decision Journal and Upstream/Downstream Review
- Practice: pair review of an actual AI-assisted code change
- Artifact: Decision Journal entries with documented override reasoning

**Connection:** Day 1 teaches the team that *what* you ask matters (morning) and *what you do with the answer* matters (afternoon). These two skills are the foundation for everything that follows.

**40/60 Split:** Both sessions target 40% human / 60% AI on production tasks by end of day.

---

### Week 2 — Resilience (Full Day)

**Full Day: Design for Failure (Resilience Thinking)**
- Morning: manual failure scenario analysis (no AI tools)
- Afternoon: build circuit breaker and fallback with AI assistance
- Live incident drill: inject a failure, team responds in real-time
- Artifact: Failure Mode Document + Incident Response Runbook

**Connection:** Week 1 taught the team to ask good questions and make accountable decisions. Week 2 teaches them what happens when things go wrong despite good decisions — and how to design systems that survive it.

**40/60 Split:** Morning is 100% human analysis. Afternoon introduces AI at 60%. The contrast is the lesson.

---

### Week 3 — Problem Finding (Half Day)

**Half Day: Find the Right Problem (Problem Finding)**
- Jobs-to-be-Done theory applied to the team's current project
- Fermi estimation practice — sizing problems before solving them
- Problem Selection Matrix: urgency × impact × AI-leverage
- Artifact: Problem Brief with JTBD statement, Fermi estimate, and selection rationale

**Connection:** Weeks 1–2 taught how to ask questions, make decisions, and handle failure. Week 3 asks: "Are we even solving the right problem?" This is where teams often discover they have been building the wrong thing.

**40/60 Split:** Problem finding is a 60% human task. AI assists with research and estimation, not with identifying what matters.

---

### Week 4 — Architecture (Full Day)

**Morning: Data Architecture for AI (Epistemic Humility)**
- Manual data modeling: schema design, normalization, query planning
- Data Assumptions Document: what the team thinks is true about their data
- Build a hybrid retrieval layer (SQL + vector) using AI tools

**Afternoon: Systems-Level Architecture (Systems Thinking)**
- Conway's Law diagnostic: team structure vs. system structure
- Meadows leverage points applied to the team's architecture
- STRIDE threat modeling on a multi-agent system
- Artifact: Architecture Decision Record + Conway's Law Map

**Connection:** After finding the right problem (Week 3), Week 4 designs the system to solve it. Morning ensures the data foundation is honest. Afternoon ensures the system structure matches the team structure.

**40/60 Split:** Data modeling is 70% human (Epistemic Humility demands manual understanding first). System architecture is 40/60.

---

### Week 5 — Ship & Present (Half Day)

**Half Day: Ship & Present (Accountable Leadership)**
- Teams prepare a demo of what they have built during Weeks 1–4
- Demo Day rubric:
  - Technical Quality (25%)
  - Evidence Strength (25%)
  - Limitation Honesty (20%)
  - Presentation Clarity (15%)
  - Q&A Readiness (15%)
- Practice: dry-run presentations with peer feedback
- Artifact: Demo presentation + self-assessment against rubric

**Connection:** This is the accountability checkpoint. The team must present their work to stakeholders (real or simulated) and answer hard questions. The rubric rewards honesty about limitations, not just technical achievement.

**40/60 Split:** Presentation and self-assessment are 100% human. The work being presented reflects the 40/60 split practiced throughout.

---

### Week 6 — Translation & Certification (Full Day)

**Morning: Teach AI to Your Team (Translation)**
- Feynman Technique practice: explain a concept to a non-expert
- Cognitive load theory: why most AI training fails
- Each participant designs a 30-minute training session
- Artifact: Translation Brief + 30-minute curriculum

**Afternoon: Certification & Program Close**
- Each participant delivers their 30-minute training session (dry run)
- Team Readiness Assessment (from human-edge-framework.md):
  - Score each of the 8 Human Edge capabilities (1–4)
  - Compare to Week 1 baseline (administered day one)
  - Calculate improvement and identify remaining gaps
- Program debrief: what worked, what didn't, what's next
- Certificate of completion (individual + team)
- Artifact: Team Readiness Assessment (post-program)

**Connection:** The final day ensures the knowledge transfers beyond the workshop. If participants can teach it, they own it. The assessment provides measurable evidence of growth.

---

## Program Artifacts (Cumulative)

| Week | Artifact | Purpose |
|------|----------|---------|
| 1 | Question Audit + Decision Journal | Foundation skills |
| 2 | Failure Mode Document + Incident Runbook | Resilience design |
| 3 | Problem Brief | Problem selection |
| 4 | Architecture Decision Record + Conway's Law Map | System design |
| 5 | Demo Presentation + Self-Assessment | Accountability |
| 6 | Translation Brief + Team Readiness Assessment | Knowledge transfer + measurement |

---

## Measurement

### Team Readiness Assessment

Administered Week 1 (baseline) and Week 6 (post-program).

| Capability | Score Range |
|-----------|------------|
| Disciplined Inquiry | 1–4 |
| Professional Judgment | 1–4 |
| Resilience Thinking | 1–4 |
| Problem Finding | 1–4 |
| Epistemic Humility | 1–4 |
| Systems Thinking | 1–4 |
| Accountable Leadership | 1–4 |
| Translation | 1–4 |
| **Total** | **8–32** |

- **Below 16:** Team needs additional support. Recommend follow-up engagement.
- **16–23:** Team is developing capability. Recommend quarterly check-ins.
- **24–32:** Team is operating effectively. Recommend advanced workshops.

### ROI Metrics (collected and reported)

- Pre/post Team Readiness Assessment scores
- Artifacts produced (quantity and quality)
- Participant satisfaction (NPS)
- Manager observation: changes in team behavior at 30/60/90 days (follow-up survey)

---

## Facilitator Requirements

- 1 lead facilitator for groups of 6–12
- 1 lead + 1 assistant for groups of 13–20
- All facilitators must have completed the Studio Ordo Facilitator Certification
- On-site engagements require venue with projector, whiteboard, and reliable WiFi

---

## Customization Options

| Option | Description |
|--------|-------------|
| **Industry vertical** | Examples and exercises adapted to the client's industry (finance, healthcare, manufacturing, etc.) |
| **Technology stack** | Exercises use the client's actual tech stack and AI tools |
| **Real project integration** | Weeks 3–5 work on an actual team project instead of simulated scenarios |
| **Extended program** | 8-week version adds dedicated Data Architecture and Systems Architecture weeks |
| **Executive briefing** | Add a 2-hour executive overview session (Week 0 or Week 1 morning) |

---

## Sales Motion

1. **Discovery call** — Understand team composition, current AI adoption, pain points
2. **Team Readiness Assessment** (baseline) — Quantify current state
3. **Program proposal** — Customized 6-week plan with pricing
4. **Delivery** — Weeks 1–6
5. **Follow-up** — 30/60/90 day check-in, renewal conversation
