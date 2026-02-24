# Sprint 15: Automated Onboarding

## Use Case
As a new user or client, I need a guided, zero-touch onboarding experience so that I can quickly understand the platform's value and complete necessary setup steps without manual intervention.

## Personas Addressed
- **New User**: Needs clear guidance on how to navigate the platform and complete their profile.
- **New Client**: Needs a streamlined process to submit intake forms and access their project dashboard.

## Acceptance Criteria
1.  A new user is automatically redirected to an interactive onboarding checklist upon first login.
2.  The onboarding checklist updates in real-time using Server-Sent Events (SSE) as the user completes tasks.
3.  Automated welcome sequences (emails/notifications) are triggered based on onboarding progress.
4.  Role provisioning (e.g., granting `CLIENT` status) is automated upon completion of specific onboarding milestones.

## TDD Plan

### 1. Interactive Onboarding Checklist
- **Test (Negative)**: A returning user who has already completed onboarding does not see the checklist.
- **Test (Positive)**: A new user sees the onboarding checklist with tasks relevant to their initial role.
- **Implementation**: Create an `OnboardingChecklist` component and a corresponding `onboarding_progress` database table (with SQLite migrations) to track user progress.

### 2. Real-Time UI Updates (SSE)
- **Test (Negative)**: If the SSE connection drops, the UI falls back to polling or manual refresh without crashing.
- **Test (Positive)**: When a user completes a task (e.g., verifying their email), the checklist updates instantly without a page reload.
- **Implementation**: Implement an SSE endpoint (`GET /api/v1/onboarding/stream`) and integrate it with the frontend checklist component.

### 3. Automated Welcome Sequences
- **Test (Negative)**: A user who opts out of marketing emails does not receive non-essential welcome emails.
- **Test (Positive)**: A user receives a welcome email immediately upon registration and follow-up emails based on their onboarding progress.
- **Implementation**: Integrate the email service with the onboarding progress tracker to trigger automated sequences.

### 4. Automated Role Provisioning
- **Test (Negative)**: A user who fails to complete required intake forms is not granted the `CLIENT` role.
- **Test (Positive)**: A user who successfully completes the client intake form and signs the agreement is automatically granted the `CLIENT` role.
- **Implementation**: Update the intake submission handler to automatically update the user's role upon successful completion.
### 5. E2E Testing
- **Test (Negative)**: A user cannot bypass required onboarding steps by manually navigating to protected routes.
- **Test (Positive)**: A complete end-to-end flow from registration to onboarding completion and role assignment succeeds.
- **Implementation**: Write Playwright tests covering the onboarding checklist, SSE updates, and role provisioning.
