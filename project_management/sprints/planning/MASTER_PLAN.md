# Studio Ordo Master Plan: UI/UX, IA, and System Polish

## Executive Summary
The backend and core operations of Studio Ordo are solid, but the frontend user experience, information architecture (IA), and role-based access control (RBAC) navigation need significant refinement. The current UI suffers from layout shifts, poor responsiveness, and a fragmented dashboard experience. This master plan outlines a comprehensive strategy to transform the platform into a cohesive, action-oriented, and visually stunning experience.

## Core Objectives
1. **Information Architecture (IA) Overhaul**: Restructure the left-hand menu and global navigation to be intuitive, role-aware, and context-sensitive.
2. **Dashboard Refactor**: Transition the dashboard from a static, tab-heavy interface into a dynamic, unified "Feed of Action" that prioritizes immediate tasks and upcoming events.
3. **UI/UX Polish**: Fix layout shifts (e.g., the "jumping to bottom" bug), optimize image loading, and ensure pixel-perfect responsiveness across all devices.
4. **Security & RBAC**: Ensure all navigation elements strictly adhere to the user's HAL links, preventing "Access Denied" dead ends.

## The 10 High-Impact Sprints

### Sprint 1: Navigation & Focus Management Fixes
- **Goal**: Eliminate the "jumping to bottom" bug and stabilize route transitions.
- **Tasks**:
  - Remove `tabIndex={-1}` from `<main id="main-content">` in `PageShell` if it conflicts with Next.js App Router focus management.
  - Audit all `MenuNav` and `Link` components for proper `scroll` behavior.
  - Ensure `autoFocus` is only used in modals/dialogs, never on page load.

### Sprint 2: Studio Page Redesign (Completed)
- **Goal**: Transform the Studio page into a responsive, high-converting landing page.
- **Tasks**:
  - Replace massive hardcoded images with optimized `next/image` components using `priority` and proper aspect ratios.
  - Redesign the layout to use a CSS grid with a sticky sidebar for events.
  - Improve typography and spacing to match the brand guide.

### Sprint 3: Dashboard "Action Feed" Refactor (Part 1 - Data Aggregation)
- **Goal**: Prepare the dashboard data layer for a unified feed.
- **Tasks**:
  - Aggregate `AccountRegistration`, `EngagementTimelineItem`, and `FollowUpAction` into a single chronological data stream.
  - Create a unified `FeedItem` type.
  - Implement sorting and filtering logic for the feed.

### Sprint 4: Dashboard "Action Feed" Refactor (Part 2 - UI Implementation)
- **Goal**: Replace the tabbed dashboard with the new Action Feed UI.
- **Tasks**:
  - Build the `ActionFeed` component.
  - Design distinct UI cards for different feed item types (e.g., "Upcoming Event", "Action Required", "Reminder").
  - Implement infinite scroll or pagination for the feed.

### Sprint 5: Left-Hand Menu & IA Restructuring
- **Goal**: Refactor the global navigation to be intuitive and role-aware.
- **Tasks**:
  - Update `menu-registry.ts` to reflect the new IA.
  - Redesign the `MenuNav` component for the sidebar/left-hand menu.
  - Ensure active states and nested routes are visually clear.

### Sprint 6: Admin Shell & RBAC Polish
- **Goal**: Ensure the admin experience is seamless and secure.
- **Tasks**:
  - Audit all admin routes to ensure they check for the `admin` HAL link.
  - Refactor the Admin Shell layout to match the new IA.
  - Add breadcrumbs and contextual headers to all admin pages.

### Sprint 7: Responsive Design Audit & Fixes
- **Goal**: Ensure the entire platform looks great on mobile and tablet.
- **Tasks**:
  - Audit all major pages (Dashboard, Studio, Events, Admin) on mobile viewports.
  - Fix overflowing tables, broken grids, and touch targets.
  - Optimize the mobile navigation drawer/hamburger menu.

### Sprint 8: Performance & Core Web Vitals
- **Goal**: Improve page load speeds and eliminate layout shifts.
- **Tasks**:
  - Run Lighthouse audits on all public pages.
  - Implement dynamic imports for heavy components.
  - Optimize fonts and third-party scripts.

### Sprint 9: Empty States & Error Handling
- **Goal**: Provide a graceful experience when things go wrong or data is missing.
- **Tasks**:
  - Design and implement custom `EmptyState` components for the Action Feed, Events, and Admin tables.
  - Refactor `ProblemDetailsPanel` to be more user-friendly.
  - Add skeleton loaders for all async data fetching.

### Sprint 10: Final Polish & E2E Testing
- **Goal**: Lock in the changes and prevent regressions.
- **Tasks**:
  - Write Playwright E2E tests for the new Action Feed and Navigation.
  - Conduct a final visual QA pass against the Figma/Brand guidelines.
  - Update documentation and release notes.
