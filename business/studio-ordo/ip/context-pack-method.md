# The Context Pack — The Operating Method for Directing AI Agents

## What It Is

The Context Pack is a four-component structured brief that enables effective AI agent work. It is the operational artifact behind the "CEO of agents" thesis: you do not write every line of code, but you assemble the context that determines whether the output is useful or dangerous.

> *In the old paradigm, the meta-skill was studying — absorbing and retaining information. In the new paradigm, the meta-skill is context management — assembling and transferring the right information to AI agents so they can work effectively on your behalf.*

Every Context Pack contains four components:

| Component | Contents | Purpose |
|-----------|----------|---------|
| **Project Brief** | Problem statement, constraints, success criteria, scope boundaries | Tell the agent *what* to do and *when to stop* |
| **Domain Context** | Key concepts, terminology, relationships, prior work, relevant standards | Give the agent enough domain knowledge to produce relevant output |
| **Evaluation Criteria** | How to judge whether output is good — acceptance tests, quality metrics, style guidelines | Enable the human to exercise informed judgment |
| **Prior Context** | What has been tried, what worked, what failed, lessons from previous iterations | Prevent the agent from repeating known mistakes |

---

## Why It Matters

### For Engineering Teams
The Context Pack is the most transferable skill in AI-augmented engineering. Regardless of which tool, framework, or AI model exists next year, the ability to:
- Clearly define a problem and its constraints
- Assemble relevant domain knowledge
- Specify evaluation criteria
- Document prior context and lessons learned

...is the skill that makes someone an effective AI director in any domain.

### For Leaders
Context Pack quality is the leading indicator of AI ROI. Teams that write precise Context Packs get better AI output. Teams that skip context construction get expensive rework.

### For Hiring
Every senior engineering role now requires some version of context management:
- "Capture technical learnings and provide handoff documentation for production teams" — Morningstar ($145–183K)
- "Safe and effective deployment" of AI systems — OpenAI ($137–250K)
- "Build, ship and iterate on LLM-backed agentic workflows" — requires context about what has been tried

The Context Pack is the standardized method for this work.

---

## Progression Levels

### Beginner — Single-Component Focus
The practitioner writes a solid Project Brief for a well-defined task.

```
Project Brief: Refactor the user authentication module to support OAuth2.
  - Scope: auth module only, no changes to user management
  - Constraints: must maintain backward compatibility with existing sessions
  - Success: all existing auth tests pass + new OAuth2 flow tests pass
  - Timeline: complete within current sprint
```

**What this develops:** The discipline of defining "done" before starting work. Most AI failures begin with vague instructions.

---

### Intermediate — Full Four-Component Pack
The practitioner assembles all four components for a moderately complex task.

```
Project Brief:
  Build a rate-limiting middleware for the API gateway.
  - Scope: API layer only
  - Constraints: must not break existing endpoints, must be configurable per-route
  - Success: rate limiting enforced, logged, and observable in metrics dashboard
  - Timeline: 3 days

Domain Context:
  - Current architecture: Next.js API routes, SQLite backend, no existing rate limiting
  - Relevant standards: RFC 6585 (429 Too Many Requests), token bucket algorithm
  - Key concepts: token bucket vs. sliding window, burst allowance, per-IP vs. per-user
  - Related systems: Stripe webhook endpoints need exemption from rate limits

Evaluation Criteria:
  - Unit tests for token bucket logic (edge cases: empty bucket, refill timing, concurrent requests)
  - Integration test: 429 response includes Retry-After header
  - Load test: system remains responsive under 10x normal traffic
  - Code review checklist: no hardcoded values, configuration externalized

Prior Context:
  - Attempted nginx-level rate limiting in Q3 — abandoned because per-route config was too complex
  - Current pain point: bot traffic causing DB connection exhaustion during peak hours
  - Lesson: must be observable (previous attempt had no metrics, so we could not tune)
```

**What this develops:** The ability to give an AI agent enough context to produce a meaningful first draft — and enough evaluation criteria to judge the result.

---

### Advanced — Multi-Agent Orchestration
The practitioner constructs Context Packs for coordinated agent work across a complex project.

```
Orchestration Pack: Migrate monolithic user service to event-driven architecture

Agent 1 — Architecture Design:
  Project Brief: Design event schema and service boundaries for user lifecycle events
  Domain Context: Current monolith schema, downstream consumers, data consistency requirements
  Evaluation Criteria: Schema handles all current use cases, no data loss paths, backward compatible
  Prior Context: Team rejected CQRS in 2024 — too complex for current team size

Agent 2 — Implementation:
  Project Brief: Implement event publisher and consumer for user-created events
  Domain Context: Architecture from Agent 1 output, existing test patterns, CI/CD pipeline constraints
  Evaluation Criteria: All existing tests pass, new event tests cover happy path + failure modes
  Prior Context: Previous microservice attempt failed on deployment complexity — keep it simple

Agent 3 — Documentation:
  Project Brief: Write migration guide for downstream teams
  Domain Context: Current API contracts, new event schema, affected teams and their tech stacks
  Evaluation Criteria: Each team can migrate without asking the authoring team for help
  Prior Context: Last migration doc was 47 pages and nobody read it — keep to 2 pages + examples

Human Orchestration:
  - Review Agent 1 output before Agent 2 starts (architecture shapes everything)
  - Run Agent 2 and Agent 3 in parallel after architecture approval
  - Final review: integration test across all three outputs
```

**What this develops:** The "CEO of agents" capability — directing multiple work streams, managing dependencies, and taking responsibility for the integrated result.

---

## Context Pack Templates

### Template 1: Feature Implementation

```markdown
# Context Pack: [Feature Name]

## Project Brief
**Problem:** [What problem does this solve?]
**Scope:** [What is in scope? What is explicitly out?]
**Constraints:** [Technical, timeline, compatibility constraints]
**Success criteria:** [How do we know this is done and correct?]

## Domain Context
**Architecture:** [Relevant system components and their relationships]
**Standards:** [Applicable RFCs, patterns, conventions]
**Key concepts:** [Terms and patterns the agent needs to know]
**Related systems:** [What else this touches]

## Evaluation Criteria
**Tests:** [Specific test cases that must pass]
**Review checklist:** [What a code reviewer should verify]
**Performance:** [Latency, throughput, resource requirements]
**Security:** [Authentication, authorization, input validation requirements]

## Prior Context
**What has been tried:** [Previous approaches and their outcomes]
**Known issues:** [Gotchas, edge cases, sensitive areas]
**Lessons:** [What we learned that should inform this work]
```

### Template 2: Investigation / Research

```markdown
# Context Pack: [Investigation Topic]

## Project Brief
**Question:** [What are we trying to find out?]
**Scope:** [What should the investigation cover? What is out of scope?]
**Deliverable:** [Recommendation memo? Spike code? Decision matrix?]
**Decision by:** [Who decides, and when?]

## Domain Context
**Current state:** [What we know now]
**Constraints:** [Budget, timeline, team capability, compliance requirements]
**Stakeholders:** [Who cares about the answer and why]

## Evaluation Criteria
**A good answer:** [What makes a recommendation actionable?]
**Evidence standard:** [What counts as sufficient evidence?]
**Format:** [How should findings be presented?]

## Prior Context
**Previous investigations:** [What has been looked at before?]
**Organizational context:** [Politics, preferences, prior commitments]
**Known biases:** [What assumptions should be checked?]
```

### Template 3: Incident Response

```markdown
# Context Pack: [Incident Name]

## Project Brief
**Incident:** [What happened?]
**Impact:** [Who is affected? What is the business cost?]
**Priority:** [Severity level and escalation status]
**Goal:** [Restore service? Root cause? Both?]

## Domain Context
**System:** [Affected components and their relationships]
**Recent changes:** [What was deployed or modified in the last 48 hours?]
**Monitoring:** [What alerts fired? What metrics are anomalous?]
**Dependencies:** [External services, data sources, upstream/downstream systems]

## Evaluation Criteria
**Resolution:** [How do we know the incident is resolved?]
**Verification:** [Tests to confirm the fix works]
**Regression:** [How do we ensure this does not happen again?]

## Prior Context
**Similar incidents:** [Has this happened before? What was the fix?]
**Known vulnerabilities:** [Were there warnings or near-misses?]
**Runbook:** [Does a recovery procedure exist?]
```

---

## How Context Packs Fit Into Studio Ordo Engagements

| Engagement | Context Pack Role |
|------------|------------------|
| **Workshop** | Practitioners build a Context Pack during the session — hands-on practice with real problems |
| **Team Program** | Team adopts Context Packs as their standard workflow for AI-directed work |
| **Advisory** | Consultant reviews team's Context Packs to diagnose AI workflow maturity |
| **Studio (Apprentice)** | Required artifact at every gate — quality and sophistication increase at each level |

---

## The Transferable Skill

A practitioner who has built Context Packs across multiple domains can walk into any organization and say:

> "Give me the problem. I'll construct the context, direct the agents, evaluate the output, and take responsibility for the result."

That is the "CEO of agents" — and the Context Pack is their primary tool.
