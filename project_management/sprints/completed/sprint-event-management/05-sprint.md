# Sprint Event-Management — Sprint Tasks

---

## T1 — Implement `create_event` and `update_event`

**File:** `src/lib/api/maestro-tools.ts`

Implement both write tools per `03-tool-specs.md`. Each must:
- Check ADMIN/STAFF auth
- Wrap DB writes in `db.transaction()`
- Call `writeFeedEvent()`

Run: `npm run evals:events` after T1 — EM-01 and EM-02 should pass.

---

## T2 — Implement `get_event_attendance` and `list_registered_attendees`

Pure read tools. No auth guard needed for operator agent (route-level auth already enforces
ADMIN/STAFF access to the Maestro route).

Run: EM-03 and EM-04 should pass.

---

## T3 — Final gate

```
npm run build     # clean
npm run test      # no regressions
npm run evals     # full suite passes
```
