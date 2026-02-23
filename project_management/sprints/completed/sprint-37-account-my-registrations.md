# Sprint 37 — Account: My Registrations

## Goal
Give users a reliable account home for attendance confidence and self-service updates.

## Scope
- Expand `/account` with “My registrations” list (upcoming first).
- Show status chips and links back to event detail pages.
- Allow cancellation from account when affordances allow.
- Standardize confirmation UX across account and event detail entry points.

## TDD Process
1. Write failing tests for account registrations list rendering and ordering.
2. Write failing tests for status chip and event-link behaviors.
3. Write failing tests for cancellation from account with affordance guards.
4. Write failing tests for consistent success feedback patterns.
5. Implement/refactor with tests green.

## Stories
- As a user, I can verify my attendance status without searching events again.
- As a user, I get the same clear confirmation whether I act from account or event detail.

## Acceptance Criteria
- Account page shows current registration states clearly with event navigation.
- Canceling from account works when allowed and updates view state immediately.
- Confirmation experience is consistent across all registration/cancel entry points.

## End-of-Sprint Verification
```bash
npm run test -- account-registrations
npm run lint
npm run build
```
Manual checks:
- Register/cancel from event detail and account; verify UX parity.
- Validate logged-out and expired-session behavior in account flows.

Pass condition:
- Sprint 37 tests pass.
- Account confidence and parity acceptance criteria are validated.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.

## Completion Record (2026-02-17)

Status:
- Completed.

Implemented artifacts:
- Account registrations API enhancements (upcoming-first ordering + affordance links):
	- `src/app/api/v1/account/registrations/route.ts`
	- `src/core/infrastructure/sqlite/read-repositories.ts`
	- `src/lib/api/registrations.ts`
- Account page UX upgrade (status chips, event navigation links, affordance-guarded cancel action, immediate in-page update):
	- `src/app/(public)/account/page.tsx`
- Confirmation UX parity helper for account + event detail:
	- `src/lib/registration-feedback.ts`
	- `src/lib/__tests__/registration-feedback.test.ts`
	- `src/app/(public)/events/[slug]/page.tsx`
- Sprint 37 behavior tests:
	- `src/app/__tests__/e2e-account-registrations.test.ts`

Verification executed:
```bash
npm test -- src/app/__tests__/e2e-account-registrations.test.ts src/lib/__tests__/registration-feedback.test.ts src/lib/__tests__/event-detail-action.test.ts
npm run lint
npm run build
```

Verification outcome:
- Account registration UX and affordance behavior tests passed.
- Lint passed with pre-existing unrelated warnings only.
- Production build passed.
