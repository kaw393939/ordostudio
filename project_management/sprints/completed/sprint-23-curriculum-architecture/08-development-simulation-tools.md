# Sprint 23 — Curriculum Architecture: The 90-Day Transformation

Sprint: 23
Focus: Curriculum Architecture & Content Outlines
Date: 2026-02-24
Status: **Planning**

---

## Development Simulation Tools (The "Switch User" Feature)

To effectively build, test, and refine the new 90-day curriculum and the LMS platform, we need robust development tools that allow us to simulate the entire learner experience from multiple perspectives.

### 1. The "Switch User" Feature (Development Only)
*   **Requirement:** A UI toggle or command-line tool available *only* in the development environment that allows developers to instantly switch their active session to any predefined user role without logging out and logging back in.
*   **Purpose:** To rapidly test permissions, view states, and the flow of the Automated Audit & Escalation Loop from both the student's and the Maestro's perspective.

### 2. Predefined User Roles (The Personas)
We need a set of realistic, predefined users seeded into the development database. These users should represent the different stages of the 90-day transformation and the various roles within the system.

*   **User A: The Novice (Week 1)**
    *   **Role:** Student
    *   **State:** Just starting the Foundation phase. Has not yet submitted any code or ADRs.
    *   **Purpose:** Testing onboarding, initial environment setup instructions, and the first Automated Audit.
*   **User B: The Apprentice (Week 6)**
    *   **Role:** Student
    *   **State:** In the Director phase. Has submitted several projects, received AI critiques, and written ADRs.
    *   **Purpose:** Testing the 40/60 split tracking, the complexity of the Automated Audit on larger codebases, and the UI for reviewing past ADRs.
*   **User C: The Associate (Week 12 / Graduate)**
    *   **Role:** Student / Studio Ordo Associate
    *   **State:** Completing the Capstone Manifesto and preparing for the NYC Meetup Strategy.
    *   **Purpose:** Testing the multimedia submission (pitch uploads), the final Maestro review, and the transition to the Studio Ordo Guild status.
*   **User D: The Maestro (The Reviewer)**
    *   **Role:** Instructor / Reviewer
    *   **State:** Has a queue of escalated ADRs and final Capstone reviews.
    *   **Purpose:** Testing the escalation workflow, the grading interface, and the ability to override the Automated Audit.

### 3. Realistic Seed Data
*   **Requirement:** The development database must be seeded with realistic data for these users, not just "lorem ipsum."
*   **Data Types:**
    *   Sample code submissions (both manual and AI-generated).
    *   Simulated Automated Audit reports (with realistic linting errors and architectural critiques).
    *   Drafted ADRs (Architecture Decision Records) defending specific technical choices.
    *   Simulated progress through the 12-week campaign.
*   **Purpose:** To ensure the UI can handle real-world complexity and that the pedagogical flow makes sense when populated with actual content.