# Studio Ordo Master Plan: UI/UX, IA, and System Polish

## Executive Summary
The backend and core operations of Studio Ordo are solid, but the frontend user experience, information architecture (IA), and role-based access control (RBAC) navigation need significant refinement. The current UI suffers from layout shifts, poor responsiveness, and a fragmented dashboard experience. Furthermore, the system lacks the foundational data models to support specialized user roles (Affiliates, Apprentices). 

This master plan outlines a comprehensive, optimized strategy to transform the platform. By adopting a "Backend First" approach, we will establish the necessary Role-Based Access Control (RBAC) infrastructure before building the UI that relies on it. This ensures a cohesive, action-oriented, and visually stunning experience without development bottlenecks.

## Core Objectives
1. **Identity & Access Management (RBAC)**: Establish the database schema, API endpoints, and admin approval workflows for specialized roles (`AFFILIATE`, `APPRENTICE`) before building role-aware UI.
2. **Information Architecture (IA) Overhaul**: Restructure the left-hand menu and global navigation to be intuitive, role-aware, and context-sensitive based on the new RBAC foundation.
3. **Dashboard Refactor**: Transition the dashboard from a static, tab-heavy interface into a dynamic, unified "Feed of Action" that prioritizes immediate tasks and upcoming events for specific roles.
4. **UI/UX Polish**: Fix layout shifts (e.g., the "jumping to bottom" bug), optimize image loading, and ensure pixel-perfect responsiveness across all devices.

## The 18 High-Impact Sprints (Optimized Sequence)

### Phase 1: Critical Fixes & Foundation
*Immediate value and bug fixes to stabilize the current experience.*

#### Sprint 1: Navigation & Focus Management Fixes
- **Goal**: Eliminate the "jumping to bottom" bug and stabilize route transitions.
- **Tasks**:
  - Remove `tabIndex={-1}` from `<main id="main-content">` in `PageShell` if it conflicts with Next.js App Router focus management.
  - Audit all `MenuNav` and `Link` components for proper `scroll` behavior.
  - Ensure `autoFocus` is only used in modals/dialogs, never on page load.

#### Sprint 2: Studio Page Redesign (Completed)
- **Goal**: Transform the Studio page into a responsive, high-converting landing page.
- **Tasks**:
  - Replace massive hardcoded images with optimized `next/image` components using `priority` and proper aspect ratios.
  - Redesign the layout to use a CSS grid with a sticky sidebar for events.
  - Improve typography and spacing to match the brand guide.

### Phase 2: Identity & Access Management (RBAC)
*Building the backend data models and application flows for new roles so the UI has data to consume.*

#### Sprint 3: Role Definitions & Core API Updates
- **Goal**: Establish the database schema and API foundation for role applications and approvals.
- **Tasks**:
  - Add `AFFILIATE` and `APPRENTICE` to the `roles` table.
  - Create the `role_requests` table and corresponding SQLite migrations.
  - Create API endpoints for submitting role requests (`POST /api/v1/roles/request`).
  - Create API endpoints for admins to list and update role requests (`GET /api/v1/admin/role-requests`, `PATCH /api/v1/admin/role-requests/[id]`).

#### Sprint 4: Frontend Application Flows
- **Goal**: Enable users to apply for elevated roles during or after registration.
- **Tasks**:
  - Update `/register` to handle the `?role=` parameter by redirecting to the appropriate application page after successful signup.
  - Build the Affiliate Application form (`/apply/affiliate`).
  - Build the Apprentice Application form (`/apply/apprentice`).
  - Update the user dashboard (`/dashboard`) to show the status of pending role requests.

#### Sprint 5: Admin Approval UI
- **Goal**: Provide admins with a dedicated interface to review and manage role requests.
- **Tasks**:
  - Build the Admin Approvals view (`/admin/approvals`).
  - Implement the UI for reviewing application context.
  - Implement the Approve/Reject buttons and wire them to the API.
  - Add email notifications for approval/rejection events.

#### Sprint 6: Feature Gating & Intake Polish
- **Goal**: Enforce RBAC across the platform and fix intake form validation.
- **Tasks**:
  - Restrict access to affiliate-specific features based on the `AFFILIATE` role.
  - Update the public `/apprentices` directory to only query and display users with the `APPRENTICE` role.
  - Fix the client intake form (`/services/request`) to properly align with the backend `createIntakeSchema` using shared Zod schemas.
  - Add Playwright E2E tests for the complete application and approval lifecycle.

### Phase 3: Dashboard & Information Architecture
*Now that roles exist, we can build role-aware dashboards and navigation.*

#### Sprint 7: Dashboard "Action Feed" Refactor (Part 1 - Data Aggregation)
- **Goal**: Prepare the dashboard data layer for a unified feed.
- **Tasks**:
  - Aggregate `AccountRegistration`, `EngagementTimelineItem`, and `FollowUpAction` into a single chronological data stream.
  - Create a unified `FeedItem` type.
  - Implement sorting and filtering logic for the feed.

#### Sprint 8: Dashboard "Action Feed" Refactor (Part 2 - UI Implementation)
- **Goal**: Replace the tabbed dashboard with the new Action Feed UI.
- **Tasks**:
  - Build the `ActionFeed` component.
  - Design distinct UI cards for different feed item types (e.g., "Upcoming Event", "Action Required", "Reminder").
  - Implement infinite scroll or pagination for the feed.

#### Sprint 9: Left-Hand Menu & IA Restructuring
- **Goal**: Refactor the global navigation to be intuitive and role-aware.
- **Tasks**:
  - Update `menu-registry.ts` to reflect the new IA.
  - Redesign the `MenuNav` component for the sidebar/left-hand menu.
  - Ensure active states and nested routes are visually clear.

#### Sprint 10: Admin Shell & RBAC Polish
- **Goal**: Ensure the admin experience is seamless and secure.
- **Tasks**:
  - Audit all admin routes to ensure they check for the `admin` HAL link.
  - Refactor the Admin Shell layout to match the new IA.
  - Add breadcrumbs and contextual headers to all admin pages.

### Phase 4: Core Platform Quality & Polish
*Ensuring the foundational architecture is fast, responsive, and bug-free before scaling.*

#### Sprint 11: Responsive Design Audit & Fixes
- **Goal**: Ensure the entire platform looks great on mobile and tablet.
- **Tasks**:
  - Audit all major pages (Dashboard, Studio, Events, Admin) on mobile viewports.
  - Fix overflowing tables, broken grids, and touch targets.
  - Optimize the mobile navigation drawer/hamburger menu.

#### Sprint 12: Empty States & Error Handling
- **Goal**: Provide a graceful experience when things go wrong or data is missing.
- **Tasks**:
  - Design and implement custom `EmptyState` components for the Action Feed, Events, and Admin tables.
  - Refactor `ProblemDetailsPanel` to be more user-friendly.
  - Add skeleton loaders for all async data fetching.

#### Sprint 13: Performance & Core Web Vitals
- **Goal**: Improve page load speeds and eliminate layout shifts.
- **Tasks**:
  - Run Lighthouse audits on all public pages.
  - Implement dynamic imports for heavy components.
  - Optimize fonts and third-party scripts.

#### Sprint 14: Core Platform E2E Testing
- **Goal**: Lock in the core changes and prevent regressions before adding Phase 5 features.
- **Tasks**:
  - Write Playwright E2E tests for the new Action Feed and Navigation.
  - Conduct a visual QA pass against the Figma/Brand guidelines.
  - Update documentation and release notes for the core platform.

### Phase 5: Monetization & Automation
*Scaling the platform with self-serve billing, real-time telemetry, and AI-driven operations.*

#### Sprint 15: Automated Onboarding
- **Goal**: Implement zero-touch onboarding for new users and clients.
- **Tasks**:
  - Create `onboarding_progress` table and corresponding SQLite migrations.
  - Build automated welcome sequences and interactive checklists.
  - Integrate Server-Sent Events (SSE) for real-time UI updates during onboarding.
  - Automate role provisioning based on onboarding completion.
  - Write Playwright E2E tests for the onboarding flow.

#### Sprint 16: Real-Time Telemetry
- **Goal**: Integrate business telemetry to track user journeys and feature usage.
- **Tasks**:
  - Integrate PostHog for product analytics and session recording.
  - Set up custom events for key actions (e.g., role applications, intake submissions).
  - Build an internal dashboard for monitoring platform health and user engagement.
  - Write Playwright E2E tests for telemetry dashboard access and event firing.

#### Sprint 17: Billing Integration
- **Goal**: Enable self-serve monetization and subscription management.
- **Tasks**:
  - Create `subscriptions` table and SQLite migrations to store Stripe customer IDs and plan status.
  - Integrate Stripe for payment processing and subscription management.
  - Build a billing portal for users to manage their payment methods and invoices.
  - Implement webhook handlers for subscription lifecycle events.
  - Write Playwright E2E tests for the billing portal and webhook simulation.

#### Sprint 18: Agent Ops Triage
- **Goal**: Automate client intake and support using AI agents.
- **Tasks**:
  - Create `triage_tickets` table and SQLite migrations to store AI summaries and confidence scores.
  - Integrate LLMs to automatically triage and categorize incoming client requests.
  - Build an Agent Ops dashboard for admins to review AI-generated summaries and recommendations.
  - Implement automated email responses based on AI triage results.
  - Write Playwright E2E tests for the Agent Ops dashboard and triage flow.
