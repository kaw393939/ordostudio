# Workshop 6: Systems-Level AI Architecture

## Overview

| Field | Value |
|-------|-------|
| **Duration** | Full-day (6 hours) |
| **Audience** | Senior engineers, architects, engineering managers |
| **Human Edge** | Systems Thinking |
| **Prerequisites** | 3+ years engineering experience, familiarity with distributed systems |
| **Max participants** | 16 |
| **Offer tier** | Offer 2 (developer accelerator) |

## Learning Objectives

By the end of this workshop, participants will be able to:
1. Decompose a complex system into components with explicit dependency mapping
2. Apply Conway's Law to diagnose organizational-architectural misalignment
3. Identify leverage points (Meadows) in a system for maximum impact
4. Conduct a STRIDE threat model for AI system components
5. Build an architecture fitness assessment with non-functional requirements
6. Construct a multi-agent Context Pack for coordinated AI work

## Agenda

### Morning — Building the Substrate (40%)

| Time | Block | Format | Description |
|------|-------|--------|-------------|
| 0:00–0:20 | The Whole > The Parts | Presentation | Emergent behavior in complex systems. Why component-level thinking fails. Donella Meadows and feedback loops. |
| 0:20–1:00 | System Decomposition | Hands-on | Participants decompose a provided multi-component AI system into components, map dependencies, and identify emergent behaviors. Hand-drawn diagrams — no AI. |
| 1:00–1:30 | Conway's Law Exercise | Discussion | Map your current team structure alongside your system architecture. Where do they align? Where do they conflict? |
| 1:30–1:45 | Break | — | — |
| 1:45–2:15 | Leverage Points | Exercise | Identify the top 3 leverage points in the decomposed system. Where would small changes produce large effects? Apply Meadows's hierarchy. |
| 2:15–2:30 | STRIDE Introduction | Presentation | The 6 threat categories applied to AI systems: Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation. |
| 2:30–3:00 | Lunch | — | — |

### Afternoon — Practicing the Real Workflow (60%)

| Time | Block | Format | Description |
|------|-------|--------|-------------|
| 3:00–3:45 | STRIDE Threat Model | AI-directed | Using AI tools with Context Pack methodology, conduct a STRIDE analysis on a real system. AI assists with threat enumeration; human judges severity and mitigation priority. |
| 3:45–4:30 | Architecture Fitness Assessment | Exercise | Define non-functional requirements (performance, reliability, security, cost, failure modes). Build acceptance criteria. Map to system components. |
| 4:30–4:45 | Break | — | — |
| 4:45–5:15 | Multi-Agent Context Pack | Advanced exercise | Construct a Context Pack for coordinated multi-agent work: architecture agent, implementation agent, documentation agent, human orchestration plan. |
| 5:15–5:45 | Architecture Reviews | Group | Teams present their decomposition, threat model, and fitness assessment. Peer review focused on: what emergent behaviors did you miss? |
| 5:45–6:00 | Wrap-up | Presentation | Spell Book review. Zero Trust as ongoing practice. Iron triangle realism. |

## Materials

- System decomposition template
- Conway's Law alignment worksheet
- Meadows's leverage points hierarchy reference
- STRIDE threat model template
- Architecture fitness assessment template
- Multi-agent Context Pack template
- Spell Book handout: Conway's Law, leverage points, Liskov Substitution, code smells, refactoring, STRIDE, Zero Trust, iron triangle, emergent behavior, defense in depth, system dynamics

## Artifact Produced

- System decomposition document with dependency map
- Conway's Law alignment assessment
- Leverage points analysis
- STRIDE threat model
- Architecture fitness assessment with non-functional requirements
- Multi-agent Context Pack for one real project

## FAQ

**"Is this relevant if we don't have AI in production yet?"**
Systems thinking applies to every architecture. The STRIDE and fitness assessment exercises are valuable regardless of AI involvement. The multi-agent Context Pack prepares you for when AI components arrive.

**"Do I need to be an architect to attend?"**
3+ years of engineering experience is sufficient. The workshop builds architecture thinking — it does not assume it.
