# Sprint 59 — Apprentice Profiles + Public Directory (Approved Contractors)

## Goal
Create a public-facing directory of approved Studio Ordo apprentices (independent contractors), with profile pages that support trust, referrals, and matching.

## Scope

### Data model
- Create `apprentice_profiles` table keyed by `user_id`.
- Fields (MVP):
  - `user_id` (FK)
  - `handle`
  - `display_name`
  - `headline`
  - `bio`
  - `location`
  - `website_url`
  - `tags`
  - `status`: `PENDING` | `APPROVED` | `SUSPENDED`
  - audit timestamps

### Public UI
- Public directory page: `/apprentices` (approved only)
- Public profile page: `/apprentices/[handle]` with disclosure + website link

### Admin UI
- Admin approval console: `/admin/apprentices`
  - list by status
  - approve/suspend with confirmation
  - audit entries for mutations

## Acceptance Criteria
- [x] Apprentice profile model exists with approval status.
- [x] Public directory shows only approved apprentices.
- [x] Admin can approve/suspend profiles.
- [x] Mutations are auditable.
- [x] Tests cover: approval gate and public-only-approved behavior.
- [x] Lint/tests/build pass.
