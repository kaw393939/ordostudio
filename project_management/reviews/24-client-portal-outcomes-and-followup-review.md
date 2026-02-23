# Missing Feature Review — Client Portal, Outcomes, and Follow-Up

## Problem
Current account experience is registration-centric, not engagement-outcome-centric.

## What is missing
- Engagement timeline (scheduled sessions, completed sessions, next steps)
- Session notes/outcomes and action items
- Shared artifacts (slides, recordings, worksheets)
- Follow-up plans and progress checkpoints
- Feedback capture (session rating, NPS, testimonial opt-in)

## UX implications
- Clients cannot clearly see value delivered over time.
- Teams cannot demonstrate outcomes for renewals/upsell.
- Post-session continuity depends on manual email threads.

## Required fundamentals
1. `My engagements` view with current status and upcoming milestones.
2. Session-level outcomes and action-item tracker.
3. Secure resource center per engagement.
4. Structured follow-up workflow with reminders.

## Data model additions
- `engagement_outcomes`: engagement_id, summary, metrics, updated_at
- `session_notes`: session_id, author_id, visibility, content
- `session_artifacts`: session_id, type, url, access_scope
- `feedback_entries`: engagement_id/session_id, rating, comment, submitted_at

## Acceptance criteria
- Clients can answer: what happened, what’s next, what value did we get?
- Teams can track completion and outcome quality without external tools.
- Renewal conversations are supported by in-product evidence.
