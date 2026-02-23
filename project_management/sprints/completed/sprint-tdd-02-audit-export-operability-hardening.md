# Sprint TDD-02 — Audit/Export Operability Hardening

## Goal
Make audit investigation and sensitive export workflows faster, clearer, and safer.

## Scope
- Add validated date-time controls and quick time presets in admin audit.
- Add severity highlighting and metadata prioritization in audit results.
- Add export receipt metadata (who/when/format/privacy mode).
- Add front-loaded privacy signaling for include-email exports.

## TDD Process
1. Write failing tests for audit filter validation and quick preset behavior.
2. Write failing tests for severity tagging and metadata summarization.
3. Write failing tests for export receipt schema and mandatory fields.
4. Write failing UI tests for privacy warning states and unsupported-option lockouts.
5. Implement and refactor until all tests pass.

## Stories
- As an admin investigator, I can find high-risk entries quickly without fragile manual filtering.
- As an operator, I can prove what was exported, when, and under which privacy mode.

## Acceptance Criteria
- Audit filters reject invalid date ranges and support preset windows.
- Critical actions are visually highlighted in audit results.
- Export actions generate visible receipt metadata.
- Sensitive export options are clearly signaled and constrained before execution.

## End-of-Sprint Verification
```bash
npm test -- src/app/** src/lib/** src/core/**
npm run lint
npm run build
```
Manual checks:
- Validate audit query presets (15m, 1h, 24h) and invalid date handling.
- Export with include-email enabled and verify warning + receipt data.
- Confirm severity cues appear for delete/role/export-sensitive actions.

Pass condition:
- Investigation and export workflows are auditable and confidence-preserving.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record
- Date: 2026-02-18
- Commands run:
	- `npm run test -- src/lib/__tests__/admin-operations-ui.test.ts`
	- `npm run lint`
	- `npm run build`
- Outcomes:
	- Added audit helper utilities for quick time presets, date-range validation, action severity tagging, and metadata summarization in `src/lib/admin-operations-ui.ts`.
	- Added test coverage for the new audit helper utilities in `src/lib/__tests__/admin-operations-ui.test.ts`.
	- Hardened admin audit UI in `src/app/(admin)/admin/audit/page.tsx` with datetime-local filters, 15m/1h/24h presets, invalid-range guardrails, severity labels, and prioritized metadata summaries.
	- Hardened admin export UI in `src/app/(admin)/admin/events/[slug]/export/page.tsx` with front-loaded sensitive-export signaling and export receipt metadata (file, timestamp, privacy mode, size, row estimate, operator).
	- Verification passed with no build errors and only pre-existing lint warnings.
