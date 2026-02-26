# Sprint 37: CRM Foundation — Specification

## Overview
Separates prospects from authenticated users. Adds `contacts` table with lifecycle, staff CRM views, and moves login/register to the footer.

## Scope

### In scope
- Migration 038: `contacts` table + `contact_id` column on `intake_requests`
- Contact creation/upsert in all intake paths (agent, form, referral)
- `GET/PATCH /api/v1/crm/contacts` — staff CRUD
- `GET /api/v1/crm/pipeline` — status bucket counts
- `/admin/crm` pipeline board
- `/admin/crm/contacts/:id` contact detail page
- Remove login/register from primary nav; add to footer

### Out of scope
- Account provisioning (Sprint 38)
- Workflow actions (Sprint 39)

## Success Criteria
- `contacts` table present with correct lifecycle states
- All intake paths create/upsert contacts
- CRM pipeline board renders with correct counts
- Login/register visible only in footer
- 10 tests pass, build clean
