# Sprint 6: Feature Gating & Intake Polish

## Use Case
As a system administrator, I need to enforce Role-Based Access Control (RBAC) across the platform and ensure that client intake forms are validated correctly, so that only authorized users can access specialized features and data integrity is maintained.

## Personas Addressed
- **System Administrator**: Needs to ensure that only approved affiliates and apprentices can access their respective dashboards and public directories.
- **Prospective Client**: Needs a reliable intake form that validates their request correctly.

## Acceptance Criteria
1.  Access to affiliate-specific features (e.g., `/affiliate/dashboard`) is restricted to users with the `AFFILIATE` role.
2.  The public `/apprentices` directory only queries and displays users with the `APPRENTICE` role.
3.  The client intake form (`/services/request`) properly aligns with the backend `createIntakeSchema` using shared Zod schemas.
4.  Playwright E2E tests cover the complete application and approval lifecycle.

## TDD Plan

### 1. Affiliate Feature Gating
- **Test (Negative)**: User with only the `USER` role attempts to access `/affiliate/dashboard`; they are redirected to `/dashboard` or receive a 403 Forbidden.
- **Test (Positive)**: User with the `AFFILIATE` role accesses `/affiliate/dashboard`; they see their referral links and stats.
- **Implementation**: Update the route handler or middleware for `/affiliate/dashboard` to check for the `AFFILIATE` role in the user's session.

### 2. Apprentice Directory Filtering
- **Test (Negative)**: A user with the `USER` role is not listed in the `/apprentices` directory.
- **Test (Positive)**: A user with the `APPRENTICE` role is listed in the `/apprentices` directory.
- **Implementation**: Update the database query in the `/apprentices` page component to filter users by the `APPRENTICE` role.

### 3. Client Intake Form Validation
- **Test (Negative)**: User submits the intake form with an `ORGANIZATION` audience but missing `organizationName`; validation errors are displayed.
- **Test (Negative)**: User submits the intake form with an `ORGANIZATION` audience but missing `timeline`; validation errors are displayed.
- **Test (Positive)**: User submits a valid intake form; the API returns 201 Created, and the user is redirected to a success page.
- **Implementation**: Refactor the frontend form in `src/app/(public)/services/request/page.tsx` to use the shared `createIntakeSchema` from `src/lib/api/schemas.ts` for client-side validation, ensuring it matches the backend requirements.

### 4. Playwright E2E Tests
- **Test (Positive)**: A user registers with `?role=affiliate`, completes the application form, an admin approves the request, and the user can access `/affiliate/dashboard`.
- **Test (Positive)**: A user registers with `?role=apprentice`, completes the application form, an admin approves the request, and the user is listed in the `/apprentices` directory.
- **Test (Negative)**: A user registers with `?role=affiliate`, completes the application form, an admin rejects the request, and the user cannot access `/affiliate/dashboard`.
- **Implementation**: Write Playwright tests that simulate the entire lifecycle, from registration to application, admin approval/rejection, and feature access.