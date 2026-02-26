# Maestro-01: Ops Agent (v2) — Specification

**Sprint:** `sprint-maestro-01-ops-agent`

---

## Scope

### In scope

- `src/lib/api/maestro-tools.ts` — 25 tools + Zod validation + executor
- `src/lib/api/maestro-system-prompt.ts` — operator system prompt
- `src/app/api/v1/agent/maestro/route.ts` — auth-gated route (ADMIN/STAFF/SUPER_ADMIN)
- `src/evals/scenarios/maestro.ts` — 18 eval scenarios (A1–E2 + bonus)
- `feed_events` writer expansion (5 business events)
- Commission rate bug fix (`0.25 → 0.04` in referral API)

### Out of scope

- Admin chat UI (Maestro-02)
- `get_ops_brief` combined tool (Maestro-03)
- Any new DB tables
- Email or webhook integrations from the agent
- Persona-specific tools (APPRENTICE, AFFILIATE) — those are P-01 + P-02

---

## Success Criteria

| Check | Pass condition |
|-------|---------------|
| Route auth | `POST /api/v1/agent/maestro` without session → 401 |
| Route auth | With USER role → 403 |
| Route auth | With ADMIN role → 200 streaming response |
| All 25 tools defined | `MAESTRO_TOOLS.length === 25` in unit test |
| Tool validation | Each tool rejects invalid args and returns `{ error }` — no throw |
| Write tools transactional | Each DB write tool wrapped in `db.transaction()` |
| Feed events | `writeFeedEvent()` called in all 5 expanded locations |
| Commission fix | `GET /api/v1/account/referral` returns `commission_rate: 0.04` |
| Evals | `npm run evals:maestro` → 18/18 PASS |
| Full eval suite | `npm run evals` → 35/35 PASS |
| Unit tests | ≥ 1740 passing |
| Build | `npm run build` clean |
