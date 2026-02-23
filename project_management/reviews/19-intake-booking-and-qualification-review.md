# Missing Feature Review — Intake, Booking, and Qualification

## Problem
There is no lead-to-booking journey; only event registration exists.

## What is missing
- Inquiry capture (`individual` vs `organization`)
- Qualification questions (goals, timeline, skill level, budget range)
- Scheduling request windows and timezone-aware availability
- Routing logic (auto-approve, review required, waitlist)
- CRM-lite status pipeline (`new`, `qualified`, `proposal_sent`, `booked`, `lost`)

## UX implications
- Prospects are forced into attendance flows that do not fit consulting sales.
- Sales/admin teams lose context from first touch to confirmed engagement.
- Follow-up quality and speed degrade, reducing close rate.

## Required fundamentals
1. Public `Request consulting/training` form with adaptive fields.
2. Admin intake queue with triage actions and SLA markers.
3. Conversion flow to engagement/session records.
4. Clear customer status communication and next-step timeline.

## Data model additions
- `booking_requests`: requester, org, audience_type, desired_mode, goals, constraints, status
- `booking_notes`: request_id, author_id, note, created_at
- `booking_status_history`: request_id, from_status, to_status, actor_id, timestamp

## Acceptance criteria
- Every inquiry is trackable from submission to outcome.
- Admin can prioritize and assign requests without external spreadsheets.
- User receives clear status and next action at each stage.
