# Sprint 37: CRM Foundation — QA Checklist

## Database
- [ ] Migration 038 applied
- [ ] `contacts` table exists with correct columns
- [ ] `intake_requests` has `contact_id` column

## Contact Creation
- [ ] `POST /api/v1/intake` creates a contact record
- [ ] Submitting same email twice does NOT create duplicate contact
- [ ] Referral conversion creates contact if none exists for email

## CRM API
- [ ] `GET /api/v1/crm/contacts` returns 401 without staff session
- [ ] `GET /api/v1/crm/contacts?status=LEAD` filters correctly
- [ ] `PATCH /api/v1/crm/contacts/:id` updates status and notes
- [ ] Invalid status transition returns 422
- [ ] `GET /api/v1/crm/pipeline` returns correct bucket counts

## UI
- [ ] `/admin/crm` renders pipeline columns
- [ ] Contact cards show source badge and assigned staff
- [ ] Contact detail shows linked intake records

## Navigation
- [ ] Primary nav has no login or register link
- [ ] Footer contains [Login] and [Staff access] links

## Tests
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` exits 0
