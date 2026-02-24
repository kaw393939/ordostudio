# Sprint 4: Frontend Application Flows

## Use Case
As a prospective affiliate or apprentice, I want to apply for an elevated role during or after registration, so that I can access specialized features or be listed in the public directory.

## Personas Addressed
- **Prospective Affiliate**: Needs a clear path to apply for the affiliate program.
- **Prospective Apprentice**: Needs a clear path to apply for the apprentice program.
- **Existing User**: Needs a way to apply for a role from their dashboard.

## Acceptance Criteria
1.  The `/register` page handles the `?role=` query parameter by redirecting to the appropriate application page (e.g., `/apply/affiliate`) after successful signup.
2.  An Affiliate Application form (`/apply/affiliate`) exists, collects necessary context (e.g., website, audience size), and submits to `POST /api/v1/roles/request`.
3.  An Apprentice Application form (`/apply/apprentice`) exists, collects necessary context (e.g., portfolio link, experience), and submits to `POST /api/v1/roles/request`.
4.  The user dashboard (`/dashboard`) displays the status of any pending role requests.

## TDD Plan

### 1. `/register` Redirect Logic
- **Test (Negative)**: User registers without a `?role=` parameter; they are redirected to `/dashboard`.
- **Test (Positive)**: User registers with `?role=affiliate`; they are redirected to `/apply/affiliate`.
- **Test (Positive)**: User registers with `?role=apprentice`; they are redirected to `/apply/apprentice`.
- **Implementation**: Update the `onSubmit` handler in `src/app/(public)/register/page.tsx` to check the URL search params and conditionally route the user.

### 2. Affiliate Application Form (`/apply/affiliate`)
- **Test (Negative)**: Unauthenticated user attempts to access the page; they are redirected to `/login?returnTo=/apply/affiliate`.
- **Test (Negative)**: User submits the form with missing required fields (e.g., website URL); validation errors are displayed.
- **Test (Positive)**: User submits a valid form; the API returns 201 Created, and the user is redirected to `/dashboard` with a success message.
- **Implementation**: Create a new page component, a Zod schema for the application context, and a form component that submits to the new API endpoint.

### 3. Apprentice Application Form (`/apply/apprentice`)
- **Test (Negative)**: Unauthenticated user attempts to access the page; they are redirected to `/login?returnTo=/apply/apprentice`.
- **Test (Negative)**: User submits the form with missing required fields (e.g., portfolio link); validation errors are displayed.
- **Test (Positive)**: User submits a valid form; the API returns 201 Created, and the user is redirected to `/dashboard` with a success message.
- **Implementation**: Create a new page component, a Zod schema for the application context, and a form component that submits to the new API endpoint.

### 4. Dashboard Status Display
- **Test (Negative)**: User has no pending role requests; the dashboard does not display any application status section.
- **Test (Positive)**: User has a `PENDING` request for `AFFILIATE`; the dashboard displays a "Pending Affiliate Application" banner.
- **Test (Positive)**: User has an `APPROVED` request for `APPRENTICE`; the dashboard displays a "Welcome, Apprentice!" banner and a link to their profile settings.
- **Implementation**: Update the `Dashboard` component to fetch the user's role requests and conditionally render status banners based on the data.