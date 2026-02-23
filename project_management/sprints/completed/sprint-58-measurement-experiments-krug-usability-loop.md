# Sprint 58 — Measurement + Experiments + Krug Usability Loop

## Goal
Close the loop: measure conversion and continuously improve UX with lightweight experiments and recurring Krug-style usability testing.

## Scope

### Measurement
- Define a minimal event taxonomy:
  - CTA clicks
  - form starts/completions
  - training track views
  - studio application funnel

Measurement UI requirements:
- A simple dashboard for operators:
  - totals (7d/30d)
  - funnel (view → start → submit)
  - top CTAs

Design rules:
- Avoid chart junk.
- Prefer tables and small summary cards.

### Experiments
- Use feature flags for:
  - hero copy variants
  - CTA variants
  - section ordering

Experiment hygiene:
- Each experiment has:
  - hypothesis
  - success metric
  - start/end date
  - rollback rule

### Usability testing loop
- Create a repeatable 60-minute script for 5-user tests.
- Track findings and fix the top 3 issues each cycle.

Krug test script must include:
- Trunk test (5 seconds)
- First click test
- Task success/failure scoring
- Severity rubric (blocker/major/minor)

## Acceptance Criteria

- [x] Measurement events recorded and viewable.
- [x] At least 2 experiments can be toggled via flags.
- [x] Usability test script exists in docs.
- [x] At least one round of findings is logged in the repo (template-based).
- [x] Lint/tests/build pass.

## Shipped
- Measurement UI + API + storage (migration `022_measurement_events`)
- Client measurement listener (page views + CTA clicks)
- Consult request form instrumentation (start + submit success)
- Experiments (feature flags): hero copy, CTA priority, services card ordering
- Docs: Krug script + findings template + round-01 findings
