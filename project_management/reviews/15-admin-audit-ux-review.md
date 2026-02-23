# UX Review — Admin Audit

- Route: `/admin/audit`
- Audience: Admins investigating incidents and compliance trails
- Overall score: 7.0/10

## Critical findings (severity-ranked)
- P1: Filter inputs rely on raw ISO text, prone to formatting errors.
  - Risk: Missed records during incident response.
- P2: Result table is readable but lacks triage acceleration tools.
  - Risk: Slow investigations and high cognitive load.
- P2: Metadata blobs are verbose with no field-level prioritization.
  - Risk: Important context buried in JSON noise.

## Observed strengths
- Good baseline filter dimensions (action, actor, from, to).
- Large-table pattern supports broad audit retrieval.
- Problem-details handling is consistent with rest of app.

## Key UX breakdowns
### 1) Investigation speed
- No quick presets (last 15m, 1h, 24h).
- No row expansion model; all metadata appears equally weighted.

### 2) Comprehension
- No highlights for risky actions (delete, role mutation, export with email).
- No grouping or clustering by request_id/session context.

### 3) Operability
- No export/copy workflow for selected findings.
- No persistent saved filter sets.

## Recommendations
### Immediate (this sprint)
- Replace raw date text fields with date-time controls and validation hints.
- Add quick time-range presets and default to recent window.
- Add severity highlighting for critical action types.
- Collapse metadata by default with “important fields first” summary.

### Near-term
- Add grouping by request_id and actor.
- Add CSV/JSON export for current filter result set.
- Add saved investigations (named filter presets).

## Acceptance criteria for UX hardening
- Investigators can isolate high-risk events within minutes.
- Date/time filtering errors are substantially reduced.
- High-impact actions are visually obvious in result scans.
