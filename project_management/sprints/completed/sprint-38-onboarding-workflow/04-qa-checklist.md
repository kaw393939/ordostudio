# Sprint 38: Onboarding Workflow — QA Checklist

## Database
- [ ] Migration 039 applied
- [ ] `onboarding_tasks` table exists with 5 seed rows
- [ ] `onboarding_progress` table exists

## Provisioning
- [ ] `POST /api/v1/crm/contacts/:id/provision` creates user record
- [ ] Provision is idempotent — calling twice returns 409 with existing user_id
- [ ] `contacts.status` moves to ONBOARDING after provision
- [ ] `onboarding_progress` rows created for correct role tasks
- [ ] Welcome email dispatched with login URL

## Onboarding API
- [ ] `GET /api/v1/onboarding` returns 401 without auth
- [ ] `GET /api/v1/onboarding` returns only tasks for user's role
- [ ] `POST /api/v1/onboarding/complete/profile.complete` marks task complete
- [ ] Completing all required tasks fires `onboarding.completed` feed event
- [ ] `contacts.status` advances to ACTIVE after all required tasks complete

## Dashboard Widget
- [ ] Onboarding checklist renders above ActionFeed for incomplete users
- [ ] Completed tasks show strike-through
- [ ] Widget absent for users with no onboarding tasks

## Staff CRM
- [ ] "Approve & Create Account" button visible for QUALIFIED contacts
- [ ] Button absent for non-QUALIFIED contacts

## Tests
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` exits 0
