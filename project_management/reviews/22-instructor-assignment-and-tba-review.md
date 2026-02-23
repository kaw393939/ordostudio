# Missing Feature Review — Instructor Assignment and TBA Lifecycle

## Problem
Instructors are not modeled as a first-class assignment workflow, and `TBA` is not explicitly represented.

## What is missing
- Instructor entity and availability calendar
- Assignment state machine (`TBA`, `proposed`, `assigned`, `confirmed`, `reassigned`)
- Instructor capability matching (topic, level, language, mode)
- Participant-facing communication when instructor is still TBA
- Admin exception handling for reassignment

## UX implications
- Operational teams cannot plan staffing systematically.
- Customers receive inconsistent communication about who will deliver.
- Reassignments are opaque and trust-eroding.

## Required fundamentals
1. Instructor roster with skills, modes, and availability.
2. Session card with clear instructor state (`TBA` badge if unassigned).
3. Assignment workflow with ownership and deadlines.
4. Automatic comms on assignment/reassignment updates.

## Data model additions
- `instructors`: user_id/placeholder, profile, skills, active
- `instructor_availability`: instructor_id, time_window, mode
- `session_instructor_assignments`: session_id, instructor_id_nullable, status, assigned_by, assigned_at

## Acceptance criteria
- Every session shows clear instructor status.
- `TBA` is explicit and transitions are auditable.
- Reassignment can happen without breaking user confidence.
