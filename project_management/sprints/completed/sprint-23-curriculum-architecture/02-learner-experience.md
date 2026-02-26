# Sprint 23 — Curriculum Architecture: The 90-Day Transformation

Sprint: 23
Focus: Curriculum Architecture & Content Outlines
Date: 2026-02-24
Status: **Planning**

---

## The Learner Experience (UX Design)

This document defines the weekly cadence and the pedagogical model for the 90-day curriculum. The goal is to create a high-intensity, immersive experience that balances active building, philosophical reflection, and passive consumption.

### The Weekly Cadence

The week is structured to mirror a professional engineering sprint, but with built-in time for reflection and study.

*   **Monday: The Briefing & The Canon**
    *   **Focus:** Theory, Philosophy, and the "Why."
    *   **Activities:**
        *   Read/watch the curated materials for the week (The Canon).
        *   Review the weekly project spec.
        *   *Example:* Read excerpts from *Meditations* on control, and review the spec for building a Git-backed state machine.
*   **Tuesday: The Foundation (Manual Work)**
    *   **Focus:** Building the substrate of understanding (The 40% manual work).
    *   **Activities:**
        *   Write code manually to understand the underlying mechanics.
        *   Set up the environment, configure linters, write initial tests.
        *   *Example:* Manually initialize a Git repository, create commits, and understand the `.git` directory structure.
*   **Wednesday: The Agentic Workflow (AI Execution)**
    *   **Focus:** Scaling execution with AI (The 60% agentic work).
    *   **Activities:**
        *   Use AI tools (Copilot, Claude, etc.) to accelerate the build process.
        *   Prompt engineering, context management, and iterative refinement.
        *   *Example:* Use AI to generate the boilerplate for the state machine, focusing on the architecture rather than the syntax.
*   **Thursday: The Audit & The Defense**
    *   **Focus:** Verification, Judgment, and Accountability.
    *   **Activities:**
        *   Submit the project to the Automated Audit system.
        *   Review the AI-generated critique.
        *   Write an Architecture Decision Record (ADR) defending the choices made, accepting or rejecting the AI's feedback.
        *   *Example:* Defend why a specific state transition was implemented, even if the AI suggested a different approach.
*   **Friday: The Pitch & The Maestro Review**
    *   **Focus:** Translation, Sales, and Human Escalation.
    *   **Activities:**
        *   Translate the technical architecture into business value (The Pitch).
        *   Escalate contested judgments to the human Maestro for review.
        *   *Example:* Pitch the state machine as a reliable, auditable system for managing user data, using Cialdini's principles of authority and trust.

### Action-First Integration

We do not teach tools in isolation. Every technical action must be driven by a philosophical or product requirement.

*   **Git:** Taught as Stoic state management. You don't learn Git to "save code"; you learn it to enforce order, revert chaos, and maintain a clear history of decisions.
*   **VSCode/Linters:** Taught as the Verification Toolchain. You don't configure ESLint to "fix formatting"; you configure it to build a deterministic cage around the probabilistic AI.
*   **Python/TypeScript:** Taught as the language of logic and structure. You don't learn syntax for its own sake; you learn it to express clear, unambiguous instructions to the machine.

### The 40/60 Split

The curriculum explicitly balances manual work and agentic work.

*   **40% Manual Work:** Students must build the substrate of understanding. They must know how the system works under the hood so they can evaluate the AI's output. If they don't understand the domain, they cannot govern the AI.
*   **60% Agentic Work:** Once the foundation is laid, students must learn to scale their execution using AI. This is the workflow of the future. They must learn to be the "CEO of agents," directing the AI rather than writing every line of code themselves.

### The Automated Audit & Escalation Loop

To prevent "chatbot fatigue" and ensure the AI is not seen as the ultimate arbiter of truth, we use a static audit and escalation model.

1.  **The Submission:** The student submits their code and architecture.
2.  **The Audit:** The AI generates a static, comprehensive critique based on predefined rubrics (linters, tests, architectural patterns).
3.  **The Defense:** The student writes an ADR, explicitly accepting or rejecting the AI's critique. They must justify their decisions.
4.  **The Escalation:** If the student and the AI disagree, or if the student needs deeper guidance, the issue is escalated to a human Maestro. The Maestro provides the final judgment, modeling what it means to have stakes and take responsibility.