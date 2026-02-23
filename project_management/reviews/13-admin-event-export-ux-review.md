# UX Review — Admin Event Export

- Route: `/admin/events/[slug]/export`
- Audience: Admins handling data extraction and compliance workflows
- Overall score: 7.7/10

## Critical findings (severity-ranked)
- P1: Governance constraints appear only after user interaction in some paths.
  - Risk: Users discover policy limits late, after configuring export.
- P2: Preview and download confirmation are useful but lack audit confidence markers.
  - Risk: Users cannot quickly prove “what was exported, when, and why.”
- P2: Include-email toggle is policy-sensitive but visually similar to low-risk options.
  - Risk: Privacy-sensitive actions under-signaled.

## Observed strengths
- Clear options and format choices.
- In-app preview helps validate output structure before downstream use.
- Problem details integration offers robust technical error representation.

## Key UX breakdowns
### 1) Trust and compliance confidence
- No explicit “this export contains personal data” warning state when include-email is enabled.
- No export receipt metadata (timestamp, actor, format, include-email flag).

### 2) Error prevention
- Governance constraints should be front-loaded before the user commits.
- No explicit size/latency expectation for large exports.

## Recommendations
### Immediate (this sprint)
- Add high-contrast compliance warning block when include-email is on.
- Add export receipt panel: file name, generated at, actor, privacy mode, row count.
- Pre-validate governance eligibility on page load and lock unsupported choices early.

### Near-term
- Add “copy command / replay export” affordance for repeatability.
- Add checksum/hash display for downstream integrity verification.
- Provide direct link to retention/export policy from the form.

## Acceptance criteria for UX hardening
- Users understand policy constraints before clicking export.
- Every export action leaves a clear, user-visible receipt.
- Privacy-sensitive exports are unmistakably distinguished.
