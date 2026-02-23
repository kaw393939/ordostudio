# Gate Project 6 — Production Deployment Platform

## Level
3: Senior Journeyman (Months 12–14)

## Human Edge
Systems Thinking + Epistemic Humility

## Overview
Deploy a production-grade application using infrastructure-as-code, configuration management, containerization, and an edge proxy with automated TLS. This is not a tutorial deployment — it is a real server that serves real traffic with defense-in-depth security. The human contribution is the specification, the security architecture, and the operational judgment. AI implements from spec.

## Learning Objectives
- Write an infrastructure specification ("letter to a coding agent") that is precise enough for AI to implement
- Provision infrastructure with Terraform (infrastructure-as-code)
- Harden a server with Ansible (configuration management)
- Containerize services with Docker Compose
- Configure an edge proxy (Traefik) with automated TLS via Let's Encrypt
- Implement defense-in-depth security architecture (6 layers)
- Write an AGENT_HANDOFF.md that enables a different AI agent to continue the work
- Create operational checklists (daily/weekly/monthly/quarterly)
- Conduct a STRIDE threat model on the deployed system

## Technical Requirements

### Infrastructure
- Cloud provider (Linode, DigitalOcean, or AWS Lightsail — single server)
- Terraform provisions the server and firewall with one command
- Only ports 22, 80, 443 reachable externally

### Server Hardening
- Ansible playbook for server configuration
- SSH: no root login, key-only authentication, fail2ban
- Host firewall (UFW) mirrors cloud firewall rules
- Automated security scanning on schedule

### Application Stack
- Docker Compose with:
  - Application container(s)
  - Database container (Postgres or SQLite — internal network only)
  - Traefik v3 edge proxy with automatic TLS
  - Watchtower for automated container updates (optional)
- Database reachable ONLY from containers on internal Docker network

### Security Architecture (Defense-in-Depth)
| Layer | Control |
|-------|---------|
| 1 — Cloud Firewall | Inbound allow 22/80/443 only |
| 2 — Host Firewall | UFW mirrors cloud rules |
| 3 — SSH Lockdown | No root, key-only, fail2ban |
| 4 — Edge Security | Traefik security headers, rate limiting |
| 5 — Application Controls | Input validation, error handling, logging |
| 6 — HTTP Headers | HSTS, CSP, X-Frame-Options, nosniff |

### Documentation
- initial_spec.md — the specification that AI implemented from
- AGENT_HANDOFF.md — enables a different person or AI to continue the work
- RUNBOOK.md — operational playbook
- STRIDE threat model (minimum 5 identified threats with mitigations)
- Operational checklists: daily, weekly, monthly, quarterly

### Acceptance Criteria (Definition of Done)
1. Terraform provisions server + firewall with one command
2. `ssh root@host` fails; `ssh [user]@host` works with keys only
3. Only ports 22/80/443 reachable externally (verified with nmap)
4. Traefik auto-issues valid TLS certificate for the domain
5. Database reachable ONLY from containers on internal network
6. Security scans run on schedule, write reports
7. Backup produced nightly, restore instructions verified and documented
8. RUNBOOK.md is sufficient for a complete rebuild from scratch

## Deliverables
1. Working production deployment (live URL with valid TLS)
2. Terraform configuration (infrastructure-as-code)
3. Ansible playbook (server hardening)
4. Docker Compose configuration
5. initial_spec.md (the AI-readable specification)
6. AGENT_HANDOFF.md (tested: a different person or AI can continue the work)
7. RUNBOOK.md with operational playbook
8. STRIDE threat model (5+ threats with mitigations)
9. Operational checklists (daily/weekly/monthly/quarterly)
10. Context Pack v3

## Rubric

| Criterion | Weight | Exemplary (4) | Proficient (3) | Developing (2) | Beginning (1) |
|-----------|--------|---------------|-----------------|-----------------|----------------|
| Infrastructure | 25% | One-command provision, all acceptance criteria met, nmap confirms | Provision works, most criteria met, minor gaps | Provision works with manual steps, some criteria missing | Cannot provision reliably |
| Security | 25% | 6-layer defense-in-depth verified, STRIDE thorough, no root SSH | 5+ layers verified, STRIDE present, SSH hardened | Some security layers, thin STRIDE | Weak security, root SSH possible |
| Documentation | 25% | AGENT_HANDOFF tested (someone else continued work), RUNBOOK enables rebuild | AGENT_HANDOFF present, RUNBOOK mostly complete | Documentation present but untested | Missing critical documentation |
| Operations | 15% | Checklists comprehensive, backups verified, monitoring in place | Checklists present, backups configured, some monitoring | Partial checklists, backups configured but untested | No operational procedures |
| Specification | 10% | initial_spec.md is precise enough that AI produced working implementation | Spec present, AI produced mostly working result | Spec vague, significant manual correction needed | No specification |

## AGENT_HANDOFF.md Template

```markdown
# Agent Handoff — [Project Name]

## Architecture Overview
[Topology diagram: edge → app → data]

## Deployment Model
[How code gets from commit to production]

## Authentication Model
[How users authenticate, session management]

## Database
[Schema overview, migration model, backup procedures]

## Secrets Management
[Where secrets live, how to rotate them]

## Recovery Procedures
[Break-glass admin recovery, rebuild from scratch]

## Operational Smoke Checks
[Exact curl commands to verify the system is working]
```

## What "Exemplary" Looks Like
A deployment that the apprentice could hand to a colleague and walk away from — the documentation is sufficient. The STRIDE threat model identifies threats that are not obvious (not just "SQL injection"). The AGENT_HANDOFF.md is tested — someone else actually used it to make a change. The initial_spec.md is a model for spec-driven AI development.

## Estimated Time
100–140 hours over 10–12 weeks

## Resources
- Studio Ordo Spell Book: infrastructure-as-code, defense-in-depth, Conway's Law, non-functional requirements
- Terraform documentation (Linode or DigitalOcean provider)
- Ansible documentation
- Docker Compose documentation
- Traefik v3 documentation
- STRIDE threat modeling guide
- Context Pack v3 template
