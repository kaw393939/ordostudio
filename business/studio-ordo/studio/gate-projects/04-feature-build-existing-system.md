# Gate Project 4 — Feature Build on Existing System

## Level
2: Journeyman (Months 6–8)

## Human Edge
Resilience Thinking + Problem Finding

## Overview
Build a significant feature for an existing production codebase. This is not a greenfield project — you inherit complexity, constraints, and someone else's architectural decisions. The feature must include failure mode analysis, an incident response runbook, and containerized deployment with monitoring. The human judgment is in the architecture, the failure analysis, and the incident response — not the keystrokes.

## Learning Objectives
- Navigate and contribute to an existing codebase you did not write
- Analyze failure modes before building (shift-left resilience)
- Write an Incident Response Runbook that is useful under pressure
- Containerize a service with Docker and deploy with monitoring
- Conduct a stakeholder interview to find the real problem (not just the stated one)
- Build an Assumptions Log that tracks beliefs vs. reality

## Technical Requirements
- **Feature Scope:** A non-trivial feature on an existing system (assigned by maestro or from Studio client work). Examples: add search to an existing app, build a reporting dashboard, add authentication, integrate a third-party API.
- **Failure Mode Analysis:** Document at least 3 realistic failure scenarios with:
  - What breaks
  - How you detect it (monitoring, alerts)
  - What happens to users
  - How you recover
  - Prevention measures
- **Incident Response Runbook:**
  - Step-by-step playbook for the 3 failure scenarios
  - Escalation path (who to contact, in what order)
  - Recovery commands (copy-pasteable, tested)
  - Communication templates for stakeholders
- **Containerization:** Docker Compose deployment with:
  - Application container
  - Database container (if applicable)
  - Health check endpoints
  - Log aggregation
- **Monitoring:** Basic observability:
  - Application health endpoint
  - Error rate tracking
  - Response time tracking
  - Alert thresholds defined (even if not all automated)
- **Testing:** Tests for the new feature with coverage report
- **Assumptions Log:** Track at least 5 assumptions made during the build:
  - What you assumed
  - What turned out to be true
  - What was wrong
  - How you adjusted

## Deliverables
1. Feature implemented and merged (PR with description)
2. Failure Mode Analysis document
3. Incident Response Runbook
4. Docker Compose configuration for deployment
5. Monitoring configuration (health checks, alert thresholds)
6. Assumptions Log (minimum 5 entries)
7. Context Pack v2 (should show significant improvement over v1)
8. Surviving the incident drill (maestro injects a failure, you respond)

## Incident Drill
At a time chosen by the maestro (not announced in advance), a failure will be injected into the deployed system. The apprentice has 30 minutes to:
1. Detect the issue (via monitoring or user report)
2. Diagnose the root cause
3. Apply a fix or workaround
4. Write a postmortem (what happened, why, how to prevent it)

The drill is pass/fail. If the apprentice cannot diagnose within 30 minutes, they debrief with the maestro and attempt again after a recovery period.

## Rubric

| Criterion | Weight | Exemplary (4) | Proficient (3) | Developing (2) | Beginning (1) |
|-----------|--------|---------------|-----------------|-----------------|----------------|
| Feature Quality | 25% | Clean implementation, well-tested, good PR description, follows existing patterns | Working implementation, tested, reasonable PR | Feature works but tests thin or PR unclear | Feature incomplete or untested |
| Failure Analysis | 25% | 3+ realistic scenarios, detection/recovery/prevention thorough | 3 scenarios, detection and recovery present | Fewer than 3 scenarios, thin analysis | No failure analysis |
| Incident Response | 20% | Runbook is usable under pressure, copy-pasteable commands, tested recovery steps | Runbook present, commands work, minor gaps | Runbook present but not tested or incomplete | No runbook |
| Incident Drill | 15% | Diagnoses within 15 min, applies fix, writes clear postmortem | Diagnoses within 30 min, applies fix, postmortem adequate | Diagnoses with hints, fix attempted | Cannot diagnose within 30 min |
| Assumptions Log | 15% | 5+ entries, honest about what was wrong, clear adjustments | 5 entries, reasoning present | Fewer than 5 entries, surface-level | No Assumptions Log |

## What "Exemplary" Looks Like
A feature that a senior engineer would approve in code review without major changes. A Failure Mode Analysis that makes the reviewer say "I hadn't thought of that." A runbook that actually works during the drill — no missing commands, no wrong paths. An Assumptions Log that shows intellectual honesty about what you got wrong.

## Estimated Time
80–120 hours over 8–10 weeks

## Resources
- Studio Ordo Spell Book: containers, networking, monitoring, incident response, observability, runbook, failure mode analysis, assumptions log
- Context Pack v2 template
- Docker Compose documentation
- Prometheus/Grafana basics (monitoring)
