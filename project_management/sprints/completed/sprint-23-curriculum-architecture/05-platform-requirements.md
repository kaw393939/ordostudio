# Sprint 23 — Curriculum Architecture: The 90-Day Transformation

Sprint: 23
Focus: Curriculum Architecture & Content Outlines
Date: 2026-02-24
Status: **Planning**

---

## Platform Requirements (The Infrastructure)

To support the new 90-day "Tech / Liberal Arts Crash Course" curriculum and the "CEO of Agents" pedagogical model, the LMS platform requires several structural and feature updates.

### 1. The Automated Audit & Escalation System
The core of the new pedagogy is the static audit and human escalation loop.
*   **Automated Audit Integration:** The platform needs a mechanism to ingest student code/architecture submissions and run them against a predefined set of deterministic rules (linters, static analysis) and a static AI critique based on the weekly rubrics (e.g., 12-Factor App compliance, Data-Ink ratio).
*   **ADR (Architecture Decision Record) Submission:** Students need a specific submission type for ADRs, where they explicitly accept or reject the findings of the Automated Audit and provide their written defense.
*   **Maestro Escalation Workflow:** A clear UI/UX path for students to escalate contested judgments or complex architectural questions to a human Maestro. This should be distinct from a standard "help ticket."

### 2. The 40/60 Split Tracking
*   **Time/Effort Tracking:** We need a way to track or enforce the 40% manual work vs. 60% agentic work split. This might involve integrating with IDE telemetry or requiring students to submit their AI prompt logs alongside their manual commits.

### 3. Multimedia Submissions (The Pitch)
*   **Video/Audio Uploads:** The curriculum heavily emphasizes rhetoric and sales (e.g., the 60-second elevator pitch for the NYC Meetup Strategy). The platform must support seamless uploading, hosting, and grading of video/audio pitches.

### 4. The Studio Ordo "Guild" Integration
*   **Role/Status Badging:** As students progress through the 90 days and transition into Studio Ordo Associates, the platform should reflect this status change visually (e.g., moving from "Apprentice" to "Associate").
*   **Portfolio/Manifesto Hosting:** The final Capstone project (The Manifesto) needs a public-facing or semi-public portfolio view that students can share at meetups or with potential clients.

### 5. Curriculum Timeline Adjustments
*   **90-Day Pacing:** The current LMS UI (specifically the `/studio` page and progress trackers) needs to be updated to reflect a 12-week, high-intensity sprint rather than an 18-month apprenticeship.