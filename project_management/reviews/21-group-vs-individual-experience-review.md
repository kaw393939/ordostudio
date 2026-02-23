# Missing Feature Review — Group vs Individual Experience

## Problem
Current flows treat all participation as event attendance, not distinct service experiences.

## What is missing
- Explicit engagement type (`individual`, `group`)
- Group roster management (seat allocation, invites, replacements)
- Individual plan personalization (goals, milestones, follow-up cadence)
- Different UX copy and CTAs based on engagement type

## UX implications
- Individual clients see irrelevant group-style framing.
- Group buyers lack controls they need (participant administration).
- Support burden increases due to mismatched expectations.

## Required fundamentals
1. Two primary booking paths: `Book 1:1` and `Book for team/group`.
2. Group roster admin UI (invite, remove, replace, attendance visibility).
3. Individual dashboard focused on progress/outcomes.
4. Group dashboard focused on logistics/participant readiness.

## Data model additions
- `engagements`: type, client_id, owner_id, service_offering_id
- `engagement_participants`: engagement_id, participant_id/email, role, status
- `participant_substitutions`: engagement_id, from_participant, to_participant, reason

## Acceptance criteria
- Users can self-select the correct path quickly.
- Group organizers can manage participants without staff intervention.
- Individual clients see personal goals and outcomes clearly.
