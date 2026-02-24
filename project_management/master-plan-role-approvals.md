# Master Plan: System Management & Role Approvals

## Current State & Gaps Identified

Through automated E2E testing with Playwright, we've identified several critical gaps in the system management and role approval workflows:

1.  **Missing Role-Specific Registration Flows:**
    *   The `/register` page currently accepts a `?role=` query parameter (e.g., `?role=affiliate`, `?role=apprentice`), but this parameter is completely ignored by the frontend form and the backend API (`/api/v1/auth/register`).
    *   All new users are hardcoded to receive the `USER` role upon registration.
    *   There is no mechanism to request or apply for elevated roles (like `AFFILIATE` or `APPRENTICE`) during or after registration.

2.  **Lack of Approval Workflows:**
    *   Affiliates and Apprentices require approval before they can access specific features or be listed publicly.
    *   Currently, there is no "pending approval" state for these roles.
    *   The admin dashboard (`/admin/users`) exists but lacks the UI and backend support to review, approve, or reject role requests.

3.  **Intake Request Validation Issues:**
    *   The client intake form (`/services/request`) was failing with a 400 Bad Request due to strict backend validation rules (e.g., requiring `constraints` and `timeline` for non-individual audiences) that were not enforced or collected by the frontend form. This has been temporarily patched but needs a robust, schema-driven solution.

4.  **Missing Roles in Database:**
    *   The `roles` table only contains `USER`, `ADMIN`, and `SUPER_ADMIN`.
    *   The `AFFILIATE` and `APPRENTICE` roles do not exist in the database schema.

## Proposed Architecture & Workflows

### 1. Role Definitions & Schema Updates
*   **Add New Roles:** Insert `AFFILIATE` and `APPRENTICE` into the `roles` table.
*   **Role Requests Table:** Create a new table `role_requests` to track users applying for specific roles.
    *   Columns: `id`, `user_id`, `requested_role_id`, `status` (PENDING, APPROVED, REJECTED), `context` (JSON for application details), `created_at`, `updated_at`.

### 2. Registration & Application Flow
*   **Public Users (Anonymous):** Can browse public pages, view events, and submit intake requests.
*   **Standard Registration:** Users sign up via `/register` and receive the `USER` role.
*   **Role Application:**
    *   If a user navigates to `/register?role=affiliate`, they are prompted to create a standard account first.
    *   Upon successful registration (or if already logged in), they are redirected to a specific application form (e.g., `/apply/affiliate`).
    *   This form collects necessary context (e.g., website, audience size) and submits a record to `role_requests`.

### 3. Admin Approval Workflow
*   **Admin Dashboard (`/admin/approvals`):**
    *   Create a new view for admins to see pending `role_requests`.
    *   Admins can review the application context and click "Approve" or "Reject".
*   **Approval Action:**
    *   Updates the `role_requests` status.
    *   If approved, inserts a record into `user_roles` linking the user to the requested role.
    *   Triggers an email notification to the user.

### 4. Role-Based Access Control (RBAC) Enforcement
*   **Affiliate Dashboard (`/affiliate/dashboard`):** Only accessible to users with the `AFFILIATE` role. Shows referral links and stats.
*   **Apprentice Profile (`/apprentices/[id]`):** Only users with the `APPRENTICE` role are listed on the public directory.

## Implementation Sprints

### Sprint 1: Database & Core API Updates
*   [ ] Add `AFFILIATE` and `APPRENTICE` to the `roles` table.
*   [ ] Create the `role_requests` table and corresponding SQLite migrations.
*   [ ] Create API endpoints for submitting role requests (`POST /api/v1/roles/request`).
*   [ ] Create API endpoints for admins to list and update role requests (`GET /api/v1/admin/role-requests`, `PATCH /api/v1/admin/role-requests/[id]`).

### Sprint 2: Frontend Application Flows
*   [ ] Update `/register` to handle the `?role=` parameter by redirecting to the appropriate application page after successful signup.
*   [ ] Build the Affiliate Application form (`/apply/affiliate`).
*   [ ] Build the Apprentice Application form (`/apply/apprentice`).
*   [ ] Update the user dashboard (`/dashboard`) to show the status of pending role requests.

### Sprint 3: Admin Approval UI
*   [ ] Build the Admin Approvals view (`/admin/approvals`).
*   [ ] Implement the UI for reviewing application context.
*   [ ] Implement the Approve/Reject buttons and wire them to the API.
*   [ ] Add email notifications for approval/rejection events.

### Sprint 4: Feature Gating & Polish
*   [ ] Restrict access to affiliate-specific features based on the `AFFILIATE` role.
*   [ ] Update the public `/apprentices` directory to only query and display users with the `APPRENTICE` role.
*   [ ] Fix the client intake form (`/services/request`) to properly align with the backend `createIntakeSchema` using shared Zod schemas.
*   [ ] Add Playwright E2E tests for the complete application and approval lifecycle.