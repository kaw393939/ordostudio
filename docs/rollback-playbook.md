# Rollback Playbook

This playbook focuses on low-friction rollback paths for modernization work.

## First-line rollback: feature flags

If a UI change causes regressions, disable the corresponding flag.

### Build-time flags (require redeploy)

Set these at build time:
- `NEXT_PUBLIC_FF_CALENDAR_GRID=false`
- `NEXT_PUBLIC_FF_DARK_MODE_TOGGLE=false`
- `NEXT_PUBLIC_FF_UNDO_DELETE=false`

Rebuild and redeploy.

### Runtime overrides (no redeploy, if enabled)

If runtime overrides are configured, update the runtime flags config (see docs/feature-flags.md).
- Disable the flag key(s)
- Verify the change is reflected at `/api/v1/feature-flags`
- Re-verify the affected UI route(s)

## Second-line rollback: Git revert

If flags are insufficient (or the issue is outside the flagged area):
- Revert the modernization merge commit (or the specific offending commit range)
- Rebuild and redeploy

## Database rollback

No schema changes are expected in this program. Rollback should be code-only.

## Post-rollback verification

- Smoke: `npm run test` and `npm run build`
- UI: verify key routes `/`, `/events`, `/login`, `/admin`
- Observability: check error rates and user-reported issues for 48 hours
