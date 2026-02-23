# Apprentice Learning Paths

## Overview

The Studio Ordo apprenticeship is a 12–18 month guided progression from working developer to AI-capable engineer. Four levels, eight gate projects, and a growing portfolio of artifacts that demonstrate measurable capability growth.

Each level maps to two Human Edge capabilities. Progression requires completing gate projects that produce real, portfolio-worthy artifacts — not exercises.

---

## Level 1: Apprentice (Months 1–3)

### Human Edge Focus
- **Disciplined Inquiry** — ask better questions before building
- **Professional Judgment** — evaluate AI output and take responsibility for decisions

### Gate Projects
1. **Professional Portfolio Site** — Build a portfolio from scratch using HTML, CSS, and JavaScript. No templates, no frameworks. Type everything manually.
2. **Production Calculator with CI/CD** — Build a calculator application with 100% test coverage, automated linting, type checking, security scanning, and a CI/CD pipeline that enforces all quality gates.

### Required Artifacts
- Context Pack v1 (basic: project brief, success criteria, prior context)
- AI Audit Log (first 30 days — minimum 10 entries documenting AI interactions, accepted/rejected/modified decisions with reasoning)
- Portfolio README with professional framing
- Both projects deployed and publicly accessible

### Spell Book Target
~15 foundational terms: DOM, semantic HTML, version control, Five Whys, issue trees, MVC, REST, CI/CD, test coverage, AI Audit Log, linting, type safety, security scanning, deployment, monitoring

### Completion Criteria
- Both projects pass code review by assigned maestro
- Both projects deployed to production URLs
- All tests pass, CI pipeline green
- AI Audit Log reviewed — demonstrates pattern recognition (not just recording)
- Context Pack v1 reviewed for completeness

### 40/60 Split
Portfolio site: ~90% human (muscle memory phase — type everything, no copy-paste)
Calculator: ~50% human / 50% AI (tooling is curriculum — AI helps with boilerplate, human owns architecture and quality gates)

### Duration
12 weeks. Weekly maestro check-ins. Field report at end of each month.

---

## Level 2: Journeyman (Months 4–8)

### Human Edge Focus
- **Resilience Thinking** — design for failure, respond to incidents
- **Problem Finding** — find the real problem before building the wrong solution

### Gate Projects
3. **Design Curator Cards** — Produce 3 museum-quality content cards using a complete AI workflow: CURATOR_NOTES, AGENTS.md, PROMPT_LOG, CLAIMS.md. The autodidactic research loop: Orient → Map → Vocabulary → Evidence → Synthesize.
4. **Feature Build on Existing System** — Build a significant feature for an existing production codebase. Must include failure mode analysis, incident response runbook, and containerized deployment with monitoring.

### Required Artifacts
- Context Pack v2 (adds architecture patterns, testing frameworks, CI/CD requirements, security posture)
- Failure Mode Analysis document
- Incident Response Runbook
- Assumptions Log (initial beliefs vs. discovered reality)
- CLAIMS.md with source verification for all factual claims

### Spell Book Target
~30 terms (cumulative): adds containers, networking, secrets management, monitoring, incident response, observability, runbook, failure mode analysis, stakeholder analysis, root cause, governance, assumptions log, autodidactic loop, token discipline, Named Expert Critique

### Completion Criteria
- Curator Cards pass rubric: content quality (30%), verification thoroughness (20%), workflow documentation (15%), expert critique (15%), code quality (10%), reflection (10%)
- Feature build passes code review, tests pass, deployed with monitoring
- Survives simulated incident drill (30 minutes to diagnose, fix, write postmortem)
- Failure Mode Analysis identifies at least 3 realistic failure scenarios with mitigations
- Assumptions Log shows at least 2 assumptions that were wrong and how they were corrected

### 40/60 Split
Curator Cards: ~40% human / 60% AI (human is curator/editor/strategist, AI is constrained executor)
Feature Build: ~40% human / 60% AI (human owns architecture and failure analysis, AI assists implementation)

### Duration
20 weeks. Weekly maestro check-ins. Field report at end of each month.

---

## Level 3: Senior Journeyman (Months 9–14)

### Human Edge Focus
- **Epistemic Humility** — understand what data can and cannot represent
- **Systems Thinking** — see how parts interact, where complexity hides

### Gate Projects
5. **Agentic Orchestration Toolkit** — Build a CLI that orchestrates multiple AI providers (OpenAI, Gemini, etc.) using SOLID design principles. Command pattern, dependency injection, interface segregation. Capstone: add an entirely new command from scratch.
6. **Production Deployment Platform** — Deploy a production-grade application using infrastructure-as-code (Terraform), configuration management (Ansible), containerization (Docker Compose), and edge proxy (Traefik) with automated TLS. Defense-in-depth security architecture.

### Required Artifacts
- Context Pack v3 (adds data quality assumptions, failure modes, SLA requirements, security posture, observability coverage)
- Data Assumptions Document (what the data does and does not represent)
- Systems Decomposition (component map with failure modes and cost drivers)
- AGENT_HANDOFF.md (documentation enabling a different AI agent to continue the work)
- STRIDE threat model for the deployment platform
- Operational Runbook with daily/weekly/monthly checklists

### Spell Book Target
~45 terms (cumulative): adds SQL, knowledge graphs, vector embeddings, hybrid retrieval, data assumptions, embedding space, Conway's Law, coupling, cohesion, non-functional requirements, emergent behavior, architecture fitness, Command pattern, dependency injection, interface segregation, infrastructure-as-code, defense-in-depth

### Completion Criteria
- Agentic toolkit: all commands functional, SOLID principles demonstrable in code review, capstone command added independently
- Deployment platform: Terraform provisions with one command, SSH hardened (no root, key-only), only ports 22/80/443 exposed, auto-TLS working, security scans automated, backup/restore verified
- AGENT_HANDOFF.md tested: a different person (or AI) can continue the work using only the handoff document
- STRIDE threat model identifies at least 5 threats with mitigations
- Data Assumptions Document explicitly states what the data cannot represent

### 40/60 Split
Agentic toolkit: ~40% human / 60% AI (human is "CEO managing a workforce of AI experts")
Deployment platform: ~30% human / 70% AI (human writes spec, AI implements from spec, human validates)

### Duration
24 weeks. Weekly maestro check-ins. Field report at end of each month.

---

## Level 4: Maestro Candidate (Months 15–18+)

### Human Edge Focus
- **Accountable Leadership** — ship, present, defend, take responsibility
- **Translation** — make complex technical concepts accessible to anyone

### Gate Projects
7. **Client Project Delivery** — Ship a real project through the Studio Ordo deals pipeline. Real client, real requirements, real deadline. Includes knowledge graph integration, HITL workflows, evaluation harness, and production observability.
8. **Community AI Training Event** — Design and deliver a community AI training session (EverydayAI format). Includes curriculum design, hands-on materials, dry-run delivery, live event execution, and participant feedback collection.

### Required Artifacts
- Context Pack v4 (professional-grade: client requirements, domain knowledge graph, evaluation harness results, all prior Context Packs synthesized)
- Demo Day presentation (presented to industry-grade review panel)
- Translation Brief (bridges technical and non-technical audiences)
- Field Report documenting the full engagement
- Community Training curriculum with hands-on materials
- Impact assessment with participant feedback data

### Spell Book Target
60+ terms (full professional vocabulary): adds knowledge graph, HITL workflows, evaluation harness, regression gates, observability traces, cognitive load theory, audience design, translation brief

### Completion Criteria
- Client project: deployed to production, client satisfied, evaluation harness shows acceptable quality metrics, Demo Day rubric scored (Technical Quality 25%, Evidence Strength 25%, Limitation Honesty 20%, Presentation Clarity 15%, Q&A Readiness 15%)
- Community training: delivered to real audience (minimum 15 participants), participant NPS collected, Translation Brief reviewed by maestro
- Does not bluff during Demo Day Q&A — admits limitations and explains mitigations
- Field Report demonstrates strategic reflection, not just activity logging

### 40/60 Split
Client project: ~25% human / 75% AI (human is strategist, evaluator, and accountable owner)
Community training: ~70% human / 30% AI (teaching is fundamentally human — AI assists preparation, not delivery)

### Duration
12+ weeks. Weekly maestro check-ins. Field report at end of each month.

---

## Progression Summary

| Level | Title | Months | Human Edge | Gate Projects | Spell Book | 40/60 Ratio |
|-------|-------|--------|-----------|---------------|------------|-------------|
| 1 | Apprentice | 1–3 | Inquiry + Judgment | Portfolio + Calculator | ~15 terms | 90→50% human |
| 2 | Journeyman | 4–8 | Resilience + Problem Finding | Curator Cards + Feature Build | ~30 terms | ~40% human |
| 3 | Senior Journeyman | 9–14 | Epistemic Humility + Systems Thinking | Agentic Toolkit + Production Deploy | ~45 terms | 40→30% human |
| 4 | Maestro Candidate | 15–18+ | Accountable Leadership + Translation | Client Delivery + Community Training | 60+ terms | 25–70% human |

---

## Context Pack Evolution

| Level | Context Pack Version | Adds |
|-------|---------------------|------|
| 1 | v1 — Basic | Project brief, success criteria, prior context |
| 2 | v2 — Engineering | Architecture patterns, testing frameworks, CI/CD requirements, code review checklist |
| 3 | v3 — Infrastructure | SLA requirements, failure modes, security posture, observability coverage, data quality assumptions |
| 4 | v4 — Professional | Client requirements, domain knowledge graph, evaluation harness results, synthesized prior context |

---

## Assessment Framework

All gate projects use a 4-point rubric:

| Score | Level | Description |
|-------|-------|-------------|
| 4 | Exemplary | Exceeds professional standard. Portfolio-ready as-is. |
| 3 | Proficient | Meets professional standard. Minor improvements possible. |
| 2 | Developing | Core concepts present but significant gaps. Revise and resubmit. |
| 1 | Beginning | Fundamental misunderstandings. Rework required. |

**Gate requirement:** Score 3 or higher on all rubric criteria to advance to next level.

**Revisions allowed:** Up to 2 revision cycles per gate project. If a project does not pass after 2 revisions, the apprentice and maestro meet to discuss whether to extend the current level or adjust the learning path.
