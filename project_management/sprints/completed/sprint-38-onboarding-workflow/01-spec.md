# Sprint 38: Onboarding Workflow — Specification

## Overview
Automates the path from staff approval → user account creation → guided onboarding sequence. Contacts who complete all required tasks advance to ACTIVE.

## Scope

### In scope
- Migration 039: `onboarding_tasks` (seeded), `onboarding_progress`
- `provisionAccount(contactId)` function: creates user, progress rows, sends welcome email, fires feed event
- `POST /api/v1/crm/contacts/:id/provision` — staff-only, idempotent
- `GET /api/v1/onboarding` — returns task list for authenticated user
- `POST /api/v1/onboarding/complete/:slug` — marks task complete
- Dashboard onboarding checklist widget
- Welcome email with temp password

### Out of scope
- Workflow engine routing (Sprint 39)
- Force-password-change on first login (can be a follow-up)

## Success Criteria
- Provision flow creates user, progress rows, fires feed event
- Dashboard widget renders for incomplete users
- Task completion advances contact to ACTIVE when all required done
- 10 tests pass, build clean
