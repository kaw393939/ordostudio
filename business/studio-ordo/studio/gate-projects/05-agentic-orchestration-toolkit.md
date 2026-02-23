# Gate Project 5 — Agentic Orchestration Toolkit

## Level
3: Senior Journeyman (Months 9–11)

## Human Edge
Epistemic Humility + Systems Thinking

## Overview
Build a CLI that orchestrates multiple AI providers using SOLID design principles. You are not writing prompts — you are managing AI as a workforce. The CLI must support at least 3 commands (web search, model feedback, image generation), use the Command pattern with dependency injection, and demonstrate interface segregation. The capstone: add an entirely new command from scratch without guidance.

## Core Mindset
"You are the CEO managing a workforce of AI experts. Your role is strategy, taste, and context management. The AI does execution. You own the output."

## Learning Objectives
- Design a software system using SOLID principles (not just know the acronyms)
- Implement the Command pattern with a command registry
- Use dependency injection to manage external service dependencies
- Apply interface segregation — each AI provider implements a clean interface
- Build a structured output management system (timestamped files, organized by command)
- Apply the 10 Core Orchestration Principles in practice
- Understand what data can and cannot represent (Epistemic Humility — AI outputs have limits)

## 10 Core Orchestration Principles

| # | Principle | Application |
|---|-----------|-------------|
| 1 | Outcome first | Define the final artifact and where it lives before writing code |
| 2 | Constraints are guardrails | Specify architecture rules, naming conventions, output folders |
| 3 | Tooling is non-negotiable | Instruct the agent to use tools, not assumptions |
| 4 | Short feedback loops | Request changes at checkpoints, not one giant prompt |
| 5 | Separate research from execution | Gather facts first, then implement |
| 6 | Dogfood the workflow | Use the tool immediately after building to catch issues |
| 7 | Expert-lens review | Critique grounded in a specific framework (e.g., SOLID, 12-Factor) |
| 8 | Adversarial review | Failure-focused critique that tries to break assumptions |
| 9 | Constraint inversion | Flip a constraint to expose tradeoffs |
| 10 | Artifact-first prompting | Specify deliverables before implementation details |

## Technical Requirements
- **Language:** Node.js/TypeScript (preferred) or Python
- **Architecture:**
  - Command pattern with central command registry
  - Dependency injection container for service management
  - Interface segregation — each AI provider behind a clean interface
  - Structured output management (timestamped, organized by command type)
- **Required Commands:**
  - `web-search` — fetch and save web results to `references/`
  - `model-feedback` — send content to AI model, save response to `references/ai_feedback/`
  - `image-generate` — generate image from prompt, save to `images/`
- **Capstone Command:** Design and implement a 4th command entirely from scratch:
  - Create new command class
  - Register in command registry
  - Run with real input
  - Save output to organized folder
  - Write reflection on what broke and how you fixed it
- **Quality Gates:** Linting, type-checking, tests for each command, CI pipeline
- **Data Assumptions Document:** For each command, document:
  - What the AI output represents
  - What it does NOT represent
  - Known failure modes (rate limits, hallucinations, format drift)
  - How to validate output quality

## Deliverables
1. Working CLI with 3 required commands + 1 capstone command
2. Architecture documentation showing Command pattern, DI, interface segregation
3. Data Assumptions Document (per command)
4. Capstone reflection (what you built, what broke, how you fixed it)
5. Context Pack v3 (adds data quality assumptions, failure modes, SLA requirements)
6. Tests for each command with CI pipeline

## Rubric

| Criterion | Weight | Exemplary (4) | Proficient (3) | Developing (2) | Beginning (1) |
|-----------|--------|---------------|-----------------|-----------------|----------------|
| Architecture | 30% | SOLID principles demonstrable in code review, clean DI, clear interfaces | SOLID mostly applied, DI present, interfaces reasonable | Some patterns present, inconsistent application | No design patterns, monolithic code |
| Commands | 25% | All 4 commands work, output organized, error handling robust | 3 required commands work, capstone works, minor issues | Commands work but output disorganized or error handling weak | Commands broken or incomplete |
| Data Assumptions | 20% | Honest and specific about AI output limits, failure modes documented with mitigations | Assumptions documented, most limits identified | Surface-level assumptions, thin failure mode analysis | No Data Assumptions Document |
| Capstone | 15% | New command is well-designed, reflection is insightful about what went wrong | Capstone works, reflection present | Capstone works but poorly designed, thin reflection | Capstone incomplete |
| Quality Gates | 10% | CI passes, types strict, lint clean, tests meaningful | CI passes, minor type or lint issues | CI partially configured, some tests | No CI or tests |

## What "Exemplary" Looks Like
A codebase where adding a new command requires implementing one interface and registering it — nothing else changes. The Data Assumptions Document is honest: "The web-search command returns results ranked by the search provider's algorithm, which may not reflect accuracy or relevance to the user's actual need. Results should not be treated as verified facts." The capstone reflection describes a real problem encountered and how it was solved — not a polished success story.

## Estimated Time
80–100 hours over 8–10 weeks

## Resources
- Studio Ordo Spell Book: Command pattern, dependency injection, interface segregation, Conway's Law, coupling, cohesion
- SOLID Principles (Robert C. Martin)
- 10 Core Orchestration Principles (above)
- Context Pack v3 template
- OpenAI API documentation
- Google Gemini API documentation
