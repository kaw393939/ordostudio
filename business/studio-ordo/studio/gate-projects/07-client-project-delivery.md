# Gate Project 7 — Client Project Delivery

## Level
4: Maestro Candidate (Months 15–17)

## Human Edge
Accountable Leadership

## Overview
Ship a real project through the Studio Ordo deals pipeline. Real client, real requirements, real deadline. This is not a simulation — the apprentice is responsible for delivery, quality, and client satisfaction. The project must include knowledge graph integration, human-in-the-loop workflows, an evaluation harness, and production observability. Demo Day presentation to an industry-grade review panel.

## Learning Objectives
- Manage a real client engagement from requirements to delivery
- Build a production AI system with knowledge graph, HITL workflows, and evaluation
- Handle a production incident (data source format change, model degradation, etc.)
- Present and defend technical decisions to a review panel
- Admit limitations honestly and explain mitigations (do not bluff)
- Write evaluation criteria that catch bad output before users do
- Synthesize all prior Context Packs into a professional-grade v4

## Technical Requirements

### System Architecture
- **Knowledge Graph:** Build or extend a knowledge graph that reveals connections flat data hides
- **HITL Workflows:** Human-in-the-loop escalation paths for uncertain or high-stakes decisions
  - Configurable confidence thresholds
  - Escalation routing (who reviews what)
  - Decision audit trail
- **Evaluation Harness:** Automated quality evaluation for AI outputs
  - Retrieval metrics: Recall@k, MRR, context hit rate
  - Generation metrics: groundedness, attribution accuracy, refusal quality
  - System metrics: p50/p95 latency, cost per query, timeout rate
- **Production Observability:** Tracing every decision through the system
  - Request tracing (end-to-end)
  - Decision logging (what the model suggested, what was served)
  - Error tracking and alerting
  - Cost tracking per query/interaction

### Client Engagement
- Requirements gathered through structured stakeholder interviews
- Scope documented in Context Pack v4
- Regular check-ins with client (weekly minimum)
- Delivered on agreed timeline
- Client satisfaction measured (NPS or structured feedback)

### Demo Day Presentation
Presented to a review panel (maestros, clients, industry guests). Scored on:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Technical Quality | 25% | Does the system work? Is it well-built? |
| Evidence Strength | 25% | Are claims backed by data from the evaluation harness? |
| Limitation Honesty | 20% | Does the presenter acknowledge what doesn't work and why? |
| Presentation Clarity | 15% | Can a non-technical stakeholder follow the narrative? |
| Q&A Readiness | 15% | Can the presenter handle hard questions without bluffing? |

**Pass requirement:** Score 3+ on all criteria.
**Critical rule:** Bluffing during Q&A is an automatic score reduction. "I don't know, but here's how I'd find out" is a valid and respected answer.

## Deliverables
1. Working production system (deployed, serving real users or test users)
2. Knowledge graph with documented design decisions
3. HITL workflow configuration with escalation paths
4. Evaluation harness with documented metrics and thresholds
5. Production observability (request tracing, decision logging, cost tracking)
6. Demo Day presentation (slides or live demo + Q&A)
7. Context Pack v4 (professional-grade: client requirements, domain knowledge graph, evaluation results, synthesized prior context)
8. Client feedback (NPS or structured feedback form)
9. Field Report documenting the full engagement

## Rubric

| Criterion | Weight | Exemplary (4) | Proficient (3) | Developing (2) | Beginning (1) |
|-----------|--------|---------------|-----------------|-----------------|----------------|
| System Quality | 25% | KG, HITL, evaluation, observability all working, production-ready | Core components working, minor gaps in observability or evaluation | Some components working, significant gaps | System incomplete or non-functional |
| Client Engagement | 25% | Client satisfied, requirements met or exceeded, professional communication throughout | Client satisfied, requirements met, communication adequate | Client relationship strained, scope issues | Client unsatisfied or project not delivered |
| Demo Day | 25% | Presentation clear, evidence-based, limitations honest, Q&A handled with confidence and humility | Presentation good, evidence present, Q&A adequate | Presentation adequate, thin evidence, Q&A reveals gaps | Presentation poor or unable to defend decisions |
| Artifacts | 15% | Context Pack v4 is a model for professional documentation, Field Report is strategically reflective | Context Pack complete, Field Report present | Context Pack adequate, Field Report thin | Missing critical artifacts |
| Metrics | 10% | Evaluation harness shows system meets defined quality thresholds, cost tracked | Metrics collected, some thresholds defined | Metrics partially collected | No evaluation metrics |

## What "Exemplary" Looks Like
A project that the client would refer to other clients. A Demo Day presentation where the review panel learns something new. A Context Pack v4 that could be handed to a different team and they could continue the work. An evaluation harness that catches problems before users do. A Field Report that reflects strategically on what worked, what didn't, and what the apprentice would do differently — not a chronological activity log.

## Estimated Time
120–160 hours over 10–12 weeks

## Resources
- Studio Ordo Spell Book: knowledge graph, HITL workflows, evaluation harness, regression gates, observability traces
- Context Pack v4 template
- Studio Ordo deals pipeline (for client assignment)
- RAG evaluation metrics guide
- Demo Day rubric (above)
