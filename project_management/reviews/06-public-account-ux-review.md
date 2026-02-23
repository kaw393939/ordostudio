# UX Review — Account (Deep-Dive)

- Route: `/account`
- Audience: Authenticated users
- Overall score: 6.4/10

## Critical findings (severity-ranked)
- P0: Account deletion executes without explicit confirmation.
	- Current behavior: One click can destroy account state and clear user context.
	- UX breach: irreversible action without confirmation/summary/typed intent.
- P1: Destructive action is visually adjacent to routine actions.
	- Risk: accidental activation during normal account management.
- P2: Registration history lacks sort/filter controls for longer histories.
	- Risk: poor findability and higher cognitive load.
- P2: Success/error feedback is transient and not always durable enough.

## What works
- Profile + registration history are consolidated in one useful page.
- Unauthorized state has clear recovery path to `/login`.
- Registration rows provide practical next actions (`View event`, conditional cancel).
- Time context formatting lowers scheduling ambiguity.

## Detailed breakdown
### 1) Safety and trust
- The delete pathway currently behaves like a regular button action.
- There is no consequence preview (retention, recoverability, session effects).
- There is no friction mechanism (confirm modal, typed confirmation, second-step CTA).

### 2) Information architecture
- Primary account tasks and destructive account tasks share insufficient separation.
- “Roles/Status” fields expose system language that is low-value for normal users.

### 3) Feedback and resilience
- Cancellation/deletion confirmations are brief and easy to miss.
- No durable operation log or recent actions summary.

## Recommendations
### Immediate (must ship first)
- Add a two-step delete confirmation flow:
	1) Danger modal with explicit consequences.
	2) Typed confirmation (`DELETE`) before final submit.
- Relocate delete controls to an isolated danger zone with stronger visual contrast.
- Add persistent success/error banner for destructive operations (dismissible, not auto-hide).

### Near-term
- Add registration sorting/filtering (upcoming, past, canceled, checked-in).
- Replace system-centric copy with user-centric explanations.
- Add inline “what happens after deletion” FAQ snippet.

## Acceptance criteria for UX hardening
- It is impossible to delete an account accidentally via single-click.
- Users can clearly understand deletion consequences before confirming.
- Registrations are easy to scan and manage at scale.
