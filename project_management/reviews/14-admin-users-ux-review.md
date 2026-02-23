# UX Review — Admin Users

- Route: `/admin/users`
- Audience: Admins managing account status and privileges
- Overall score: 7.2/10

## Critical findings (severity-ranked)
- P1: Role/status mutations lack explicit confirmation and impact explanation.
  - Risk: Privilege mistakes (add/remove) or status mistakes (disable) with weak safety rails.
- P1: Action grouping is dense and high-risk controls are near routine controls.
  - Risk: Higher accidental role mutation probability.
- P2: Initial page appears inert until “Load users” is clicked.
  - Risk: Users misinterpret page as broken or empty.
- P2: Limited state visibility after mutation (what changed, by whom, when).
  - Risk: Reduced operator trust and auditability.

## Observed strengths
- Filtering model is practical and supports common admin search cases.
- Detail panel centralizes role and status operations.
- Role mutability constraints are encoded in UI logic.

## Key UX breakdowns
### 1) Destructive/privileged action safety
- No confirmation modals for status changes or role removals.
- No “last chance” summary describing downstream impact.

### 2) Discoverability and onboarding
- Manual load step breaks expectation for modern admin consoles.
- Role controls are functionally complete but visually noisy.

### 3) Feedback quality
- Problem details show failures but success lacks durable audit feedback.

## Recommendations
### Immediate (this sprint)
- Add confirmations for status and role changes with impact copy.
- Separate actions into grouped zones: status, role add, role remove.
- Auto-load first page by default; keep manual reload as secondary.
- Add structured success notices (“Removed ADMIN from user@example.com”).

### Near-term
- Add role-change timeline for selected user.
- Add permission preview before applying role changes.

## Acceptance criteria for UX hardening
- Privileged changes require deliberate confirmation.
- Users can understand state transitions without checking external logs.
- First-load discoverability improves (no dead-start feeling).
