# Sprint 10: Admin Shell & RBAC Polish

## Use Case
As a system administrator, I want the admin experience to be seamless, secure, and context-aware, so that I can efficiently manage users, roles, and platform settings without encountering "Access Denied" dead ends or confusing navigation.

## Personas Addressed
- **System Administrator**: Needs a reliable, secure, and intuitive interface to manage the platform.

## Acceptance Criteria
1.  All admin routes (`/admin/*`) strictly check for the `admin` HAL link or the `ADMIN`/`SUPER_ADMIN` role before rendering content.
2.  The Admin Shell layout is refactored to match the new Information Architecture (IA) and provides clear context.
3.  Breadcrumbs and contextual headers are added to all admin pages to improve navigation and orientation.
4.  Unauthorized access attempts are gracefully handled with a clear error message or redirect.

## TDD Plan

### 1. Audit Admin Routes for RBAC
- **Test (Negative)**: A user with only the `USER` role attempts to access `/admin/users`; they are redirected to `/dashboard` or receive a 403 Forbidden error.
- **Test (Positive)**: A user with the `ADMIN` role accesses `/admin/users`; the page renders successfully.
- **Implementation**: Review all page components under `src/app/admin/` and ensure they use a consistent authorization check (e.g., a higher-order component, middleware, or a shared hook that verifies the `admin` HAL link or role).

### 2. Refactor Admin Shell Layout
- **Test (Positive)**: The Admin Shell layout (`src/app/admin/layout.tsx`) includes a dedicated sidebar or top navigation bar specifically for admin tools, distinct from the public/user navigation.
- **Test (Positive)**: The layout structure aligns with the new IA defined in Sprint 5, organizing tools logically (e.g., "Users & Roles", "Content Management", "Settings").
- **Implementation**: Update the `AdminShell` component to use the redesigned `MenuNav` and structure the layout to provide a focused workspace for administrative tasks.

### 3. Add Breadcrumbs and Contextual Headers
- **Test (Positive)**: Navigating to `/admin/users/[id]` displays a breadcrumb trail like "Admin > Users > [User Name]".
- **Test (Positive)**: Each admin page has a clear, descriptive `<h1>` header indicating the current context (e.g., "Manage User: Jane Doe").
- **Implementation**: Create a reusable `Breadcrumbs` component and integrate it into the `AdminShell` or individual admin page components. Ensure page titles are dynamic and context-aware.

### 4. Graceful Error Handling for Unauthorized Access
- **Test (Negative)**: If an admin's session expires while they are on an admin page, any subsequent API request or navigation attempt gracefully redirects them to the login page with a "Session expired" message.
- **Test (Negative)**: If a user attempts to access an admin route they don't have permission for, they see a custom "Access Denied" page instead of a generic 404 or a broken UI.
- **Implementation**: Implement a global error boundary or update the authorization logic to render a specific `ProblemDetailsPanel` or redirect to a custom error page when access is denied.