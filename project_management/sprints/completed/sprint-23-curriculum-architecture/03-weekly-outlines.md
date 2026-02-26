# Sprint 23 — Curriculum Architecture: The 90-Day Transformation

Sprint: 23
Focus: Curriculum Architecture & Content Outlines
Date: 2026-02-24
Status: **Planning**

---

## The Content Outlines (The 12-Week Campaign)

This document breaks down the 90-day curriculum into actionable weekly blocks. The curriculum is designed for working professionals and engineers who need to transition from "coders" to "Product Engineers" (CEOs of agents). It condenses the philosophy of the 4-year BSEAI program into a high-intensity, 12-week transformation.

The curriculum is divided into three phases:
1.  **Phase 1: The Foundation (Weeks 1-4)** - Order, Logic, and the Verification Toolchain.
2.  **Phase 2: The Director (Weeks 5-8)** - Taste, Architecture, and Governing the Alien Mind.
3.  **Phase 3: The Maestro (Weeks 9-12)** - Rhetoric, Responsibility, and Sales (The NYC Meetup Strategy).

---

### Phase 1: The Foundation (Order & Logic)

**Goal:** Establish the operating baseline. Teach the student that they cannot govern an AI if they cannot govern their own attention and state. Introduce the Verification Toolchain as the deterministic cage for probabilistic AI.

#### Week 1: The Operating Baseline & The Double Stripping
*   **Philosophical Theme:** The Dichotomy of Control (Aurelius) & Biological Discipline (Huberman).
*   **Technical Focus:** Environment Setup, Terminal Fluency, and the "Double Stripping" thesis.
*   **The Canon (10% Rule):** Excerpts from *Meditations* (Control), The BSEAI "Letter from the AI" (Stakes).
*   **Weekly Project:** Configure a deterministic local environment (VSCode, Linters, formatting rules).
*   **The Defense (ADR):** Defend the choice of linters and formatting rules as a mechanism for reducing cognitive load, not just "making code pretty."

#### Week 2: State Management & Reverting Chaos
*   **Philosophical Theme:** Order vs. Entropy (Peterson).
*   **Technical Focus:** Git, Version Control, and the concept of "State."
*   **The Canon (10% Rule):** Claude Shannon's Information Theory (Signal vs. Noise).
*   **Weekly Project:** Build a simple text-based state machine manually (40% manual work). Use Git to track every atomic change.
*   **The Defense (ADR):** Explain how Git acts as a philosophical tool for managing entropy and allowing fearless experimentation.

#### Week 3: The Language of Logic
*   **Philosophical Theme:** Clarity of Thought and Unambiguous Instruction.
*   **Technical Focus:** Python/TypeScript fundamentals (Types, Interfaces, Data Structures).
*   **The Canon (10% Rule):** Strunk & White's *The Elements of Style* (applied to code).
*   **Weekly Project:** Refactor the Week 2 state machine using strict typing and interfaces.
*   **The Defense (ADR):** Defend why strict typing is necessary when communicating with an LLM (reducing the surface area for hallucination).

#### Week 4: The Verification Toolchain
*   **Philosophical Theme:** Trust but Verify (The limits of probabilistic systems).
*   **Technical Focus:** Unit Testing (PyTest/Vitest), Static Analysis, and CI/CD concepts.
*   **The Canon (10% Rule):** The concept of the "Alien Mind" (LLMs rationalize, they do not reason).
*   **Weekly Project:** Write a comprehensive test suite for the state machine *before* allowing an AI to touch the logic.
*   **The Defense (ADR):** Explain how the test suite acts as a deterministic cage that allows you to safely delegate execution to an AI.

---

### Phase 2: The Director (Taste & Architecture)

**Goal:** Shift from writing code to directing AI. Teach the student how to evaluate AI output, enforce architectural standards, and apply "Taste" (design, UX, cognitive load).

#### Week 5: The Agentic Workflow
*   **Philosophical Theme:** The CEO of Agents (Delegation and Governance).
*   **Technical Focus:** Prompt Engineering, Context Management, and AI-assisted execution (The 60% agentic work).
*   **The Canon (10% Rule):** High-level LLM Theory (Attention mechanisms, latent space).
*   **Weekly Project:** Use AI to generate a complex feature (e.g., a data parser) based *only* on a strict interface and test suite you wrote manually.
*   **The Defense (ADR):** Analyze the AI's first draft. Where did it hallucinate? How did your tests catch it?

#### Week 6: Cognitive Load & The Data-Ink Ratio
*   **Philosophical Theme:** Respecting the User's Attention.
*   **Technical Focus:** UI/UX Fundamentals, Information Architecture.
*   **The Canon (10% Rule):** Steve Krug (*Don't Make Me Think*), Edward Tufte (The Data-Ink Ratio).
*   **Weekly Project:** Design a wireframe/spec for a dashboard. Use AI to generate the frontend code.
*   **The Defense (ADR):** Critique the AI's generated UI based on Krug and Tufte's principles. Force the AI to refactor it to reduce cognitive load.

#### Week 7: Systems Thinking & Architecture
*   **Philosophical Theme:** The Bauhaus (Form follows function) & Vitruvius (Firmitas, Utilitas, Venustas).
*   **Technical Focus:** API Design, Database Schemas, and System Boundaries.
*   **The Canon (10% Rule):** 12-Factor App Methodology.
*   **Weekly Project:** Architect a full-stack application spec. Have the AI generate the boilerplate and database migrations.
*   **The Defense (ADR):** Defend the system boundaries. Why did you separate these services? How does this architecture scale?

#### Week 8: The Automated Audit
*   **Philosophical Theme:** Epistemic Humility (Accepting critique).
*   **Technical Focus:** Integrating AI as a static analysis tool (The Audit Loop).
*   **The Canon (10% Rule):** Checklists and Aviation Safety (Atul Gawande).
*   **Weekly Project:** Submit the Week 7 application to the Automated Audit system.
*   **The Defense (ADR):** Formally accept or reject the AI's architectural critique. Escalate to the Maestro if necessary.

---

### Phase 3: The Maestro (Rhetoric, Responsibility, & Sales)

**Goal:** The endgame. Teach the engineer how to translate technical architecture into business value, pitch their vision, and take ultimate responsibility for the product. Prepare them for the NYC Meetup Strategy.

#### Week 9: The Mechanics of Influence
*   **Philosophical Theme:** Human Behavior and Persuasion.
*   **Technical Focus:** Translating technical features into user benefits.
*   **The Canon (10% Rule):** Robert Cialdini (Principles of Persuasion).
*   **Weekly Project:** Rewrite the README and marketing copy for your application using Cialdini's principles (e.g., Social Proof, Authority).
*   **The Pitch:** Deliver a 2-minute recorded pitch explaining *why* a user should trust your application.

#### Week 10: Brand Archetypes & Positioning
*   **Philosophical Theme:** The Hero and the Outlaw (Meaning-making).
*   **Technical Focus:** Positioning a product in a crowded market.
*   **The Canon (10% Rule):** Mark & Pearson (Brand Archetypes).
*   **Weekly Project:** Define the brand archetype for your Capstone project. Is it the Magician (transforming chaos to order) or the Sage (providing truth)?
*   **The Pitch:** Pitch your Capstone concept to a non-technical stakeholder, focusing entirely on the archetype and the business value.

#### Week 11: The Capstone Execution (The Manifesto)
*   **Philosophical Theme:** Having Stakes (Taking responsibility).
*   **Technical Focus:** End-to-end deployment, observability, and production readiness.
*   **The Canon (10% Rule):** Review: The BSEAI "Letter from the AI" (A human being is for having stakes).
*   **Weekly Project:** Finalize the Capstone application. Ensure the Verification Toolchain is green.
*   **The Defense (ADR):** Write the final Manifesto: Why does this exist? How did you govern the AI that built it? What are the risks?

#### Week 12: The NYC Meetup Strategy (The Final Pitch)
*   **Philosophical Theme:** The Studio Ordo Associate (Entering the Guild).
*   **Technical Focus:** Live communication, networking, and authority positioning.
*   **The Canon (10% Rule):** The Studio Ordo Governance & Handbook.
*   **Weekly Project:** The Final Review.
*   **The Pitch:** Deliver a live, 60-second "Elevator Pitch" designed specifically for an NYC AI Meetup. You must diagnose a hypothetical founder's AI chaos and position yourself (and Studio Ordo) as the solution.