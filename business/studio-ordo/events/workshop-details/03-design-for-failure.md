# Workshop 3: Design for Failure

## Overview

| Field | Value |
|-------|-------|
| **Duration** | Full-day (6 hours) |
| **Audience** | Engineering teams, SREs, DevOps engineers |
| **Human Edge** | Resilience Thinking |
| **Prerequisites** | Familiarity with deployment pipelines and production systems |
| **Max participants** | 16 |
| **Offer tier** | Offer 2 (developer accelerator) |

## Learning Objectives

By the end of this workshop, participants will be able to:
1. Conduct a Failure Mode Analysis for a production system
2. Calculate and manage error budgets
3. Structure and run a blameless postmortem
4. Build an incident response playbook with runbook entries
5. Apply the Twelve-Factor App methodology as a resilience checklist

## Agenda

### Morning — Building the Substrate (40%)

| Time | Block | Format | Description |
|------|-------|--------|-------------|
| 0:00–0:20 | The Cost of Surprise | Presentation | Real incident case studies. Why failure planning beats failure response. The Human Edge: Resilience Thinking. |
| 0:20–1:00 | Twelve-Factor Audit | Hands-on | Participants audit a provided application against all 12 factors. Manual checklist — no AI. Identify violations and their risk. |
| 1:00–1:30 | Failure Mode Analysis | Presentation + exercise | How to systematically identify what can break. Participants map failure modes for their own systems. |
| 1:30–1:45 | Break | — | — |
| 1:45–2:30 | Error Budgets + SLAs | Exercise | Calculate error budgets from SLA targets. Discuss: when is your budget spent? What happens then? |
| 2:30–3:00 | Lunch | — | — |

### Afternoon — Practicing the Real Workflow (60%)

| Time | Block | Format | Description |
|------|-------|--------|-------------|
| 3:00–3:45 | Incident Drill | Live exercise | The maestro introduces a controlled failure into a demonstration system. Teams detect, diagnose, coordinate, and recover. Clock is running. |
| 3:45–4:15 | Blameless Postmortem | Structured facilitation | Teams write a blameless postmortem for the incident they just experienced. Focus: systemic causes, not individual blame. |
| 4:15–4:30 | Break | — | — |
| 4:30–5:15 | Runbook Construction (AI-directed) | Hands-on | Using AI tools, participants build a runbook for their most critical failure scenario. Context Pack + AI Audit Log applied. |
| 5:15–5:45 | Incident Response Playbook | Group | Teams assemble their Failure Mode Analysis, error budget, runbook, and postmortem into a cohesive playbook. |
| 5:45–6:00 | Wrap-up | Presentation | Spell Book review. How to run incident drills on your own team. |

## Materials

- Twelve-Factor App audit checklist
- Failure Mode Analysis template
- Error budget calculator (spreadsheet)
- Blameless postmortem template
- Runbook template
- Incident severity classification guide
- Spell Book handout: Twelve-Factor App, SOLID, infrastructure as code, error budget, blameless postmortem, circuit breaker, MTTR, runbook, observability, SLA/SLO/SLI, incident severity
- Pre-configured demonstration system for incident drill

## Artifact Produced

- Twelve-Factor audit of participant's system
- Failure Mode Analysis document
- Error budget calculation
- Blameless postmortem (from drill)
- Runbook for one critical failure scenario
- Assembled incident response playbook

## FAQ

**"We don't have production incidents."**
Every system has failure modes. This workshop helps you find them before your users do.

**"Do we need to bring our own system?"**
We provide a demonstration system for the incident drill. The Failure Mode Analysis is most valuable when applied to your own system — bring architecture diagrams if possible.
