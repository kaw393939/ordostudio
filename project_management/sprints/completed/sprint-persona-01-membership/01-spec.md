# Sprint Persona-01: Membership & Apprenticeship Tools — Spec

## Objective
Implement 6 tools covering the full apprenticeship lifecycle: user-facing
(apply, view requirements, track progress) and operator-facing (review, promote,
manage gate submissions).

## Acceptance Criteria

### AC-1  `apply_for_apprenticeship`
- [ ] Creates a `role_requests` row with `requested_role='APPRENTICE'`, `status='pending'`,
  `user_id=caller`
- [ ] Enforces: user must not already have an active request (`status='pending'`)
- [ ] Returns `{ requestId, status: 'pending', message }`

### AC-2  `view_rank_requirements`
- [ ] Returns the requirements to progress from caller's current role to the next
- [ ] Reads from a static `RANK_REQUIREMENTS` map (code-level, no DB table needed)
- [ ] Roles: SUBSCRIBER → ASSOCIATE → APPRENTICE → CERTIFIED_CONSULTANT → ADMIN

### AC-3  `list_assigned_tasks`
- [ ] Returns tasks assigned to the caller from `apprentice_tasks` table
  (if table exists; graceful empty if not)
- [ ] Filters by `status` param: `'all' | 'pending' | 'completed'`

### AC-4  `get_apprentice_profile`
- [ ] Returns public profile of an apprentice: `user_id`, `role`, `joined_at`,
  `tasks_completed_n`, `gate_submissions_n`
- [ ] ADMIN/STAFF only when querying another user; users can only query themselves

### AC-5  `review_apprentice_application`
- [ ] ADMIN/STAFF only
- [ ] Returns full application detail for a `role_requests` row including notes array
- [ ] Accepts `requestId`

### AC-6  `promote_user_role`
- [ ] ADMIN/STAFF only — enforced at tool level, not just route level
- [ ] Accepts `userId`, `newRole` (enum of all valid roles)
- [ ] Updates `users.role` in a transaction; logs to `audit_log`
- [ ] Returns `{ userId, oldRole, newRole, promotedAt }`

### AC-7  `review_gate_submission`
- [ ] ADMIN/STAFF only
- [ ] Reviews a gate submission from `gate_submissions` table (graceful if absent)
- [ ] Accepts `submissionId`; returns submission content + reviewer notes

### AC-8  `list_role_upgrade_requests`
- [ ] ADMIN/STAFF only
- [ ] Lists pending `role_requests` with `status='pending'`
- [ ] Supports `status` filter: `'pending' | 'approved' | 'rejected' | 'all'`

## New Files
```
src/lib/agent/tools/maestro-persona-membership.ts
src/evals/fixtures/membership-seeds.ts
src/evals/persona-membership.eval.ts
```

## Modified Files
```
src/lib/agent/maestro-tools.ts    ← register 8 new tools
```

## Non-Goals
- No new DB migrations (tools use existing tables; graceful fallback if absent)
- No email notifications on role change
- No UI widgets
