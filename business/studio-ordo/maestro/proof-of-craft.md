# Proof of Craft — Portfolio Evidence

## What This Demonstrates

These six projects are not academic exercises. They are production artifacts built using the Studio Ordo method — Context Packs, evaluation gates, AI Audit Logs, and the 40/60 split. Each project demonstrates a specific professional capability at a specific human-to-AI ratio.

---

## Project 1: Web Tech Fundamentals (IS 117 Lesson 1)

**What it demonstrates:** How to teach absolute beginners with emotional scaffolding and disciplined muscle memory.

**The approach:**
- First lesson for students who have never opened a terminal
- Addresses terminal anxiety directly — emotional scaffolding before technical instruction
- "Type everything, no copy-paste" enforcement builds muscle memory
- WSL2 established as the development standard from day one
- 12 micro-lessons in strict progressive order
- One HTML file, one CSS file, one JavaScript file — nothing more

**Human-AI ratio:** ~90% human effort. AI used only for help and explanation.

**What a client should take from this:** Keith understands how to meet people where they are. Studio Ordo workshops start from the participant's actual skill level, not from assumed prerequisites. This is deliberate instructional design, not dumbing-down.

**Source:** [GitHub — is117_lesson_1_webtech](https://github.com/kaw393939/is117_lesson_1_webtech)

---

## Project 2: Professional Python Calculator

**What it demonstrates:** What production-quality code looks like — tool mastery as curriculum.

**The approach:**
- Deliberately boring domain (a calculator) so that tooling is the lesson
- 100% test coverage as the floor, not the ceiling
- CI pipeline fails on any lint, type, or security issue
- 15-chapter textbook accompanies the project
- Cross-language awareness: Python patterns compared to JavaScript, Go, and Java equivalents

**Human-AI ratio:** ~50% human effort. AI used as quality verifier — checking work, suggesting improvements, enforcing standards.

**What a client should take from this:** Quality gates are not optional decorations. Studio Ordo engagements ship with tests, linting, coverage, and CI/CD because that is what production code requires. The calculator is boring by design — the method is the product.

**Source:** [GitHub — code_quality_calc](https://github.com/kaw393939/code_quality_calc)

---

## Project 3: Design Curator Cards

**What it demonstrates:** The 40/60 method in action — constrained AI execution with human judgment at every decision point.

**The approach:**
- Three museum-quality web cards about design history
- Explicit workflow artifacts: AGENTS.md, CLAIMS.md, PROMPT_LOG.md
- Banned word lists prevent AI from generating hype language
- "VERIFY" flag convention marks every AI claim requiring human fact-checking
- Named Expert Critique technique — AI evaluates its own output through the lens of a named expert
- The most explicit implementation of the 40/60 split: 40% human/hard-way, 60% AI-agentic

**Human-AI ratio:** ~40% human effort. AI used as constrained executor — powerful but bounded by explicit rules.

**What a client should take from this:** This is what responsible AI-directed work looks like. The AI is productive but accountable. Every claim is tracked. Every output is evaluated. The method produces artifacts that prove how the work was done — not just what was shipped.

**Source:** [GitHub — design_prompt_engineer_lesson](https://github.com/kaw393939/design_prompt_engineer_lesson)

---

## Project 4: Agentic Orchestration Toolkit

**What it demonstrates:** The "CEO of agents" concept made concrete — managing multiple AI systems with SOLID engineering principles.

**The approach:**
- Node.js CLI wrapping OpenAI and Google Gemini APIs
- SOLID design principles throughout: Command pattern, dependency injection, interface segregation
- 10 core orchestration principles documented and implemented
- Multiple AI agents managed as a coordinated workforce
- The architecture is the lesson: how to structure multi-agent systems for production

**Human-AI ratio:** ~40% human effort. AI used as a workforce to manage — multiple agents directed and coordinated by human judgment.

**What a client should take from this:** Multi-agent orchestration is not science fiction. It is a software engineering problem with known patterns (Command, DI, ISP). Studio Ordo teaches teams to manage AI agents the way experienced engineers manage microservices — with architecture, interfaces, and accountability.

**Source:** [GitHub — agentic_orchestration_toolkit](https://github.com/kaw393939/agentic_orchestration_toolkit)

---

## Project 5: Single-Server Hosting Platform

**What it demonstrates:** Full-stack DevOps from spec to production — Terraform, Ansible, Docker Compose, Traefik, and Let's Encrypt on a single Linode server.

**The approach:**
- Production hosting infrastructure deployed from a single specification document
- `initial_spec.md` written as a "letter to a coding agent" — the Context Pack in its purest form
- `AGENT_HANDOFF.md` — documentation for AI agent continuity (when a different agent picks up the project)
- Defense-in-depth security at every layer: firewall, reverse proxy, TLS, container isolation
- Full infrastructure-as-code: repeatable, auditable, version-controlled

**Human-AI ratio:** ~30% human effort. AI used as implementation agent working from a specification — the workflow closest to how production AI-directed work actually operates.

**What a client should take from this:** At this ratio, the human's value is entirely in judgment: writing the right spec, evaluating the output, owning the security posture. Studio Ordo's Advisory engagements help teams reach this level of AI-directed infrastructure work safely.

**Source:** [GitHub — hosting_llm_demo](https://github.com/kaw393939/hosting_llm_demo)

---

## Project 6: Swiss Design Portfolio (The 10-Hour Build)

**What it demonstrates:** What one person can ship in a single evening using the Context Pack method — professional-grade output with measurable quality.

**The numbers:**
- **Duration:** ~10 hours (one evening)
- **AI interactions:** 200+
- **Content generated:** 28,000 words
- **Lighthouse scores:** 100/100 (Performance, Accessibility, Best Practices, SEO)
- **Traditional agency estimate:** $15,000–$30,000 over 3–4 weeks
- **Equivalent team:** Swiss Design Expert ($150–300/hr) + Frontend Developer ($100–200/hr) + Accessibility Specialist ($100–150/hr) + Content Strategist ($75–150/hr) + Copywriter ($50–100/hr) + DevOps ($100–200/hr)

**What a client should take from this:** The method works at speed without sacrificing quality. The Lighthouse scores are not vanity metrics — they are objective, reproducible measurements. One person with the right method and precise context can produce output that would require a multi-disciplinary team using traditional approaches.

---

## The Progression

| Project | Human % | AI Role | Key Capability |
|---------|---------|---------|----------------|
| Web Tech Fundamentals | ~90% | Help/explain | Teaching beginners from zero |
| Python Calculator | ~50% | Quality verifier | Production quality gates |
| Design Curator Cards | ~40% | Constrained executor | The 40/60 method in practice |
| Orchestration Toolkit | ~40% | Workforce to manage | Multi-agent coordination |
| Hosting Platform | ~30% | Implementation agent from spec | Full DevOps from Context Pack |
| Swiss Portfolio | ~20% | Full creative partner | Maximum velocity with quality |

The progression is deliberate. As the practitioner's Context Packs become more precise and judgment becomes more reliable, the human percentage decreases and AI productivity increases — without sacrificing quality. This is the trajectory that Studio Ordo teaches.
