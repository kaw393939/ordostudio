# Sprint 38 — Admin Operations UX

## Goal
Make admin operations fast, low-friction, and governance-clear under real workload.

## Scope
- Upgrade admin registrations with high-signal filters/search.
- Add check-in mode optimized for rapid repetitive actions.
- Add safe bulk actions where API affordances allow.
- Improve export UX with include-email governance explanation and output preview.

## TDD Process
1. Write failing tests for admin registration filtering and search behaviors.
2. Write failing tests for check-in mode speed-path interactions.
3. Write failing tests for supported bulk actions and safeguards.
4. Write failing tests for export governance messaging and blocked/allowed paths.
5. Implement/refactor with tests green.

## Stories
- As an admin, I can check in attendees quickly with minimal clicks.
- As an admin, I understand export rules and outcomes before downloading data.

## Acceptance Criteria
- Check-in flow supports high-throughput operation with immediate feedback.
- Export surface clearly explains include-email governance constraints.
- Restricted actions provide explicit “what to do next” guidance.

## End-of-Sprint Verification
```bash
npm run test -- admin-checkin admin-export
npm run lint
npm run build
```
Manual checks:
- Run check-in simulation for representative high-volume event.
- Validate export governance behaviors for local vs non-local context.

Pass condition:
- Sprint 38 tests pass.
- Throughput and governance clarity acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Admin registrations operations UX upgrade (high-signal search/filter, check-in mode, bulk actions, explicit guidance):
	- `src/app/(admin)/admin/events/[slug]/registrations/page.tsx`
- Admin export UX governance clarity and output preview:
	- `src/app/(admin)/admin/events/[slug]/export/page.tsx`
- Shared admin operations helper module:
	- `src/lib/admin-operations-ui.ts`
	- `src/lib/__tests__/admin-operations-ui.test.ts`

Verification executed:
```bash
npm test -- src/lib/__tests__/admin-operations-ui.test.ts src/app/__tests__/e2e-admin-operations-security.test.ts
npm run lint
npm run build
```

Verification outcome:
- Admin operations helper and security/operations tests passed.
- Lint passed with pre-existing unrelated warnings only.
- Production build passed.
