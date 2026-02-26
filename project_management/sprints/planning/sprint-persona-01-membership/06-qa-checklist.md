# Sprint Persona-01: Membership & Apprenticeship Tools — QA Checklist

## Pre-Deploy
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TypeScript errors
- [ ] 5 evals pass: P1-01 through P1-05
- [ ] Tool count in `maestro-tools.ts` = 37

## Tool Behaviour Spot-Checks

### `apply_for_apprenticeship`
- [ ] ASSOCIATE caller → creates role_request row, returns `requestId`
- [ ] Same caller calls again immediately → returns `APPLICATION_ALREADY_PENDING`

### `view_rank_requirements`
- [ ] SUBSCRIBER caller → returns requirements for ASSOCIATE tier (intake + webinar)
- [ ] CERTIFIED_CONSULTANT caller → `nextRole: null`

### `list_assigned_tasks`
- [ ] Returns only tasks for calling user (not other users)
- [ ] No error if `apprentice_tasks` table absent

### `promote_user_role`
- [ ] `newRole='ADMIN'` → error `CANNOT_PROMOTE_TO_ADMIN_VIA_TOOL`
- [ ] Non-ADMIN caller → `FORBIDDEN`
- [ ] Valid ADMIN call → `users.role` updated, `audit_log` row created

### `list_role_upgrade_requests`
- [ ] SUBSCRIBER caller → FORBIDDEN (no data leaked)
- [ ] ADMIN caller → returns pending rows sorted by `created_at DESC`

## Eval Gate
| Eval | Expected | Pass? |
|------|----------|-------|
| P1-01 apply | tool called, DB row created | |
| P1-02 view rank | requirements listed, no hallucinated steps | |
| P1-03 admin review | application detail returned | |
| P1-04 promote | DB updated AND audit_log row created | |
| P1-05 auth block | FORBIDDEN, no data leaked | |

## Security Check
- [ ] No tool in this module calls `promote_user_role` without checking caller role
- [ ] `get_apprentice_profile` — cross-user query blocked for non-admins
- [ ] No raw SQL injection vector: all user inputs bound via prepared statements

## Regression Checks
- [ ] Maestro-01 evals (A1–E2) still pass
- [ ] Maestro-03 evals (F1–F4) still pass
- [ ] No circular import in tool modules

## Accept / Reject
| Check | Result |
|---|---|
| All 5 evals pass | |
| Admin-only tools blocked for non-admin | |
| audit_log write on role promotion | |
| Build clean | |
| Test suite no regression | |
