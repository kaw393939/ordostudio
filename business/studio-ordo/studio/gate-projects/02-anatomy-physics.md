# Gate Project 2 — Anatomy & Physics

## Level
1: Apprentice (Months 2–3)

## Human Edge
Polymathic Synthesis

## Overview
A cross-disciplinary exploration. You will model a biological system using physics engines or mathematical proofs. The point is to bridge two distinct fields and prove you can synthesize knowledge across boundaries. You cannot hide behind a single discipline. **The synthesis is the curriculum.**

## Learning Objectives
- Structure a professional project that bridges two distinct domains
- Apply mathematical rigor to biological or anatomical models
- Configure static analysis tools (linting, formatting, type checking)
- Set up automated testing for complex simulations
- Build a CI/CD pipeline that enforces all quality gates
- Evaluate AI-generated code against cross-disciplinary standards (AI Audit Log)
- Make accept/reject/modify decisions on AI suggestions and document reasoning

## Technical Requirements
- **Language:** Python (pytest, Black, isort, Flake8, Pylint, mypy) or TypeScript (Vitest, ESLint, Prettier, tsc strict mode)
- **Simulation:** Must include a working physics or mathematical model of a biological system
- **Test coverage:** 100% — CI pipeline fails on any coverage drop
- **Linting:** Zero warnings in CI
- **Type safety:** Strict mode, no `any` types (TS) or missing type hints (Python)
- **CI/CD:** GitHub Actions workflow that runs: lint → type-check → test → coverage report
- **Documentation:** README with setup instructions, architecture decisions, and an explanation of the cross-disciplinary synthesis

## Deliverables
1. Anatomy & Physics simulation application
2. Test suite with 100% coverage
3. CI/CD pipeline (GitHub Actions) with all quality gates
4. AI Audit Log — minimum 10 entries documenting AI interactions:
   - What AI suggested
   - Whether you accepted, rejected, or modified it
   - Why (the reasoning is the point)
5. Context Pack v1 (revised from Gate Project 1 — should show improvement)
6. README with CI badge, architecture notes, and "what I learned"

## Rubric

| Criterion | Weight | Exemplary (4) | Proficient (3) | Developing (2) | Beginning (1) |
|-----------|--------|---------------|-----------------|-----------------|----------------|
| Cross-Disciplinary Synthesis | 25% | Deep integration of physics/math and biology, accurate modeling | Good integration, mostly accurate modeling | Superficial integration, some inaccuracies | Poor integration, inaccurate modeling |
| CI/CD Pipeline | 25% | All gates enforce, pipeline fails on any violation, clear job structure | All gates present, pipeline mostly enforces, minor config issues | Some gates present but not all enforced | No CI or pipeline does not enforce quality |
| Code Quality | 20% | Clean architecture, no lint warnings, strict types, professional structure | Minor lint issues, good structure, type coverage high | Moderate quality issues, inconsistent structure | Significant quality problems, no linting |
| AI Audit Log | 20% | 10+ entries showing pattern recognition (notices recurring AI mistakes, adjusts prompts) | 10+ entries with clear accept/reject reasoning | Fewer than 10 entries, reasoning thin | No Audit Log or entries without reasoning |
| Professional Polish | 10% | README is employer-ready, CI badge, clear architecture decisions documented | README complete, CI badge present, some architecture notes | README minimal, no CI badge | No README |

## What "Exemplary" Looks Like
A repository that a senior engineer would look at and say: "This person knows how to synthesize complex domains." The simulation is accurate and well-tested. The CI pipeline is strict — nothing merges without passing every gate. The AI Audit Log shows that you are developing judgment about when AI helps and when it misleads. The README explains the cross-disciplinary synthesis, not just "how to run it."

## AI Audit Log Template

```markdown
# AI Audit Log — Anatomy & Physics

## Entry 1 — [Date]
**Task:** [What I was trying to do]
**AI Tool:** [Which tool — Copilot, ChatGPT, Claude, etc.]
**AI Suggestion:** [What the AI generated]
**Decision:** Accepted / Rejected / Modified
**Reasoning:** [Why — this is the important part]
**Lesson:** [What this taught me about working with AI]

## Entry 2 — [Date]
...
```

## Estimated Time
60–80 hours over 6–8 weeks

## Resources
- Studio Ordo Spell Book: Cross-disciplinary synthesis, CI/CD, test coverage, AI Audit Log, linting, type safety
- Context Pack Method guide
- Python: pytest docs, Black docs, mypy docs
- TypeScript: Vitest docs, ESLint docs, tsc strict mode
- GitHub Actions documentation
