# Sprint Persona-01: Membership & Apprenticeship Tools — Sprint Plan

## Prerequisites
- [ ] Maestro-00b merged (roles 044 applied to DB)
- [ ] `role_requests` table confirmed present
- [ ] `users.role` enum includes ASSOCIATE, APPRENTICE, CERTIFIED_CONSULTANT

## Tasks

### T1 — Implement 8 tools in `maestro-persona-membership.ts` (3 h)
- [ ] `apply_for_apprenticeship` with duplicate-pending guard
- [ ] `view_rank_requirements` with static RANK_REQUIREMENTS map
- [ ] `list_assigned_tasks` with graceful table-absent fallback
- [ ] `get_apprentice_profile` with self-vs-other auth check
- [ ] `review_apprentice_application` (ADMIN/STAFF check)
- [ ] `promote_user_role` in transaction with audit_log write
- [ ] `review_gate_submission` with graceful table-absent fallback
- [ ] `list_role_upgrade_requests` (ADMIN/STAFF check)

### T2 — Register in `maestro-tools.ts` (20 min)
- [ ] Import all 8 tools + schemas
- [ ] Assert total tool count = 37

### T3 — Seed fixture + eval file (1.5 h)
- [ ] `membership-seeds.ts` (4 users, 2 role_requests)
- [ ] `persona-membership.eval.ts` (P1-01 through P1-05)
- [ ] Run locally: `npm run evals -- --file persona-membership`

### T4 — Unit tests (1 h)
- [ ] `promote_user_role` with ADMIN caller → DB updated
- [ ] `promote_user_role` with non-ADMIN caller → FORBIDDEN error
- [ ] `apply_for_apprenticeship` when pending request exists → APPLICATION_ALREADY_PENDING
- [ ] `promote_user_role` with `newRole='ADMIN'` → CANNOT_PROMOTE_TO_ADMIN error

### T5 — Full test suite + build
- [ ] `npm test` — 1714+ pass
- [ ] `npm run build` — no TSC errors

### T6 — Commit
```bash
git add src/lib/agent/tools/maestro-persona-membership.ts \
        src/lib/agent/maestro-tools.ts \
        src/evals/persona-membership.eval.ts \
        src/evals/fixtures/membership-seeds.ts
git commit -m "feat(agent): add membership/apprenticeship persona tools (8 tools, 5 evals)"
```

## Definition of Done
- [ ] 8 tools callable and returning typed responses
- [ ] P1-01 through P1-05 all pass
- [ ] P1-05 confirms unauthorized user cannot access admin-only data
- [ ] P1-04 confirms audit_log row created on promotion
- [ ] `promote_user_role(newRole='ADMIN')` returns error, not success
- [ ] `npm test` 1714+/1715, build clean
