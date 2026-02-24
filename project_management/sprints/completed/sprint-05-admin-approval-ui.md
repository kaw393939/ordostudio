# Sprint 5: Admin Approval UI

## Use Case
As a system administrator, I need a dedicated interface to review and manage role requests, so that I can approve or reject applications for elevated roles like `AFFILIATE` and `APPRENTICE`.

## Personas Addressed
- **System Administrator**: Needs a clear, organized view of pending role requests and the ability to review application context before making a decision.

## Acceptance Criteria
1.  An Admin Approvals view (`/admin/approvals`) exists and is accessible only to users with the `ADMIN` or `SUPER_ADMIN` role.
2.  The view displays a paginated list of pending role requests, including the user's email, requested role, and application context.
3.  Admins can click "Approve" or "Reject" on a request, which updates the status via `PATCH /api/v1/admin/role-requests/[id]`.
4.  Email notifications are sent to the user upon approval or rejection.

## TDD Plan

### 1. Admin Approvals View (`/admin/approvals`)
- **Test (Negative)**: User with only the `USER` role attempts to access the page; they are redirected to `/dashboard` or receive a 403 Forbidden.
- **Test (Positive)**: Admin accesses the page; they see a list of pending role requests fetched from `GET /api/v1/admin/role-requests`.
- **Implementation**: Create a new page component under `src/app/admin/approvals/page.tsx`, ensuring RBAC checks are in place, and fetch the data using the new API endpoint.

### 2. Review Application Context UI
- **Test (Negative)**: A request with missing or malformed JSON context displays a fallback message instead of crashing the UI.
- **Test (Positive)**: A request with valid JSON context displays the data in a readable format (e.g., a key-value list or a modal).
- **Implementation**: Create a component to render the `context` JSON field from the `role_requests` table, handling potential parsing errors gracefully.

### 3. Approve/Reject Actions
- **Test (Negative)**: Admin clicks "Approve" on a request that has already been approved; the API returns 400 Bad Request, and an error message is displayed.
- **Test (Positive)**: Admin clicks "Approve" on a pending request; the API returns 200 OK, the request status updates to `APPROVED`, and the user is granted the requested role.
- **Test (Positive)**: Admin clicks "Reject" on a pending request; the API returns 200 OK, the request status updates to `REJECTED`, and the user's roles remain unchanged.
- **Implementation**: Create buttons for "Approve" and "Reject" that trigger a `PATCH` request to the API, updating the UI optimistically or refetching the data upon success.

### 4. Email Notifications
- **Test (Negative)**: If the email service fails to send the notification, the API still returns 200 OK (the approval/rejection should not fail due to an email error), but an error is logged.
- **Test (Positive)**: Upon successful approval, an email is sent to the user notifying them of their new role and providing next steps.
- **Test (Positive)**: Upon successful rejection, an email is sent to the user notifying them of the decision.
- **Implementation**: Integrate the existing email service (`resolveTransactionalEmailPort`) into the `PATCH /api/v1/admin/role-requests/[id]` route handler to send notifications based on the updated status.