# Sprint 3: Role Definitions & Core API Updates

## Use Case
As a system administrator, I need the database and API infrastructure to support new roles (`AFFILIATE`, `APPRENTICE`) and a mechanism to track users applying for these roles, so that I can manage access to specialized features and public directories.

## Personas Addressed
- **System Administrator**: Needs a reliable backend to store and retrieve role requests.
- **Prospective Affiliate/Apprentice**: Needs an API endpoint to submit their application data securely.

## Acceptance Criteria
1.  The `roles` table contains `AFFILIATE` and `APPRENTICE` records.
2.  A `role_requests` table exists with columns: `id`, `user_id`, `requested_role_id`, `status` (PENDING, APPROVED, REJECTED), `context` (JSON), `created_at`, `updated_at`.
3.  `POST /api/v1/roles/request` accepts a valid JSON payload, creates a `PENDING` record in `role_requests`, and returns a 201 Created response.
4.  `GET /api/v1/admin/role-requests` returns a paginated list of role requests, accessible only to users with the `ADMIN` or `SUPER_ADMIN` role.
5.  `PATCH /api/v1/admin/role-requests/[id]` allows an admin to update the `status` of a request to `APPROVED` or `REJECTED`.

## TDD Plan

### 1. Database Migrations
- **Test (Negative)**: Attempting to insert a `role_request` with an invalid `requested_role_id` should fail a foreign key constraint.
- **Test (Positive)**: Inserting a valid `role_request` with JSON context should succeed and set `status` to `PENDING` by default.
- **Implementation**: Create a new SQLite migration file to insert the new roles and create the `role_requests` table.

### 2. `POST /api/v1/roles/request`
- **Test (Negative)**: Unauthenticated request returns 401 Unauthorized.
- **Test (Negative)**: Request with missing or invalid `requested_role_id` returns 400 Bad Request.
- **Test (Negative)**: User already has a `PENDING` request for the same role returns 409 Conflict.
- **Test (Positive)**: Authenticated user submits valid context; returns 201 Created with the new request ID.
- **Implementation**: Create the route handler, Zod schema for validation, and database insertion logic.

### 3. `GET /api/v1/admin/role-requests`
- **Test (Negative)**: Request by a user with only the `USER` role returns 403 Forbidden.
- **Test (Positive)**: Request by an `ADMIN` returns a 200 OK with a list of requests, including user email and requested role name.
- **Implementation**: Create the route handler, ensuring RBAC checks are in place, and write the SQL query to join `role_requests`, `users`, and `roles`.

### 4. `PATCH /api/v1/admin/role-requests/[id]`
- **Test (Negative)**: Request by a non-admin returns 403 Forbidden.
- **Test (Negative)**: Updating a request that doesn't exist returns 404 Not Found.
- **Test (Negative)**: Updating with an invalid status (e.g., `MAYBE`) returns 400 Bad Request.
- **Test (Positive)**: Admin updates status to `APPROVED`; returns 200 OK. The user should now have the requested role in the `user_roles` table.
- **Test (Positive)**: Admin updates status to `REJECTED`; returns 200 OK. The user's roles remain unchanged.
- **Implementation**: Create the route handler, validate the status transition, update the `role_requests` table, and conditionally insert into `user_roles` if approved.