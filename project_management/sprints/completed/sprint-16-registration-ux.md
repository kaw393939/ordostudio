# Sprint 16 — Registration UX

## Goal
Deliver event registration UX preserving domain transitions: REGISTERED, WAITLISTED, CANCELLED, and CHECKED_IN visibility.

## Scope
- Add registration action on event detail.
- Show current registration status badges and transitions.
- Implement cancel action as state transition (no hard delete semantics in UI).
- Provide clear user feedback for waitlist outcomes.

## TDD Process
1. Write failing tests for register/cancel interaction flows.
2. Write failing tests for WAITLISTED behavior when capacity is full.
3. Write failing tests for status rendering and action availability.
4. Implement/refactor with green tests.

## Stories
- As a user, I can register for an event and see if I am waitlisted.
- As a user, I can cancel and see cancelled state reflected.

## Acceptance Criteria
- Register action reflects REGISTERED or WAITLISTED response.
- Cancel action transitions status to CANCELLED in UI state.
- UI state aligns with API status transitions.
- Problem responses are rendered consistently.

## End-of-Sprint Verification
```bash
npm run test -- registration-ui
npm run lint
npm run build
```
Manual checks:
- Register on available event.
- Register on full event and verify WAITLISTED.
- Cancel and verify CANCELLED status.

Pass condition:
- All Sprint 16 tests pass.
- Transition semantics verified against API behavior.

## Exit Gate
Move sprint only when acceptance criteria and verification pass.
