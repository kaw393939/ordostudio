# Sprint Maestro-01: QA Checklist

## Pre-flight
- [ ] `npm run build` — clean (no TS errors)
- [ ] `npm test -- --reporter=dot` — 1548+ passing, 0 new failures

## Eval harness
- [ ] `npm run evals:maestro` — 14/14 PASS
- [ ] `npm run evals` — 27/27 PASS (13 existing + 14 new)
- [ ] `eval-results/latest.json` written correctly

## Auth / Security
- [ ] `curl -X POST /api/v1/agent/maestro` with no cookie → 401
- [ ] Request with non-staff session cookie → 403
- [ ] Request with ADMIN session cookie → 200

## Tool correctness (spot-check via eval JSON)
- [ ] `update_intake_status` — DB row updated, status_history entry written
- [ ] `approve_role_request` — role assignment written, `RoleApproved` feed event in DB
- [ ] `trigger_test_workflow` — synthetic feed event has `source='EVAL'` in metadata
- [ ] `toggle_workflow_rule` — `enabled` column flipped
- [ ] `cancel_availability_slot` with BOOKED slot → error response (not thrown)

## System prompt adherence (manual review of eval transcripts)
- [ ] Agent never fabricates data when DB is empty
- [ ] Agent synthesizes funnel numbers rather than listing raw JSON
- [ ] Agent asks for confirmation before irreversible-sounding changes

## Regression
- [ ] Existing intake agent scenarios still pass: `npm run evals:intake` 5/5
- [ ] Workflow + triage evals still pass: `npm run evals:workflow && npm run evals:triage`
